// OpenJurist'ten mahkeme kararlarını çekmek için fonksiyon
// OpenJurist: https://openjurist.org/
export async function fetchOpenJurist(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    // OpenJurist sitesinden son kararları çek
    const response = await fetch('https://openjurist.org/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('OpenJurist fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const decisions: Array<{ title: string; content: string; date?: string }> = [];

    // HTML parsing - OpenJurist sitesinin yapısına göre
    // Genellikle case başlıkları ve linkler olur
    const titleMatches = html.matchAll(/<a[^>]*href=["']([^"']*case[^"']*|/[^"']*)["'][^>]*>(.*?)<\/a>/gi);
    const dateMatches = html.matchAll(/<time[^>]*>(.*?)<\/time>|<span[^>]*class=["'][^"']*date[^"']*["'][^>]*>(.*?)<\/span>/gi);
    
    let titles: Array<{ title: string; link?: string }> = [];
    let dates: string[] = [];
    
    // Case başlıklarını çıkar
    for (const match of titleMatches) {
      const link = match[1];
      const titleText = match[2].replace(/<[^>]*>/g, '').trim();
      if (titleText && titleText.length > 10 && 
          !titleText.toLowerCase().includes('openjurist') &&
          !titleText.toLowerCase().includes('home') &&
          !titleText.toLowerCase().includes('about')) {
        titles.push({
          title: titleText,
          link: link.startsWith('http') ? link : `https://openjurist.org${link}`
        });
      }
    }

    // Tarihleri çıkar
    for (const match of dateMatches) {
      const dateStr = (match[1] || match[2]).replace(/<[^>]*>/g, '').trim();
      if (dateStr && /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(dateStr)) {
        dates.push(dateStr);
      }
    }

    // Alternatif: Daha spesifik pattern'ler dene
    if (titles.length === 0) {
      // Case başlıklarını farklı pattern ile ara
      const caseMatches = html.matchAll(/<h[23][^>]*>(.*?)(?:v\.|v\.|versus)(.*?)<\/h[23]>/gi);
      for (const match of caseMatches) {
        const title = `${match[1].trim()} v. ${match[2].trim()}`;
        if (title.length > 10) {
          titles.push({ title });
        }
      }
    }

    // Son 20 kararı al
    titles.slice(0, 20).forEach((item, idx) => {
      decisions.push({
        title: `OpenJurist: ${item.title}`,
        content: item.title + (item.link ? ` (${item.link})` : ''),
        date: dates[idx] || new Date().toISOString().split('T')[0]
      });
    });

    return decisions;
  } catch (err) {
    console.error('OpenJurist kararları çekme hatası:', err);
    return [];
  }
}

