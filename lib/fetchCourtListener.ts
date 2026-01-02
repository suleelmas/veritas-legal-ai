// CourtListener'dan mahkeme kararlarını çekmek için fonksiyon
// CourtListener: https://www.courtlistener.com/
// Free Law Project API: https://www.courtlistener.com/api/
export async function fetchCourtListener(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    // CourtListener API kullan (ücretsiz tier için rate limit var)
    // API key gerekebilir, environment variable'dan al
    const apiKey = process.env.COURTLISTENER_API_KEY || '';
    
    // Son kararları çek - API endpoint: /api/rest/v3/search/
    // Alternatif: RSS feed kullan
    const apiUrl = apiKey 
      ? `https://www.courtlistener.com/api/rest/v3/search/?order_by=-dateFiled&page_size=20&format=json`
      : 'https://www.courtlistener.com/api/rest/v3/search/?order_by=-dateFiled&page_size=20&format=json';
    
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Token ${apiKey}`;
    }

    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      console.error('CourtListener API fetch failed:', response.status);
      // Fallback: RSS feed kullan
      return await fetchCourtListenerFromRSS();
    }

    const data = await response.json();
    const decisions: Array<{ title: string; content: string; date?: string }> = [];

    // API response'dan kararları parse et
    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        const title = result.caseName || result.docketNumber || 'Unknown Case';
        const content = result.caseName || '';
        const date = result.dateFiled || result.dateModified || new Date().toISOString().split('T')[0];
        
        decisions.push({
          title: `CourtListener: ${title}`,
          content: content,
          date: date
        });
      }
    }

    return decisions;
  } catch (err) {
    console.error('CourtListener API çekme hatası:', err);
    // Fallback: RSS feed
    return await fetchCourtListenerFromRSS();
  }
}

// Alternatif: RSS feed'den çek
async function fetchCourtListenerFromRSS(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    // CourtListener RSS feed (eğer varsa)
    // Alternatif: HTML parsing
    const response = await fetch('https://www.courtlistener.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('CourtListener HTML fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const decisions: Array<{ title: string; content: string; date?: string }> = [];

    // Basit HTML parsing
    const titleMatches = html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi);
    const dateMatches = html.matchAll(/<time[^>]*>(.*?)<\/time>/gi);
    
    let titles: string[] = [];
    let dates: string[] = [];
    
    for (const match of titleMatches) {
      const title = match[1].replace(/<[^>]*>/g, '').trim();
      if (title && title.length > 10 && !title.toLowerCase().includes('courtlistener')) {
        titles.push(title);
      }
    }

    for (const match of dateMatches) {
      const date = match[1].replace(/<[^>]*>/g, '').trim();
      if (date) dates.push(date);
    }

    // Son 20 kararı al
    titles.slice(0, 20).forEach((title, idx) => {
      decisions.push({
        title: `CourtListener: ${title}`,
        content: title,
        date: dates[idx] || new Date().toISOString().split('T')[0]
      });
    });

    return decisions;
  } catch (err) {
    console.error('CourtListener RSS/HTML çekme hatası:', err);
    return [];
  }
}







