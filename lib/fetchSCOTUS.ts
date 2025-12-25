// ABD Yüksek Mahkemesi (Supreme Court of the United States - SCOTUS) kararlarını çekmek için fonksiyon
export async function fetchSCOTUS(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    // SCOTUS'un resmi sitesinden son kararları çek
    // Supreme Court resmi site: https://www.supremecourt.gov/
    // Opinions sayfası: https://www.supremecourt.gov/opinions/slipopinions/
    
    // Önce opinions sayfasından HTML parse et
    const response = await fetch('https://www.supremecourt.gov/opinions/slipopinions/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('SCOTUS fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const decisions: Array<{ title: string; content: string; date?: string }> = [];

    // HTML parsing - SCOTUS sitesinin yapısına göre
    // Genellikle kararlar tablo veya liste formatında olur
    const titleMatches = html.matchAll(/<a[^>]*href=["']([^"']*pdf[^"']*)["'][^>]*>(.*?)<\/a>/gi);
    const dateMatches = html.matchAll(/<td[^>]*>(.*?)(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(.*?)<\/td>/gi);
    
    let titles: Array<{ title: string; link?: string }> = [];
    let dates: string[] = [];
    
    // PDF linklerinden karar başlıklarını çıkar
    for (const match of titleMatches) {
      const link = match[1];
      const titleText = match[2].replace(/<[^>]*>/g, '').trim();
      if (titleText && link.includes('.pdf')) {
        titles.push({
          title: titleText,
          link: link.startsWith('http') ? link : `https://www.supremecourt.gov${link}`
        });
      }
    }

    // Tarihleri çıkar
    for (const match of dateMatches) {
      const dateStr = match[2].trim();
      if (dateStr && /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(dateStr)) {
        dates.push(dateStr);
      }
    }

    // Alternatif: Daha spesifik pattern'ler dene
    if (titles.length === 0) {
      // Opinion başlıklarını farklı pattern ile ara - "v." veya "versus" içeren başlıklar
      const headingPattern = /<h[23][^>]*>([^<]*(?:v\.|versus)[^<]*)<\/h[23]>/gi;
      const headingMatches = Array.from(html.matchAll(headingPattern));
      for (const match of headingMatches) {
        const title = match[1].replace(/<[^>]*>/g, '').trim();
        if (title && title.length > 10) {
          titles.push({ title });
        }
      }
    }

    // Son 20 kararı al
    titles.slice(0, 20).forEach((item, idx) => {
      decisions.push({
        title: `SCOTUS: ${item.title}`,
        content: item.title + (item.link ? ` (${item.link})` : ''),
        date: dates[idx] || new Date().toISOString().split('T')[0]
      });
    });

    return decisions;
  } catch (err) {
    console.error('SCOTUS kararları çekme hatası:', err);
    return [];
  }
}

