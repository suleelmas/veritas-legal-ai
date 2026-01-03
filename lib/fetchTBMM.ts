// TBMM (Türkiye Büyük Millet Meclisi) kanunlar ve tasarılarını çekmek için fonksiyon
export async function fetchTBMM(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    // TBMM resmi sitesinden kanunlar ve tasarılar
    // Kanunlar: https://www.tbmm.gov.tr/kanunlar/k1.html
    // Tasarılar: https://www.tbmm.gov.tr/develop/owa/tasari_sd_sorgu.sorgu_baslangic
    
    const laws: Array<{ title: string; content: string; date?: string }> = [];
    
    // 1. Son kanunları çek
    try {
      const kanunlarResponse = await fetch('https://www.tbmm.gov.tr/kanunlar/k1.html', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (kanunlarResponse.ok) {
        const html = await kanunlarResponse.text();
        
        // TBMM kanunlar sayfasından kanun linklerini ve başlıklarını çek
        // Genellikle tablo formatında veya liste formatında olur
        const lawLinks = html.matchAll(/<a[^>]*href=["']([^"']*kanun[^"']*\.html?)["'][^>]*>(.*?)<\/a>/gi);
        const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g;
        
        const dates = Array.from(html.matchAll(datePattern)).map(m => m[1]);
        
        let linkCount = 0;
        for (const match of lawLinks) {
          if (linkCount >= 20) break;
          
          const href = match[1];
          const titleText = match[2].replace(/<[^>]*>/g, '').trim();
          
          if (titleText && titleText.length > 10 && !titleText.toLowerCase().includes('tbmm')) {
            const fullUrl = href.startsWith('http') ? href : `https://www.tbmm.gov.tr${href}`;
            
            // Kanun detay sayfasından tam metni çek
            try {
              const detailResponse = await fetch(fullUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              
              if (detailResponse.ok) {
                const detailHtml = await detailResponse.text();
                
                // Kanun metnini çek - genellikle <div>, <p>, <article> veya <main> içinde olur
                const contentMatches = [
                  detailHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i),
                  detailHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i),
                  detailHtml.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i),
                  detailHtml.match(/<div[^>]*id=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i),
                  detailHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
                ].filter(m => m !== null);
                
                let fullContent = '';
                if (contentMatches.length > 0) {
                  fullContent = contentMatches[0]![1];
                  // HTML taglerini temizle
                  fullContent = fullContent
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                  
                  // Eğer çok kısa ise, tüm body'yi al
                  if (fullContent.length < 200) {
                    fullContent = detailHtml
                      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();
                  }
                } else {
                  fullContent = titleText;
                }
                
                laws.push({
                  title: `TBMM Kanun: ${titleText}`,
                  content: fullContent || titleText,
                  date: dates[linkCount] || new Date().toISOString().split('T')[0]
                });
                
                linkCount++;
                
                // Rate limiting - her istek arasında kısa bekleme
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (detailErr) {
              // Detay sayfası çekilemezse sadece başlığı ekle
              laws.push({
                title: `TBMM Kanun: ${titleText}`,
                content: titleText,
                date: dates[linkCount] || new Date().toISOString().split('T')[0]
              });
              linkCount++;
            }
          }
        }
      }
    } catch (err) {
      console.error('TBMM kanunlar fetch hatası:', err);
    }
    
    // 2. Son tasarıları çek
    try {
      const tasarilarResponse = await fetch('https://www.tbmm.gov.tr/develop/owa/tasari_sd_sorgu.sorgu_baslangic', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (tasarilarResponse.ok) {
        const html = await tasarilarResponse.text();
        
        // Tasarı başlıklarını ve linklerini çek
        const billLinks = html.matchAll(/<a[^>]*href=["']([^"']*tasari[^"']*)["'][^>]*>(.*?)<\/a>/gi);
        const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g;
        const dates = Array.from(html.matchAll(datePattern)).map(m => m[1]);
        
        let billCount = 0;
        for (const match of billLinks) {
          if (billCount >= 10) break; // Tasarılardan en fazla 10 tane
          
          const href = match[1];
          const titleText = match[2].replace(/<[^>]*>/g, '').trim();
          
          if (titleText && titleText.length > 10) {
            const fullUrl = href.startsWith('http') ? href : `https://www.tbmm.gov.tr${href}`;
            
            try {
              const detailResponse = await fetch(fullUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              
              if (detailResponse.ok) {
                const detailHtml = await detailResponse.text();
                
                // Tasarı metnini çek
                const contentMatches = [
                  detailHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i),
                  detailHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i),
                  detailHtml.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i),
                  detailHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
                ].filter(m => m !== null);
                
                let fullContent = '';
                if (contentMatches.length > 0) {
                  fullContent = contentMatches[0]![1]
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                  
                  if (fullContent.length < 200) {
                    fullContent = detailHtml
                      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();
                  }
                } else {
                  fullContent = titleText;
                }
                
                laws.push({
                  title: `TBMM Tasarı: ${titleText}`,
                  content: fullContent || titleText,
                  date: dates[billCount] || new Date().toISOString().split('T')[0]
                });
                
                billCount++;
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (detailErr) {
              laws.push({
                title: `TBMM Tasarı: ${titleText}`,
                content: titleText,
                date: dates[billCount] || new Date().toISOString().split('T')[0]
              });
              billCount++;
            }
          }
        }
      }
    } catch (err) {
      console.error('TBMM tasarılar fetch hatası:', err);
    }
    
    return laws.slice(0, 20); // En fazla 20 sonuç
  } catch (err) {
    console.error('TBMM kararları çekme hatası:', err);
    return [];
  }
}


