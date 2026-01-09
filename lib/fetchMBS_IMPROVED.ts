// MBS (Mevzuat Bilgi Sistemi) mevzuat metinlerini çekmek için GELİŞTİRİLMİŞ fonksiyon
// Bu versiyon gerçek site yapısını test etmek için hazırlanmıştır

export async function fetchMBS(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    const regulations: Array<{ title: string; content: string; date?: string }> = [];
    
    // ÖRNEK: Gerçek bir MBS mevzuat detay URL'i
    // https://www.mevzuat.gov.tr/mevzuatmetin/1.5.6098.pdf
    // veya HTML: https://www.mevzuat.gov.tr/mevzuatmetin/1.5.6098.htm
    
    try {
      const response = await fetch('https://www.mevzuat.gov.tr/anasayfa/MevzuatFihristDetay', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        console.error('MBS fetch failed:', response.status);
        return [];
      }
      
      const html = await response.text();
      
      // MBS linklerini çek - daha spesifik pattern
      const linkPattern = /<a[^>]*href=["']([^"']*\/mevzuatmetin\/[^"']*|.*MevzuatDetay[^"']*)["'][^>]*>(.*?)<\/a>/gi;
      const mevzuatLinks = Array.from(html.matchAll(linkPattern));
      const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g;
      const dates = Array.from(html.matchAll(datePattern)).map(m => m[1]);
      
      let linkCount = 0;
      for (const match of mevzuatLinks.slice(0, 20)) {
        if (linkCount >= 20) break;
        
        const href = match[1];
        const titleText = match[2].replace(/<[^>]*>/g, '').trim();
        
        if (titleText && titleText.length > 10) {
          // MBS URL'lerini normalize et
          let fullUrl = href.startsWith('http') ? href : `https://www.mevzuat.gov.tr${href}`;
          
          // PDF yerine HTML varsa onu tercih et
          if (fullUrl.includes('.pdf')) {
            fullUrl = fullUrl.replace('.pdf', '.htm');
          }
          
          try {
            const detailResponse = await fetch(fullUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (detailResponse.ok) {
              const detailHtml = await detailResponse.text();
              
              // MBS'de gerçek CSS seçicileri/ID'ler (site yapısına göre güncellenmeli):
              // Olası seçiciler:
              // - #icerik, .icerik
              // - #mevzuat, .mevzuat
              // - #metin, .metin
              // - #content, .content
              // - main, article
              
              let fullContent = '';
              
              // Öncelik sırasına göre deneme
              const selectors = [
                // ID'ler
                detailHtml.match(/<div[^>]*id=["']icerik["'][^>]*>([\s\S]*?)<\/div>/i),
                detailHtml.match(/<div[^>]*id=["']mevzuat["'][^>]*>([\s\S]*?)<\/div>/i),
                detailHtml.match(/<div[^>]*id=["']metin["'][^>]*>([\s\S]*?)<\/div>/i),
                detailHtml.match(/<div[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/i),
                
                // Class'lar (spesifik)
                detailHtml.match(/<div[^>]*class=["'][^"']*\bicerik\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i),
                detailHtml.match(/<div[^>]*class=["'][^"']*\bmevzuat\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i),
                detailHtml.match(/<div[^>]*class=["'][^"']*\bmetin\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i),
                
                // Semantic HTML
                detailHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i),
                detailHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i),
                
                // Fallback
                detailHtml.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
              ].find(m => m !== null);
              
              if (selectors) {
                fullContent = selectors[1];
                
                // HTML temizleme - madde numaralarını koru
                fullContent = fullContent
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                  .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
                  .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
                  .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
                  .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
                  // List item'ları koru (madde numaraları için)
                  .replace(/<li[^>]*>/gi, '\n• ')
                  .replace(/<\/li>/gi, '')
                  // Paragrafları koru
                  .replace(/<p[^>]*>/gi, '\n\n')
                  .replace(/<\/p>/gi, '')
                  // Başlıkları koru
                  .replace(/<h[1-6][^>]*>/gi, '\n\n## ')
                  .replace(/<\/h[1-6]>/gi, '\n\n')
                  // Diğer HTML taglerini kaldır
                  .replace(/<[^>]+>/g, ' ')
                  // Fazla boşlukları temizle
                  .replace(/\n{3,}/g, '\n\n')
                  .replace(/[ \t]+/g, ' ')
                  .trim();
              }
              
              // Eğer içerik çok kısa ise veya bulunamadıysa
              if (!fullContent || fullContent.length < 300) {
                console.warn(`MBS: İçerik çok kısa veya bulunamadı: ${titleText} (${fullContent?.length || 0} karakter)`);
                fullContent = titleText;
              }
              
              regulations.push({
                title: `MBS: ${titleText}`,
                content: fullContent,
                date: dates[linkCount] || new Date().toISOString().split('T')[0]
              });
              
              linkCount++;
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (detailErr) {
            console.error(`MBS detay sayfası hatası (${titleText}):`, detailErr);
            regulations.push({
              title: `MBS: ${titleText}`,
              content: titleText,
              date: dates[linkCount] || new Date().toISOString().split('T')[0]
            });
            linkCount++;
          }
        }
      }
    } catch (err) {
      console.error('MBS fetch hatası:', err);
    }
    
    return regulations.slice(0, 20);
  } catch (err) {
    console.error('MBS mevzuat çekme hatası:', err);
    return [];
  }
}







