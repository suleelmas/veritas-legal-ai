// Congress.gov'dan federal mevzuat verilerini çekmek için fonksiyon
export async function fetchCongressGov(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    // Congress.gov'un RSS feed'lerini veya API'sini kullan
    // Congress.gov RSS: https://www.congress.gov/rss/
    // En son yasaları çek
    const response = await fetch('https://www.congress.gov/rss/bills.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('Congress.gov RSS fetch failed:', response.status);
      // Alternatif: Ana sayfadan HTML parse et
      return await fetchCongressGovFromHTML();
    }

    const xml = await response.text();
    const bills: Array<{ title: string; content: string; date?: string }> = [];

    // RSS XML parsing
    const itemMatches = xml.matchAll(/<item>(.*?)<\/item>/gis);
    
    for (const match of itemMatches) {
      const item = match[1];
      const titleMatch = item.match(/<title>(.*?)<\/title>/i);
      const descriptionMatch = item.match(/<description>(.*?)<\/description>/i);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);
      
      if (titleMatch) {
        const title = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
        const description = descriptionMatch ? descriptionMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString().split('T')[0];
        
        bills.push({
          title: `Congress.gov: ${title}`,
          content: description || title,
          date: pubDate
        });
      }
    }

    // Son 20 yasayı al
    return bills.slice(0, 20);
  } catch (err) {
    console.error('Congress.gov RSS çekme hatası:', err);
    // Fallback: HTML parsing
    return await fetchCongressGovFromHTML();
  }
}

// Alternatif: HTML'den parse et
async function fetchCongressGovFromHTML(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    const response = await fetch('https://www.congress.gov/search', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('Congress.gov HTML fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const bills: Array<{ title: string; content: string; date?: string }> = [];

    // Basit HTML parsing - gerçek implementasyon için daha gelişmiş parser gerekebilir
    const titleMatches = html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi);
    const dateMatches = html.matchAll(/<time[^>]*>(.*?)<\/time>/gi);
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']*bill[^"']*)["'][^>]*>(.*?)<\/a>/gi);
    
    let titles: string[] = [];
    let dates: string[] = [];
    
    for (const match of titleMatches) {
      const title = match[1].replace(/<[^>]*>/g, '').trim();
      if (title && title.length > 10 && !title.toLowerCase().includes('congress.gov')) {
        titles.push(title);
      }
    }

    for (const match of dateMatches) {
      const date = match[1].replace(/<[^>]*>/g, '').trim();
      if (date) dates.push(date);
    }

    // Son 20 yasayı al
    titles.slice(0, 20).forEach((title, idx) => {
      bills.push({
        title: `Congress.gov: ${title}`,
        content: title,
        date: dates[idx] || new Date().toISOString().split('T')[0]
      });
    });

    return bills;
  } catch (err) {
    console.error('Congress.gov HTML çekme hatası:', err);
    return [];
  }
}

