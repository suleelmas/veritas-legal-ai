// Anayasa Mahkemesi kararlarını çekmek için fonksiyon
export async function fetchAnayasaMahkemesiKararlari(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    // Anayasa Mahkemesi'nin resmi sitesinden son kararları çek
    // Kararlar Bilgi Bankası: https://kararlarbilgibankasi.anayasa.gov.tr/
    const response = await fetch('https://kararlarbilgibankasi.anayasa.gov.tr/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('Anayasa Mahkemesi fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const decisions: Array<{ title: string; content: string; date?: string }> = [];

    // Basit HTML parsing - gerçek implementasyon için daha gelişmiş parser gerekebilir
    // Anayasa Mahkemesi sitesinin yapısına göre güncellenmeli
    const titleMatches = html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi);
    const dateMatches = html.matchAll(/<time[^>]*>(.*?)<\/time>/gi);
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']*karar[^"']*)["'][^>]*>(.*?)<\/a>/gi);
    
    let titles: string[] = [];
    let dates: string[] = [];
    let links: string[] = [];
    
    for (const match of titleMatches) {
      const title = match[1].replace(/<[^>]*>/g, '').trim();
      if (title && title.length > 10 && !title.toLowerCase().includes('anayasa mahkemesi')) {
        titles.push(title);
      }
    }

    for (const match of dateMatches) {
      const date = match[1].replace(/<[^>]*>/g, '').trim();
      if (date) dates.push(date);
    }

    for (const match of linkMatches) {
      const link = match[1];
      if (link && link.includes('karar')) {
        links.push(link.startsWith('http') ? link : `https://kararlarbilgibankasi.anayasa.gov.tr${link}`);
      }
    }

    // Her karar linkinden tam metni çek
    let linkCount = 0;
    for (const link of links.slice(0, 20)) {
      if (linkCount >= 20) break;
      
      try {
        const detailResponse = await fetch(link, {
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
            detailHtml.match(/<div[^>]*id=["'][^"']*karar[^"']*["'][^>]*>([\s\S]*?)<\/div>/i),
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
          }
          
          const title = titles[linkCount] || `Anayasa Mahkemesi Kararı ${linkCount + 1}`;
          decisions.push({
            title: `Anayasa Mahkemesi: ${title}`,
            content: fullContent || title,
            date: dates[linkCount] || new Date().toISOString().split('T')[0]
          });
          
          linkCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (detailErr) {
        const title = titles[linkCount] || `Anayasa Mahkemesi Kararı ${linkCount + 1}`;
        decisions.push({
          title: `Anayasa Mahkemesi: ${title}`,
          content: title,
          date: dates[linkCount] || new Date().toISOString().split('T')[0]
        });
        linkCount++;
      }
    }

    return decisions;
  } catch (err) {
    console.error('Anayasa Mahkemesi kararları çekme hatası:', err);
    return [];
  }
}







