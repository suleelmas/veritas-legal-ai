import { NextResponse } from 'next/server';

// Vercel'in önbelleğe almasını engellemek için dinamik yapıyoruz
export const dynamic = 'force-dynamic';

// Maksimum işlem süresi (geçici olarak 10 saniye)
export const maxDuration = 10;

// Telegram'ın maksimum dosya boyutu (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Vercel'in maksimum payload boyutu (4.5MB - güvenli limit)
const VERCEL_MAX_PAYLOAD = 4.5 * 1024 * 1024; // 4.5MB in bytes

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

    // 3. Telegram'a gönderim - Görsel varsa sendPhoto, yoksa sendMessage
    let telRes: Response;
    let telData: any;

    if (body.file) {
      try {
        // Base64 görseli decode et
        let base64Data = body.file;
        
        if (!base64Data || typeof base64Data !== 'string') {
          return NextResponse.json({ 
            error: "Görsel verisi geçersiz veya eksik.",
            debug: { 
              hasFile: !!body.file,
              fileType: typeof body.file,
              step: "veri_kontrolu"
            }
          }, { status: 400 });
        }
        
        // data:image/png;base64, prefix'ini kaldır
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        
        // Base64'ü Buffer'a çevir
        let imageBuffer: Buffer;
        try {
          imageBuffer = Buffer.from(base64Data, 'base64');
        } catch (bufferError: any) {
          return NextResponse.json({ 
            error: "Base64 decode hatası: Görsel verisi geçersiz format.",
            debug: { 
              step: "base64_decode",
              error: bufferError.message
            }
          }, { status: 400 });
        }
        
        // Dosya boyutu kontrolü
        const fileSizeInBytes = imageBuffer.length;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
        
        // Vercel payload limiti kontrolü (413 hatasını önlemek için)
        if (fileSizeInBytes > VERCEL_MAX_PAYLOAD) {
          console.error(`[Report Bug API] Payload çok büyük: ${fileSizeInMB}MB (Limit: 4.5MB)`);
          return NextResponse.json({ 
            error: `Görsel boyutu çok büyük. Maksimum boyut: 4.5MB, Mevcut boyut: ${fileSizeInMB}MB. Lütfen görseli küçültün.`,
            debug: { 
              step: "vercel_payload_limit",
              fileSizeBytes: fileSizeInBytes,
              fileSizeMB: fileSizeInMB,
              maxSizeMB: VERCEL_MAX_PAYLOAD / (1024 * 1024)
            }
          }, { status: 413 });
        }
        
        if (fileSizeInBytes > MAX_FILE_SIZE) {
          return NextResponse.json({ 
            error: `Görsel boyutu çok büyük. Maksimum boyut: 10MB, Mevcut boyut: ${fileSizeInMB}MB`,
            debug: { 
              step: "dosya_boyutu_kontrolu",
              fileSizeBytes: fileSizeInBytes,
              fileSizeMB: fileSizeInMB,
              maxSizeMB: MAX_FILE_SIZE / (1024 * 1024)
            }
          }, { status: 400 });
        }
        
        // Next.js'in yerleşik FormData'sını kullan (Node.js 18+ global FormData)
        const telegramFormData = new FormData();
        // Buffer'ı Uint8Array'e çevirip Blob oluştur
        const uint8Array = new Uint8Array(imageBuffer);
        const imageBlob = new Blob([uint8Array], { type: 'image/png' });
        telegramFormData.append('photo', imageBlob, 'screenshot.png');
        telegramFormData.append('chat_id', chatId);
        telegramFormData.append('caption', message);
        telegramFormData.append('parse_mode', 'Markdown');

        // sendPhoto endpoint'ine gönder
        try {
          telRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            body: telegramFormData,
          });

          telData = await telRes.json().catch(() => ({ error: 'JSON parse hatası' }));
          
          // Telegram'dan dönen hatayı logla
          if (!telRes.ok) {
            console.error('[Report Bug API] Telegram API Hatası:', {
              status: telRes.status,
              statusText: telRes.statusText,
              response: telData,
              fileSizeMB: fileSizeInMB
            });
          }
        } catch (fetchError: any) {
          console.error('[Report Bug API] Fetch Hatası:', {
            error: fetchError.message,
            errorType: fetchError.name,
            errorStack: fetchError.stack,
            fileSizeMB: fileSizeInMB
          });
          return NextResponse.json({ 
            error: "Telegram API'ye fetch isteği başarısız oldu.",
            debug: { 
              step: "telegram_fetch",
              error: fetchError.message,
              errorType: fetchError.name,
              fileSizeMB: fileSizeInMB
            }
          }, { status: 500 });
        }
      } catch (imageProcessingError: any) {
        return NextResponse.json({ 
          error: "Görsel işleme hatası: " + imageProcessingError.message,
          debug: { 
            step: "gorsel_isleme",
            error: imageProcessingError.message,
            errorType: imageProcessingError.name
          }
        }, { status: 500 });
      }
    } else {
      // Görsel yoksa normal mesaj gönder
      try {
        telRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        });

        telData = await telRes.json().catch(() => ({ error: 'JSON parse hatası' }));
        
        // Telegram'dan dönen hatayı logla
        if (!telRes.ok) {
          console.error('[Report Bug API] Telegram API Hatası (sendMessage):', {
            status: telRes.status,
            statusText: telRes.statusText,
            response: telData
          });
        }
      } catch (fetchError: any) {
        console.error('[Report Bug API] Fetch Hatası (sendMessage):', {
          error: fetchError.message,
          errorType: fetchError.name,
          errorStack: fetchError.stack
        });
        return NextResponse.json({ 
          error: "Telegram API'ye fetch isteği başarısız oldu.",
          debug: { 
            step: "telegram_fetch_sendMessage",
            error: fetchError.message,
            errorType: fetchError.name
          }
        }, { status: 500 });
      }
    }

    if (!telRes.ok) {
      console.error('[Report Bug API] Telegram API Reddedildi:', {
        status: telRes.status,
        statusText: telRes.statusText,
        telegramError: telData,
        hasFile: !!body.file
      });
      return NextResponse.json({ 
        error: "Telegram API reddetti: " + (telData.description || "Bilinmiyor"),
        debug: {
          step: "telegram_api_response",
          status: telRes.status,
          statusText: telRes.statusText,
          telegramError: telData,
          hasFile: !!body.file
        }
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Rapor iletildi!" });

  } catch (error: any) {
    console.error("Report Bug API hatası:", error);
    return NextResponse.json({ 
      error: "Sunucu hatası oluştu: " + error.message,
      debug: {
        step: "genel_hata_yakalama",
        errorType: error.name,
        errorMessage: error.message,
        errorStack: error.stack?.split('\n').slice(0, 3) // İlk 3 satır
      }
    }, { status: 500 });
  }
}
