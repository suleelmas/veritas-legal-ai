// Danıştay kararlarını çekmek için fonksiyon
export async function fetchDanistayKararlari(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    // Danıştay'ın resmi sitesinden son kararları çek
    const response = await fetch('https://www.danistay.gov.tr/kararlar', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('Danıştay fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const decisions: Array<{ title: string; content: string; date?: string }> = [];

    // Karar linklerini ve başlıklarını çek
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']*karar[^"']*|.*\.html?)["'][^>]*>(.*?)<\/a>/gi);
    const dateMatches = Array.from(html.matchAll(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g));
    const dates = dateMatches.map(m => m[1]);
    
    let linkCount = 0;
    for (const match of linkMatches) {
      if (linkCount >= 20) break;
      
      const href = match[1];
      const titleText = match[2].replace(/<[^>]*>/g, '').trim();
      
      if (titleText && titleText.length > 10 && !titleText.toLowerCase().includes('danıştay')) {
        const fullUrl = href.startsWith('http') ? href : `https://www.danistay.gov.tr${href}`;
        
        // Karar detay sayfasından tam metni çek
        try {
          const detailResponse = await fetch(fullUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (detailResponse.ok) {
            const detailHtml = await detailResponse.text();
            
            // Karar metnini çek
            const contentMatches = [
              detailHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i),
              detailHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i),
              detailHtml.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i),
              detailHtml.match(/<div[^>]*id=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i),
              detailHtml.match(/<div[^>]*class=["'][^"']*karar[^"']*["'][^>]*>([\s\S]*?)<\/div>/i),
              detailHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
            ].filter(m => m !== null);
            
            let fullContent = '';
            if (contentMatches.length > 0) {
              fullContent = contentMatches[0]![1];
              fullContent = fullContent
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
                .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
                .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              
              if (fullContent.length < 300) {
                fullContent = detailHtml
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                  .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
                  .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
                  .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
              }
            } else {
              fullContent = titleText;
            }
            
            decisions.push({
              title: `Danıştay: ${titleText}`,
              content: fullContent || titleText,
              date: dates[linkCount] || new Date().toISOString().split('T')[0]
            });
            
            linkCount++;
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (detailErr) {
          decisions.push({
            title: `Danıştay: ${titleText}`,
            content: titleText,
            date: dates[linkCount] || new Date().toISOString().split('T')[0]
          });
          linkCount++;
        }
      }
    }

    return decisions;
  } catch (err) {
    console.error('Danıştay kararları çekme hatası:', err);
    return [];
  }
}







