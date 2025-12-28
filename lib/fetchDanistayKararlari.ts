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

    // Basit HTML parsing - gerçek implementasyon için daha gelişmiş parser gerekebilir
    const titleMatches = html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi);
    const dateMatches = html.matchAll(/<time[^>]*>(.*?)<\/time>/gi);
    
    let titles: string[] = [];
    let dates: string[] = [];
    
    for (const match of titleMatches) {
      const title = match[1].replace(/<[^>]*>/g, '').trim();
      if (title && title.length > 10 && !title.toLowerCase().includes('danıştay')) {
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
        title,
        content: title, // Gerçek implementasyonda karar içeriği de çekilmeli
        date: dates[idx] || new Date().toISOString().split('T')[0]
      });
    });

    return decisions;
  } catch (err) {
    console.error('Danıştay kararları çekme hatası:', err);
    return [];
  }
}


