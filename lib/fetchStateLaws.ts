// Eyalet Bazlı Yasal Veri Kaynakları - New York, California, Delaware
// Ticaret hukuku için kritik eyaletler
import * as cheerio from 'cheerio';
import { cleanLegalTextPreserveStructure } from './textCleaner';

type State = 'ny' | 'ca' | 'de';

interface StateLaw {
  title: string;
  content: string;
  date?: string;
  state: State;
}

// New York State Laws
async function fetchNewYorkLaws(): Promise<StateLaw[]> {
  const laws: StateLaw[] = [];
  
  try {
    // NY State Senate / Assembly Bills
    const url = 'https://www.nysenate.gov/legislation/bills';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('a[href*="/legislation/bills/"], a[href*="/legislation/laws/"]').each((_, el) => {
        if (laws.length >= 15) return false;
        
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        
        if (href && title && title.length > 10) {
          const fullUrl = href.startsWith('http') ? href : `https://www.nysenate.gov${href}`;
          
          laws.push({
            title: `NY State: ${title}`,
            content: title,
            date: new Date().toISOString().split('T')[0],
            state: 'ny'
          });
        }
      });
      
      // Detay sayfalarından tam metin çek
      for (const law of laws.slice(0, 10)) {
        try {
          const titleMatch = law.title.match(/NY State: (.*)/);
          if (titleMatch) {
            // URL'i yeniden oluştur (basitleştirilmiş)
            const detailUrl = `https://www.nysenate.gov/legislation/bills/${new Date().getFullYear()}`;
            const detailResp = await fetch(detailUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (detailResp.ok) {
              const detailHtml = await detailResp.text();
              const $detail = cheerio.load(detailHtml);
              
              const contentEl = $detail('#content, .content, main, article').first();
              if (contentEl.length > 0) {
                contentEl.find('script, style, nav, header, footer, aside').remove();
                const content = cleanLegalTextPreserveStructure(contentEl.text());
                if (content && content.length > 200) {
                  law.content = content;
                }
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error('NY law detail fetch error:', err);
        }
      }
    }
  } catch (err) {
    console.error('NY State laws fetch error:', err);
  }
  
  return laws;
}

// California State Laws
async function fetchCaliforniaLaws(): Promise<StateLaw[]> {
  const laws: StateLaw[] = [];
  
  try {
    // CA Legislative Information
    const url = 'https://leginfo.legislature.ca.gov/faces/billSearchClient.xhtml';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('a[href*="bill"], a[href*="law"]').each((_, el) => {
        if (laws.length >= 15) return false;
        
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        
        if (href && title && title.length > 10) {
          laws.push({
            title: `CA State: ${title}`,
            content: title,
            date: new Date().toISOString().split('T')[0],
            state: 'ca'
          });
        }
      });
    }
  } catch (err) {
    console.error('CA State laws fetch error:', err);
  }
  
  return laws;
}

// Delaware State Laws (Ticaret hukuku için kritik)
async function fetchDelawareLaws(): Promise<StateLaw[]> {
  const laws: StateLaw[] = [];
  
  try {
    // DE General Assembly
    const url = 'https://legis.delaware.gov/';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Delaware Corporation Law özellikle önemli
      $('a[href*="bill"], a[href*="law"], a[href*="code"]').each((_, el) => {
        if (laws.length >= 15) return false;
        
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        
        if (href && title && title.length > 10) {
          const fullUrl = href.startsWith('http') ? href : `https://legis.delaware.gov${href}`;
          
          laws.push({
            title: `DE State: ${title}`,
            content: title,
            date: new Date().toISOString().split('T')[0],
            state: 'de'
          });
        }
      });
    }
  } catch (err) {
    console.error('DE State laws fetch error:', err);
  }
  
  return laws;
}

// Ana fonksiyon - Tüm eyaletleri çek
export async function fetchStateLaws(states: State[] = ['ny', 'ca', 'de']): Promise<Array<{ title: string; content: string; date?: string }>> {
  const allLaws: StateLaw[] = [];
  
  for (const state of states) {
    try {
      let laws: StateLaw[] = [];
      
      switch (state) {
        case 'ny':
          laws = await fetchNewYorkLaws();
          break;
        case 'ca':
          laws = await fetchCaliforniaLaws();
          break;
        case 'de':
          laws = await fetchDelawareLaws();
          break;
      }
      
      allLaws.push(...laws);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`State laws fetch error for ${state}:`, err);
    }
  }
  
  return allLaws.map(law => ({
    title: law.title,
    content: law.content,
    date: law.date
  }));
}

