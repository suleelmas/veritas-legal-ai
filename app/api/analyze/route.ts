import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getUserKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const ua = req.headers.get("user-agent") || "";
  return `${ip}_${ua}`;
}

async function getRelevantDocuments(pdfText: string, targetLang: string = 'TR', limit: number = 5) {
  try {
    // PDF metninden embedding oluştur
    const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: pdfText.substring(0, 8000),
        model: 'text-embedding-3-small'
      })
    });
    const embeddingData = await embeddingResp.json();
    if (!embeddingResp.ok || !embeddingData.data) return [];
    const queryEmbedding = embeddingData.data[0].embedding;

    // Supabase'de benzer belgeleri bul
    // Önce RPC fonksiyonunu dene, yoksa direkt sorgu yap
    try {
      const { data: documents } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit
      });
      if (documents) {
        // Eğer İngilizce analiz yapılıyorsa Congress.gov, SCOTUS, CourtListener ve OpenJurist'i de dahil et
        if (targetLang === 'EN' || targetLang === 'English') {
          return documents;
        }
        // Türkçe analizlerde ABD kaynaklarını filtrele
        return documents.filter((doc: any) => 
          doc.metadata?.source !== 'congress' && 
          doc.metadata?.source !== 'scotus' &&
          doc.metadata?.source !== 'courtlistener' &&
          doc.metadata?.source !== 'openjurist'
        );
      }
    } catch (rpcError) {
      console.log('RPC function not found, using direct query');
    }

    // Alternatif: İlgili belgeleri kaynak türüne göre al
    // Türkçe analizler için: Resmi gazete, Yargıtay, Danıştay, Anayasa Mahkemesi ve KVKK
    // İngilizce analizler için: Congress.gov, SCOTUS, CourtListener ve OpenJurist de dahil
    const sources = ['resmigazete', 'yargitay', 'danistay', 'anayasa', 'kvkk'];
    if (targetLang === 'EN' || targetLang === 'English') {
      sources.push('congress', 'scotus', 'courtlistener', 'openjurist');
    }
    
    const { data: recentDocs } = await supabase
      .from('documents')
      .select('content, metadata')
      .in('metadata->>source', sources)
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Daha fazla sonuç al, sonra filtrele

    // Embedding benzerliğine göre sırala (basit yaklaşım)
    // Gerçek implementasyonda cosine similarity hesaplanmalı
    return recentDocs || [];
  } catch (err) {
    console.error('Document search error:', err);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { pdfText, targetLang } = await req.json();
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ reply: "API Key eksik!" }, { status: 500 });
    }
    const userKey = getUserKey(req);
    
    // İlgili belgeleri bul (Resmi Gazete, Yargıtay kararları vb.)
    // İngilizce analizlerde Congress.gov da dahil edilir
    const relevantDocs = await getRelevantDocuments(pdfText, targetLang);
    let contextText = '';
    if (relevantDocs.length > 0) {
      const langPrefix = (targetLang === 'EN' || targetLang === 'English') 
        ? 'Relevant Current Legislation and Decisions:' 
        : 'İlgili Güncel Mevzuat ve Kararlar:';
      contextText = `\n\n${langPrefix}\n`;
      relevantDocs.forEach((doc: any, idx: number) => {
        const source = doc.metadata?.source || 'bilinmeyen';
        contextText += `${idx + 1}. [${source}] ${doc.content.substring(0, 500)}...\n`;
      });
    }

    // 1. KREDİ KONTROLÜ
    const { data: creditRow } = await supabase
      .from("user_credits")
      .select("credit")
      .eq("user_key", userKey)
      .maybeSingle();
    // 2. İlk ücretsiz hakkı kontrolü
    const { data: usedDisks } = await supabase
      .from("user_analysis_rights")
      .select("id")
      .eq("user_key", userKey)
      .maybeSingle();
    
    // İngilizce analizlerde Congress.gov, SCOTUS, CourtListener ve OpenJurist'i de dahil et
    const sourcesText = (targetLang === 'EN' || targetLang === 'English')
      ? 'Yukarıdaki güncel mevzuat, resmi gazete yayınları, Yargıtay içtihatları, Danıştay kararları, Anayasa Mahkemesi kararları, KVKK kararları, ABD Federal Mevzuatı (Congress.gov), ABD Yüksek Mahkemesi (SCOTUS) kararları, CourtListener ve OpenJurist emsal karar depolarını dikkate alarak analiz yap.'
      : 'Yukarıdaki güncel mevzuat, resmi gazete yayınları, Yargıtay içtihatları, Danıştay kararları, Anayasa Mahkemesi kararları ve KVKK kararlarını dikkate alarak analiz yap.';
    
    const userPromptText = (targetLang === 'EN' || targetLang === 'English')
      ? `Analyze the following text and evaluate it according to current legislation, official gazette publications, Supreme Court precedents, Council of State decisions, Constitutional Court decisions, KVKK (Personal Data Protection Law) decisions, US Federal Legislation (Congress.gov), US Supreme Court (SCOTUS) decisions, CourtListener, and OpenJurist case law databases: ${pdfText.substring(0, 12000)}`
      : `Şu metni analiz et ve güncel mevzuat, resmi gazete yayınları, Yargıtay içtihatları, Danıştay kararları, Anayasa Mahkemesi kararları ve KVKK (Kişisel Verilerin Korunması Kanunu) kararlarına göre değerlendir: ${pdfText.substring(0, 12000)}`;
    
    // Yerelleştirme talimatı ekle
    const localizationInstruction = (targetLang === 'EN' || targetLang === 'English')
      ? ' IMPORTANT: If the output language is English, translate Turkish legal acronyms to their international equivalents. For example: KVKK -> GDPR (Personal Data Protection Law) or KVKK - Personal Data Protection Law, TBK -> TCO (Turkish Code of Obligations), HMK -> Code of Civil Procedure, İİK -> EBL (Enforcement and Bankruptcy Law), AYM -> Constitutional Court. Always provide the full English name alongside the acronym when first mentioned.'
      : '';
    
    const systemPrompt = `Sen profesyonel bir hukuk analistisin. Analizini sadece ${targetLang} dilinde yap. Paragrafları tekrar etme.${contextText ? ' ' + sourcesText : ''}${localizationInstruction}`;
    const userPrompt = userPromptText;

    if (creditRow && creditRow.credit > 0) {
      // Kredisi olanlar için analiz
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      });
      // Kredi bir azaltılır
      await supabase.from("user_credits")
        .update({ credit: creditRow.credit - 1 })
        .eq("user_key", userKey);
      return NextResponse.json({ reply: response.choices[0].message.content });
    } else if (!usedDisks) {
      // İlk analiz ücretsiz,
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      });
      await supabase.from("user_analysis_rights").insert({ user_key: userKey });
      return NextResponse.json({ reply: response.choices[0].message.content });
    } else {
      // Hakkı yok
      return NextResponse.json({ reply: "Analiz hakkınız kalmadı. Ücretsiz hakkınızı kullandınız. Devam etmek için bir paket satın almalısınız." }, { status: 403 });
    }
  } catch (error: any) {
    console.error("OpenAI/Supabase Hatası:", error);
    return NextResponse.json({ reply: `Sistem hatası: ${error.message}` }, { status: 500 });
  }
}
