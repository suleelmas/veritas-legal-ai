import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { question, pdfText, conversationHistory, targetLang } = await req.json();
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "API Key eksik!" }, { status: 500 });
    }

    if (!question || !pdfText) {
      return NextResponse.json({ error: "Soru ve dosya metni gereklidir." }, { status: 400 });
    }

    // Dil kodunu belirle
    const langMap: any = {
      'TR': 'Türkçe',
      'EN': 'English',
      'FR': 'Français',
      'DE': 'Deutsch',
      'RU': 'Русский',
      'ZH': '中文',
      'AR': 'العربية'
    };
    const lang = langMap[targetLang] || 'English';

    // Sistem promptu
    const systemPrompt = lang === 'Türkçe' 
      ? `Sen profesyonel bir hukuk asistanısın. Kullanıcının yüklediği belgeyi referans alarak sorularını yanıtla. Yanıtlarını sadece Türkçe ver. Belgede olmayan bilgiler için tahmin yapma, sadece belgedeki bilgilere dayan.`
      : `You are a professional legal assistant. Answer the user's questions by referencing the uploaded document. Respond only in ${lang}. Do not make assumptions about information not in the document, base your answers only on the document's content.`;

    // Konuşma geçmişini hazırla
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Belge içeriği:\n${pdfText.substring(0, 15000)}\n\nKullanıcı sorusu: ${question}` }
    ];

    // Konuşma geçmişini ekle (son 5 mesaj)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-5);
      messages.splice(1, 0, ...recentHistory);
    }

    // OpenAI API çağrısı
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.3,
      max_tokens: 1000
    });

    return NextResponse.json({ 
      reply: response.choices[0].message.content 
    });
  } catch (error: any) {
    console.error("Chat API Hatası:", error);
    return NextResponse.json({ 
      error: `Sistem hatası: ${error.message}` 
    }, { status: 500 });
  }
}






