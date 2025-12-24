import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getUserKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const ua = req.headers.get("user-agent") || "";
  return `${ip}_${ua}`;
}

export async function POST(req: Request) {
  try {
    const { pdfText, targetLang } = await req.json();
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ reply: "API Key eksik!" }, { status: 500 });
    }
    const userKey = getUserKey(req);
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
    if (creditRow && creditRow.credit > 0) {
      // Kredisi olanlar için analiz
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Sen profesyonel bir hukuk analistisin. Analizini sadece ${targetLang} dilinde yap. Paragrafları tekrar etme.` },
          { role: "user", content: `Şu metni analiz et: ${pdfText.substring(0, 12000)}` }
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
          { role: "system", content: `Sen profesyonel bir hukuk analistisin. Analizini sadece ${targetLang} dilinde yap. Paragrafları tekrar etme.` },
          { role: "user", content: `Şu metni analiz et: ${pdfText.substring(0, 12000)}` }
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
