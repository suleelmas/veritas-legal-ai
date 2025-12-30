import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";
import { fetchYargitayKararlari } from '@/lib/fetchYargitayKararlari';
import { fetchDanistayKararlari } from '@/lib/fetchDanistayKararlari';
import { fetchAnayasaMahkemesiKararlari } from '@/lib/fetchAnayasaMahkemesiKararlari';
import { fetchKVKKKararlari } from '@/lib/fetchKVKKKararlari';
import { fetchCongressGov } from '@/lib/fetchCongressGov';
import { fetchSCOTUS } from '@/lib/fetchSCOTUS';
import { fetchCourtListener } from '@/lib/fetchCourtListener';
import { fetchOpenJurist } from '@/lib/fetchOpenJurist';
import { upsertDocument } from '@/lib/upsertDocument';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Kritik anahtar kelimeler - bunlar için canlı veri çekilecek
const CRITICAL_KEYWORDS_TR = [
  'KVKK', 'TBK', 'HMK', 'İİK', 'AYM', 'Yargıtay', 'Danıştay', 
  'Anayasa', 'Kanun', 'Yönetmelik', 'Tüzük', 'Tebliğ', 'Karar',
  '2024', '2025', 'son karar', 'güncel', 'yeni mevzuat'
];

const CRITICAL_KEYWORDS_EN = [
  'SCOTUS', 'Supreme Court', 'Congress', 'Federal', 'Act', 'Law',
  '2024', '2025', 'recent', 'latest', 'current legislation', 'case law'
];

function getUserKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const ua = req.headers.get("user-agent") || "";
  return `${ip}_${ua}`;
}

// Kritik anahtar kelime kontrolü
function hasCriticalKeywords(text: string, targetLang: string): boolean {
  const keywords = targetLang === 'TR' || targetLang === 'Turkish' 
    ? CRITICAL_KEYWORDS_TR 
    : CRITICAL_KEYWORDS_EN;
  const upperText = text.toUpperCase();
  return keywords.some(keyword => upperText.includes(keyword.toUpperCase()));
}

// Veritabanındaki en son güncelleme tarihini kontrol et
async function isDatabaseStale(supabase: any, days: number = 1): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('documents')
      .select('metadata')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!data) return true;
    
    const lastUpdate = data.metadata?.updated || data.metadata?.date;
    if (!lastUpdate) return true;
    
    const lastUpdateDate = new Date(lastUpdate);
    const daysSinceUpdate = (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > days;
  } catch {
    return true;
  }
}

// Canlı veri çekme (sadece kritik durumlarda)
async function fetchLiveData(
  pdfText: string, 
  targetLang: string, 
  supabase: any
): Promise<Array<{ content: string; metadata: any }>> {
  const liveDocs: Array<{ content: string; metadata: any }> = [];
  
  try {
    if (targetLang === 'TR' || targetLang === 'Turkish') {
      // Türkçe kaynaklar
      if (pdfText.toUpperCase().includes('YARGITAY') || pdfText.toUpperCase().includes('YARGI')) {
        const decisions = await fetchYargitayKararlari();
        for (const decision of decisions.slice(0, 2)) {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'yargitay', date: decision.date, live: true }
          });
          // Hemen kaydet
          await upsertDocument(content, {
            source: 'yargitay',
            date: decision.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'karar'
          }, supabase);
        }
      }
      
      if (pdfText.toUpperCase().includes('DANIŞTAY') || pdfText.toUpperCase().includes('İDARİ')) {
        const decisions = await fetchDanistayKararlari();
        for (const decision of decisions.slice(0, 2)) {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'danistay', date: decision.date, live: true }
          });
          await upsertDocument(content, {
            source: 'danistay',
            date: decision.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'karar'
          }, supabase);
        }
      }
      
      if (pdfText.toUpperCase().includes('KVKK') || pdfText.toUpperCase().includes('KİŞİSEL VERİ')) {
        const decisions = await fetchKVKKKararlari();
        for (const decision of decisions.slice(0, 2)) {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'kvkk', date: decision.date, live: true }
          });
          await upsertDocument(content, {
            source: 'kvkk',
            date: decision.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'karar'
          }, supabase);
        }
      }
    } else {
      // İngilizce kaynaklar
      if (pdfText.toUpperCase().includes('SCOTUS') || pdfText.toUpperCase().includes('SUPREME COURT')) {
        const decisions = await fetchSCOTUS();
        for (const decision of decisions.slice(0, 2)) {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'scotus', date: decision.date, live: true }
          });
          await upsertDocument(content, {
            source: 'scotus',
            date: decision.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'supreme_court_decision',
            country: 'US'
          }, supabase);
        }
      }
      
      if (pdfText.toUpperCase().includes('CONGRESS') || pdfText.toUpperCase().includes('FEDERAL')) {
        const bills = await fetchCongressGov();
        for (const bill of bills.slice(0, 2)) {
          const content = `${bill.title}${bill.content ? '\n' + bill.content : ''}`;
          liveDocs.push({
            content,
            metadata: { source: 'congress', date: bill.date, live: true }
          });
          await upsertDocument(content, {
            source: 'congress',
            date: bill.date || new Date().toISOString().split('T')[0],
            updated: new Date().toISOString(),
            type: 'federal_legislation',
            country: 'US'
          }, supabase);
        }
      }
    }
  } catch (error) {
    console.error('Live fetch error:', error);
  }
  
  return liveDocs;
}

async function getRelevantDocuments(
  pdfText: string, 
  targetLang: string = 'TR', 
  limit: number = 5,
  onStatusUpdate?: (status: string) => void
): Promise<{ documents: Array<any>, usedLiveFetch: boolean }> {
  try {
    const supabase = await createClient();
    let usedLiveFetch = false;
    
    // Adım A: Vector Search - Önce veritabanından ara
    onStatusUpdate?.('Güncel mevzuat veritabanı taranıyor...');
    
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
    if (!embeddingResp.ok || !embeddingData.data) {
      return { documents: [], usedLiveFetch: false };
    }
    const queryEmbedding = embeddingData.data[0].embedding;

    let dbDocuments: any[] = [];
    
    // Supabase'de benzer belgeleri bul
    try {
      const { data: documents } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit
      });
      if (documents) {
        if (targetLang === 'EN' || targetLang === 'English') {
          dbDocuments = documents;
        } else {
          dbDocuments = documents.filter((doc: any) => 
            doc.metadata?.source !== 'congress' && 
            doc.metadata?.source !== 'scotus' &&
            doc.metadata?.source !== 'courtlistener' &&
            doc.metadata?.source !== 'openjurist'
          );
        }
      }
    } catch (rpcError) {
      console.log('RPC function not found, using direct query');
      const sources = ['resmigazete', 'yargitay', 'danistay', 'anayasa', 'kvkk'];
      if (targetLang === 'EN' || targetLang === 'English') {
        sources.push('congress', 'scotus', 'courtlistener', 'openjurist');
      }
      
      const { data: recentDocs } = await supabase
        .from('documents')
        .select('content, metadata')
        .in('metadata->>source', sources)
        .order('created_at', { ascending: false })
        .limit(limit * 2);
      
      dbDocuments = recentDocs || [];
    }

    // Adım B: Real-time Fetch - Kritik durumlarda canlı veri çek
    const needsLiveFetch = hasCriticalKeywords(pdfText, targetLang) || await isDatabaseStale(supabase, 1);
    
    let liveDocuments: any[] = [];
    if (needsLiveFetch) {
      onStatusUpdate?.('Dış kaynaklardan canlı doğrulama yapılıyor...');
      usedLiveFetch = true;
      liveDocuments = await fetchLiveData(pdfText, targetLang, supabase);
    }

    // Adım C: Context Merger - Veritabanı ve canlı verileri birleştir
    const allDocuments = [...liveDocuments, ...dbDocuments];
    
    // Duplicate'leri temizle (content'e göre)
    const uniqueDocuments = Array.from(
      new Map(allDocuments.map(doc => [doc.content?.substring(0, 100), doc])).values()
    );
    
    // En güncel ve en ilgili olanları seç
    const finalDocuments = uniqueDocuments
      .sort((a, b) => {
        // Live fetch edilenler öncelikli
        if (a.metadata?.live && !b.metadata?.live) return -1;
        if (!a.metadata?.live && b.metadata?.live) return 1;
        // Tarihe göre sırala
        const dateA = new Date(a.metadata?.date || a.metadata?.updated || 0);
        const dateB = new Date(b.metadata?.date || b.metadata?.updated || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);

    return { documents: finalDocuments, usedLiveFetch };
  } catch (err) {
    console.error('Document search error:', err);
    return { documents: [], usedLiveFetch: false };
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { pdfText, targetLang } = await req.json();
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ reply: "API Key eksik!" }, { status: 500 });
    }
    const userKey = getUserKey(req);
    
    // Hibrit veri çekme - Vector DB + Live Fetch
    const { documents: relevantDocs, usedLiveFetch } = await getRelevantDocuments(
      pdfText, 
      targetLang,
      5
    );
    
    let contextText = '';
    if (relevantDocs.length > 0) {
      const langPrefix = (targetLang === 'EN' || targetLang === 'English') 
        ? 'Relevant Current Legislation and Decisions:' 
        : 'İlgili Güncel Mevzuat ve Kararlar:';
      contextText = `\n\n${langPrefix}\n`;
      relevantDocs.forEach((doc: any, idx: number) => {
        const source = doc.metadata?.source || 'bilinmeyen';
        const liveTag = doc.metadata?.live ? ' [LIVE]' : '';
        contextText += `${idx + 1}. [${source}${liveTag}] ${doc.content.substring(0, 500)}...\n`;
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
