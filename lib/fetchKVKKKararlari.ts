// KVKK (Kişisel Verilerin Korunması Kurumu) kararlarını çekmek için fonksiyon
export async function fetchKVKKKararlari(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    // KVKK'nın resmi sitesinden son kararları çek
    // KVKK resmi site: https://www.kvkk.gov.tr/
    const response = await fetch('https://www.kvkk.gov.tr/Icerik/6729/Kararlar', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('KVKK fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const decisions: Array<{ title: string; content: string; date?: string }> = [];

    // Basit HTML parsing - gerçek implementasyon için daha gelişmiş parser gerekebilir
    // KVKK sitesinin yapısına göre güncellenmeli
    const titleMatches = html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi);
    const dateMatches = html.matchAll(/<time[^>]*>(.*?)<\/time>/gi);
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']*karar[^"']*)["'][^>]*>(.*?)<\/a>/gi);
    
    let titles: string[] = [];
    let dates: string[] = [];
    let links: string[] = [];
    
    for (const match of titleMatches) {
      const title = match[1].replace(/<[^>]*>/g, '').trim();
      if (title && title.length > 10 && !title.toLowerCase().includes('kvkk') && !title.toLowerCase().includes('kişisel verilerin korunması kurumu')) {
        titles.push(title);
      }
    }

    for (const match of dateMatches) {
      const date = match[1].replace(/<[^>]*>/g, '').trim();
      if (date) dates.push(date);
    }

    for (const match of linkMatches) {
      const link = match[1];
      if (link && (link.includes('karar') || link.includes('decision'))) {
        links.push(link.startsWith('http') ? link : `https://www.kvkk.gov.tr${link}`);
      }
    }

    // Son 20 kararı al
    titles.slice(0, 20).forEach((title, idx) => {
      decisions.push({
        title: `KVKK: ${title}`,
        content: title, // Gerçek implementasyonda karar içeriği de çekilmeli
        date: dates[idx] || new Date().toISOString().split('T')[0]
      });
    });

    return decisions;
  } catch (err) {
    console.error('KVKK kararları çekme hatası:', err);
    return [];
  }
}



