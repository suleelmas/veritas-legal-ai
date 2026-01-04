import { NextResponse } from 'next/server';

// Vercel'in önbelleğe almasını engellemek için dinamik yapıyoruz
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Content-Type'a göre veriyi al (FormData veya JSON)
    const contentType = req.headers.get('content-type') || '';
    let body: any = null;

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // FormData olarak parse et
      const formData = await req.formData();
      body = {
        type: formData.get('type')?.toString() || formData.get('title')?.toString() || null,
        title: formData.get('title')?.toString() || null,
        description: formData.get('description')?.toString() || null,
        email: formData.get('email')?.toString() || null,
        file: formData.get('file')
      };
    } else {
      // JSON olarak parse et
      body = await req.json().catch(() => null);
    }
    
    // 1. Veri kontrolü - description veya title kontrolü
    if (!body || (!body.description && !body.title)) {
      return NextResponse.json({ error: "Rapor içeriği boş gönderilemez." }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // 2. Vercel ortam değişkeni kontrolü
    if (!token || !chatId) {
       console.error("Vercel'de TOKEN veya CHAT_ID eksik!");
       return NextResponse.json({ 
         error: "Sistem yapılandırması eksik. Lütfen yöneticiye bildirin.",
         debug: { hasToken: !!token, hasChatId: !!chatId } 
       }, { status: 500 });
    }

    // type veya title'ı kullan (öncelik type'da)
    const reportType = body.type || body.title || 'Bilinmiyor';
    const description = body.description || '';

    const message = `🚨 **YENİ HATA BİLDİRİMİ** 🚨\n` +
                    `────────────────────\n` +
                    `**Tür:** ${reportType}\n` +
                    `**Açıklama:** ${description}\n` +
                    `**E-posta:** ${body.email || 'Belirtilmedi'}\n` +
                    `────────────────────`;

    // 3. Telegram'a gönderim
    const telRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const telData = await telRes.json();

    if (!telRes.ok) {
      return NextResponse.json({ 
        error: "Telegram API reddetti: " + (telData.description || "Bilinmiyor") 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Rapor iletildi!" });

  } catch (error: any) {
    console.error("Report Bug API hatası:", error);
    return NextResponse.json({ 
      error: "Sunucu hatası oluştu: " + error.message 
    }, { status: 500 });
  }
}
