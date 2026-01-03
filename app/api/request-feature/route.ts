import { NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = "8415963295:AAEgRJ3QX2ZBVsIh5lxiXhFOf_-7WTpIOdc";
const TELEGRAM_CHAT_ID = "8418884482";

export async function POST(req: Request) {
  try {
    const { email, suggestion } = await req.json();

    if (!suggestion || !suggestion.trim()) {
      return NextResponse.json({ error: "Suggestion is required" }, { status: 400 });
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

📧 Gönderen: ${email || 'Anonim'}
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
        parse_mode: 'HTML'
      })
    });

    const telegramResponse = await response.json();

    if (!response.ok || !telegramResponse.ok) {
      console.error('Telegram API error:', telegramResponse);
      return NextResponse.json({ 
        error: 'Telegram gönderim hatası', 
        details: telegramResponse 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Öneri başarıyla gönderildi' 
    });
  } catch (error: any) {
    console.error('Request Feature API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

