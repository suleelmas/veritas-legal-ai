export async function fetchResmiGazeteHeadlines(): Promise<string[]> {
  // Gerçek RSS'den başlık çek — prod/testte gerçek veriye bakmak için
  try {
    const resp = await fetch('https://www.resmigazete.gov.tr/rss.aspx');
    const xml = await resp.text();
    // Basit XML oynama — sade başlıklar
    const matches = Array.from(xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g));
    const allTitles = matches.map(m => m[1]).filter(t => t && !t.toLowerCase().includes("resmî gazete rss"));
    return allTitles.slice(0, 20);
  } catch (err) {
    console.error('RSS çekmede hata:', err);
    return [];
  }
}










