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

    // Son 20 kararı al
    titles.slice(0, 20).forEach((title, idx) => {
      decisions.push({
        title: `Anayasa Mahkemesi: ${title}`,
        content: title, // Gerçek implementasyonda karar içeriği de çekilmeli
        date: dates[idx] || new Date().toISOString().split('T')[0]
      });
    });

    return decisions;
  } catch (err) {
    console.error('Anayasa Mahkemesi kararları çekme hatası:', err);
    return [];
  }
}

