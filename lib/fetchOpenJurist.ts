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
    // Daha güvenli pattern kullan - önce tüm linkleri bul, sonra filtrele
    const allLinks = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi) || [];
    const titleMatches: Array<{ link: string; title: string }> = [];
    
    for (const linkTag of allLinks) {
      const hrefMatch = linkTag.match(/href=["']([^"']+)["']/i);
      const textMatch = linkTag.match(/>([^<]+)</);
      
      if (hrefMatch && textMatch) {
        const link = hrefMatch[1];
        const title = textMatch[1].trim();
        
        // Sadece case/opinion/decision içeren veya / ile başlayan linkleri al
        if (link && title && title.length > 10 &&
            (link.toLowerCase().includes('case') || 
             link.toLowerCase().includes('opinion') || 
             link.toLowerCase().includes('decision') ||
             link.startsWith('/'))) {
          titleMatches.push({ link, title });
        }
      }
    }
    
    // Tarihleri bul
    const datePattern = /<time[^>]*>([^<]+)<\/time>|<span[^>]*class=["'][^"']*date[^"']*["'][^>]*>([^<]+)<\/span>/gi;
    const dateMatches = Array.from(html.matchAll(datePattern));
    
    let titles: Array<{ title: string; link?: string }> = [];
    let dates: string[] = [];
    
    // Case başlıklarını filtrele ve ekle
    for (const match of titleMatches) {
      const link = match.link;
      const titleText = match.title.replace(/<[^>]*>/g, '').trim();
      
      if (titleText && titleText.length > 10 &&
          !titleText.toLowerCase().includes('openjurist') &&
          !titleText.toLowerCase().includes('home') &&
          !titleText.toLowerCase().includes('about') &&
          !titleText.toLowerCase().includes('login') &&
          !titleText.toLowerCase().includes('sign')) {
        const fullLink = link.startsWith('http') ? link : `https://openjurist.org${link}`;
        titles.push({
          title: titleText,
          link: fullLink
        });
      }
    }

    // Tarihleri çıkar
    for (const match of dateMatches) {
      const dateStr = (match[1] || match[2] || '').trim();
      if (dateStr && (
        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(dateStr) ||
        /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(dateStr) ||
        /^[A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4}$/.test(dateStr)
      )) {
        dates.push(dateStr);
      }
    }

    // Alternatif: Daha spesifik pattern'ler dene
    if (titles.length === 0) {
      // Case başlıklarını farklı pattern ile ara - "v." veya "versus" içeren başlıklar
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

