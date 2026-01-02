import { NextResponse } from "next/server";
import FormData from 'form-data';

const TELEGRAM_BOT_TOKEN = "8415963295:AAEgRJ3QX2ZBVsIh5lxiXhFOf_-7WTpIOdc";
const TELEGRAM_CHAT_ID = "8418884482";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const email = formData.get('email') as string;
    const file = formData.get('file') as File | null;

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    // Dosya boyutu kontrolü
    if (file && file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `Dosya boyutu çok büyük. Maksimum 50MB olmalıdır. (Mevcut: ${(file.size / 1024 / 1024).toFixed(2)}MB)` 
      }, { status: 400 });
    }

    // Telegram mesaj formatı (caption olarak kullanılacak)
    const caption = `🚀 VERITAS Q-AI: YENİ HATA RAPORU

📧 Gönderen: ${email || 'Anonim'}
📌 Konu: ${title}
📝 Mesaj: ${description}`;

    // Dosya varsa sendDocument, yoksa sendMessage kullan
    if (file && file.size > 0) {
      // Dosyayı buffer'a çevir
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // form-data paketi ile FormData oluştur
      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID);
      formData.append('caption', caption);
      formData.append('document', buffer, {
        filename: file.name,
        contentType: file.type || 'application/octet-stream'
      });

      // Telegram sendDocument API'ye gönder
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        body: formData as any,
        headers: formData.getHeaders()
      });

      const telegramResponse = await response.json();

      if (!response.ok || !telegramResponse.ok) {
        console.error('Telegram API error:', telegramResponse);
        return NextResponse.json({ 
          error: 'Telegram gönderim hatası', 
          details: telegramResponse 
        }, { status: 500 });
      }
    } else {
      // Sadece metin gönder
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: caption,
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
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Hata raporu başarıyla gönderildi' 
    });
  } catch (error: any) {
    console.error('Report Bug API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
