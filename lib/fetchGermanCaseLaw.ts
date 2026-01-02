// German Case Law Scraper - Rechtsprechung im Internet
// BGH (Federal Court) ve BVerfG (Federal Constitutional Court) kararları

import * as cheerio from 'cheerio';
import { cleanLegalTextPreserveStructure } from './textCleaner';

interface GermanCase {
  title: string;
  content: string;
  date?: string;
  court: 'BGH' | 'BVerfG' | 'Other';
  case_number?: string; // e.g., "I ZR 123/20"
  leitsatz?: string; // Özet (Leitsatz)
  gruende?: string; // Gerekçe (Gründe) - tam metin
}

/**
 * Rechtsprechung im Internet'ten BGH kararlarını çek
 * URL: https://www.rechtsprechung-im-internet.de/
 */
async function fetchBGHCases(limit: number = 20): Promise<GermanCase[]> {
  const cases: GermanCase[] = [];
  
  try {
    // BGH kararları için search endpoint
    // Rechtsprechung im Internet genellikle şu yapıda:
    // - Search: https://www.rechtsprechung-im-internet.de/jportal/...
    // - Individual case: https://www.rechtsprechung-im-internet.de/jportal/...
    
    // HTML scraping approach
    const searchUrl = 'https://www.rechtsprechung-im-internet.de/jportal/?quelle=jlink&query=BGH&psml=bsjrsprod.psml&max=true';
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Charset': 'UTF-8'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Case links'i bul
      $('a[href*="/jportal/"], a[href*="gericht=BGH"]').each((i, elem) => {
        if (cases.length >= limit) return false;
        
        const href = $(elem).attr('href');
        const title = $(elem).text().trim();
        
        // BGH referansı var mı?
        const isBGH = title.match(/BGH|Bundesgerichtshof/i) || href?.includes('gericht=BGH');
        
        if (href && title && isBGH) {
          const caseUrl = href.startsWith('http') ? href : `https://www.rechtsprechung-im-internet.de${href}`;
          
          cases.push({
            title: title,
            content: title, // İçerik sonra çekilecek
            court: 'BGH',
            case_number: title.match(/([IVX]+)\s*ZR?\s*\d+\/\d+/)?.[0] || undefined
          });
        }
      });
      
      // Her case'in detayını çek
      for (const caseItem of cases.slice(0, Math.min(10, limit))) {
        try {
          // Case URL'i oluştur
          const caseResponse = await fetch(caseItem.title.includes('http') ? caseItem.title : `https://www.rechtsprechung-im-internet.de${caseItem.title}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept-Charset': 'UTF-8'
            }
          });
          
          if (caseResponse.ok) {
            const caseHtml = await caseResponse.text();
            const $case = cheerio.load(caseHtml);
            
            // Leitsatz (Özet) ve Gründe (Gerekçe) bölümlerini bul
            const contentSelectors = [
              '.leitsatz',
              '#leitsatz',
              '.gruende',
              '#gruende',
              '.entscheidung',
              '#entscheidung',
              '.jurAbsatz',
              'main',
              'article',
              '.content'
            ];
            
            let leitsatz = '';
            let gruende = '';
            
            // Leitsatz (Özet) bölümü
            const leitsatzEl = $case('.leitsatz, #leitsatz').first();
            if (leitsatzEl.length > 0) {
              leitsatzEl.find('script, style, nav, header, footer, aside').remove();
              leitsatz = leitsatzEl.text().trim();
              caseItem.leitsatz = leitsatz;
            }
            
            // Gründe (Gerekçe) bölümü - tam metin
            const gruendeEl = $case('.gruende, #gruende, .entscheidung').first();
            if (gruendeEl.length > 0) {
              gruendeEl.find('script, style, nav, header, footer, aside').remove();
              gruende = gruendeEl.text().trim();
              caseItem.gruende = gruende;
            }
            
            // Eğer özel selector'lar bulunamadıysa, genel içerik alanlarından çek
            if (!leitsatz && !gruende) {
              for (const selector of contentSelectors) {
                const contentEl = $case(selector).first();
                if (contentEl.length > 0) {
                  contentEl.find('script, style, nav, header, footer, aside').remove();
                  const content = contentEl.text();
                  if (content && content.trim().length > 500) {
                    // Umlauts kontrolü (Almanca içerik)
                    if (/[äöüßÄÖÜ]/.test(content)) {
                      gruende = cleanLegalTextPreserveStructure(content);
                      break;
                    }
                  }
                }
              }
            }
            
            // Tam metin: Leitsatz + Gründe
            caseItem.content = (leitsatz ? `LEITSATZ (Özet):\n${leitsatz}\n\n` : '') +
                              (gruende ? `GRÜNDE (Gerekçe):\n${gruende}` : '');
            
            // Date extraction
            const dateMatch = caseHtml.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
            if (dateMatch) {
              try {
                const [day, month, year] = dateMatch[1].split('.');
                const date = new Date(`${year}-${month}-${day}`);
                caseItem.date = date.toISOString().split('T')[0];
              } catch {}
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error('BGH Case detail fetch error:', err);
        }
      }
    }
  } catch (err) {
    console.error('BGH cases fetch error:', err);
  }
  
  return cases.filter(c => c.content && c.content.length > 200);
}

/**
 * BVerfG (Federal Constitutional Court) kararlarını çek
 */
async function fetchBVerfGCases(limit: number = 20): Promise<GermanCase[]> {
  const cases: GermanCase[] = [];
  
  try {
    const searchUrl = 'https://www.rechtsprechung-im-internet.de/jportal/?quelle=jlink&query=BVerfG&psml=bsjrsprod.psml&max=true';
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Charset': 'UTF-8'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('a[href*="/jportal/"], a[href*="gericht=BVerfG"]').each((i, elem) => {
        if (cases.length >= limit) return false;
        
        const href = $(elem).attr('href');
        const title = $(elem).text().trim();
        const isBVerfG = title.match(/BVerfG|Bundesverfassungsgericht/i) || href?.includes('gericht=BVerfG');
        
        if (href && title && isBVerfG) {
          cases.push({
            title: title,
            content: title,
            court: 'BVerfG',
            case_number: title.match(/([12]\s*Bv[RLF]\s*\d+\/\d+)/)?.[0] || undefined
          });
        }
      });
      
      // Detayları çek (BGH ile aynı mantık)
      for (const caseItem of cases.slice(0, Math.min(10, limit))) {
        try {
          const caseResponse = await fetch(caseItem.title.includes('http') ? caseItem.title : `https://www.rechtsprechung-im-internet.de${caseItem.title}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept-Charset': 'UTF-8'
            }
          });
          
          if (caseResponse.ok) {
            const caseHtml = await caseResponse.text();
            const $case = cheerio.load(caseHtml);
            
            let leitsatz = '';
            let gruende = '';
            
            const leitsatzEl = $case('.leitsatz, #leitsatz').first();
            if (leitsatzEl.length > 0) {
              leitsatzEl.find('script, style, nav, header, footer, aside').remove();
              leitsatz = leitsatzEl.text().trim();
              caseItem.leitsatz = leitsatz;
            }
            
            const gruendeEl = $case('.gruende, #gruende, .entscheidung').first();
            if (gruendeEl.length > 0) {
              gruendeEl.find('script, style, nav, header, footer, aside').remove();
              gruende = gruendeEl.text().trim();
              caseItem.gruende = gruende;
            }
            
            if (!leitsatz && !gruende) {
              const contentEl = $case('main, article, .content').first();
              if (contentEl.length > 0) {
                contentEl.find('script, style, nav, header, footer, aside').remove();
                const content = contentEl.text();
                if (content && content.trim().length > 500 && /[äöüßÄÖÜ]/.test(content)) {
                  gruende = cleanLegalTextPreserveStructure(content);
                }
              }
            }
            
            caseItem.content = (leitsatz ? `LEITSATZ (Özet):\n${leitsatz}\n\n` : '') +
                              (gruende ? `GRÜNDE (Gerekçe):\n${gruende}` : '');
            
            const dateMatch = caseHtml.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
            if (dateMatch) {
              try {
                const [day, month, year] = dateMatch[1].split('.');
                const date = new Date(`${year}-${month}-${day}`);
                caseItem.date = date.toISOString().split('T')[0];
              } catch {}
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error('BVerfG Case detail fetch error:', err);
        }
      }
    }
  } catch (err) {
    console.error('BVerfG cases fetch error:', err);
  }
  
  return cases.filter(c => c.content && c.content.length > 200);
}

/**
 * Ana fonksiyon - German Case Law çek
 */
export async function fetchGermanCaseLaw(limit: number = 20): Promise<Array<{ title: string; content: string; date?: string }>> {
  const allCases: GermanCase[] = [];
  
  try {
    // BGH cases
    const bghCases = await fetchBGHCases(Math.floor(limit / 2));
    allCases.push(...bghCases);
    
    // BVerfG cases
    const bverfgCases = await fetchBVerfGCases(Math.floor(limit / 2));
    allCases.push(...bverfgCases);
    
    return allCases.map(item => ({
      title: item.title,
      content: item.content,
      date: item.date
    }));
  } catch (err) {
    console.error('German Case Law fetch error:', err);
    return [];
  }
}

/**
 * German Case metadata'sını döndür (court, case_number)
 */
export function getGermanCaseMetadata(caseTitle: string, caseContent: string): {
  court: string;
  case_number?: string;
} {
  const contentUpper = caseTitle.toUpperCase();
  
  // Court tespiti
  let court = 'Other';
  if (contentUpper.includes('BGH') || contentUpper.includes('BUNDESGERICHTSHOF')) {
    court = 'BGH';
  } else if (contentUpper.includes('BVERFG') || contentUpper.includes('BUNDESVERFASSUNGSGERICHT')) {
    court = 'BVerfG';
  }
  
  // Case number extraction
  const bghPattern = /([IVX]+)\s*ZR?\s*(\d+)\/(\d+)/;
  const bverfgPattern = /([12]\s*Bv[RLF]\s*\d+\/\d+)/;
  
  const bghMatch = caseTitle.match(bghPattern);
  const bverfgMatch = caseTitle.match(bverfgPattern);
  
  const case_number = bghMatch ? bghMatch[0] : bverfgMatch ? bverfgMatch[0] : undefined;
  
  return {
    court,
    case_number
  };
}

