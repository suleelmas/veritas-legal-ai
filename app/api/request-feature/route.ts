import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function POST(req: Request) {
  try {
    const { suggestion } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const verifiedEmail = user?.email || null;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('[Request Feature] Telegram environment variables are not configured.');
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }

    if (!suggestion || !suggestion.trim()) {
      return NextResponse.json({ error: "Suggestion is required" }, { status: 400 });
    }
    if (suggestion.length > 4000) {
      return NextResponse.json({ error: "Suggestion is too long" }, { status: 413 });
    }

    // Get current timestamp
    const now = new Date();
    const timestamp = now.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Telegram mesaj formatı
    const message = `💡 YENİ ÖNERİ / İSTEK

📧 Gönderen: ${verifiedEmail || 'Anonim'}
💭 Öneri: ${suggestion}
🕐 Gönderim Saati: ${timestamp}`;

    // Telegram sendMessage API'ye gönder
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      })
    });

    const telegramResponse = await response.json();

    if (!response.ok || !telegramResponse.ok) {
      console.error('Telegram API error:', {
        status: response.status,
        ok: telegramResponse?.ok === true
      });
      return NextResponse.json({ error: 'Unable to submit request' }, { status: 502 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Öneri başarıyla gönderildi' 
    });
  } catch (error: any) {
    console.error('Request Feature API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

