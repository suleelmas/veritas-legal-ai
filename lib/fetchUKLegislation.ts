// UK Legislation Scraper - legislation.gov.uk
// XML formatı kullanarak "as amended" (yürürlükteki en güncel) versiyonları çek

import * as cheerio from 'cheerio';
import { cleanLegalTextPreserveStructure } from './textCleaner';

interface UKLegislation {
  title: string;
  content: string;
  date?: string;
  type: 'act' | 'si'; // Act veya Statutory Instrument
  year?: number;
  chapter?: string; // e.g., "c. 45" for Act, "SI 2024/123" for SI
  jurisdiction?: 'England & Wales' | 'Scotland' | 'Northern Ireland' | 'UK';
  retained_eu_law?: boolean; // Brexit sonrası Retained EU Law kontrolü
}

/**
 * UK Legislation.gov.uk'den XML veya HTML formatında yasaları çek
 * Öncelik: XML (structured data), Fallback: HTML scraping
 */
async function fetchUKActXML(actYear: number, actChapter: string): Promise<string | null> {
  try {
    // XML endpoint: https://www.legislation.gov.uk/ukpga/{year}/{chapter}/data.xml
    const xmlUrl = `https://www.legislation.gov.uk/ukpga/${actYear}/${actChapter}/data.xml`;
    
    const response = await fetch(xmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/xml, text/xml, */*'
      }
    });
    
    if (response.ok) {
      const xmlText = await response.text();
      // XML içinde "as amended" bilgisi ve güncel versiyon kontrolü
      if (xmlText.includes('version') || xmlText.includes('amended')) {
        return xmlText;
      }
    }
    
    // Fallback: As amended HTML versiyonu
    const htmlUrl = `https://www.legislation.gov.uk/ukpga/${actYear}/${actChapter}/contents`;
    const htmlResponse = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (htmlResponse.ok) {
      return await htmlResponse.text();
    }
    
    return null;
  } catch (err) {
    console.error('UK Act XML fetch error:', err);
    return null;
  }
}

/**
 * XML'den "as amended" içeriği parse et
 */
function parseUKLegislationXML(xmlText: string): string {
  try {
    const $ = cheerio.load(xmlText, { xmlMode: true });
    
    // UK Legislation XML yapısı genellikle şu şekildedir:
    // <Legislation><Body>...</Body></Legislation>
    // Veya <Primary>...</Primary> gibi
    
    // Tüm metin içeriğini çıkar
    $('script, style, meta, link').remove();
    
    // Section, Part, Chapter gibi yapısal elementleri koru
    const contentSelectors = [
      'Body',
      'Primary',
      'P1Body',
      'P1group',
      'Section',
      'Part',
      'Chapter',
      'Schedule',
      'P'
    ];
    
    let fullText = '';
    
    for (const selector of contentSelectors) {
      $(selector).each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && text.length > 10) {
          // Yapısal başlıkları koru
          const num = $(elem).attr('Number') || $(elem).attr('id');
          if (num) {
            fullText += `\n[${selector} ${num}]\n`;
          }
          fullText += text + '\n\n';
        }
      });
    }
    
    // Eğer XML'den içerik çıkmadıysa, tüm metni al
    if (!fullText || fullText.trim().length < 100) {
      $('*').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && text.length > 20 && !text.match(/^(xmlns|http|www\.)/i)) {
          fullText += text + '\n';
        }
      });
    }
    
    return cleanLegalTextPreserveStructure(fullText);
  } catch (err) {
    console.error('UK Legislation XML parse error:', err);
    // Fallback: raw text extraction
    return xmlText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * HTML'den "as amended" içeriği parse et
 */
function parseUKLegislationHTML(htmlText: string): string {
  try {
    const $ = cheerio.load(htmlText);
    
    // legislation.gov.uk'de "as amended" versiyonu genellikle:
    // - .LegContents veya #LegContents içinde
    // - .LegText içinde
    // - main içeriğinde
    
    // Önce "as amended" versiyonunun linkini bul
    const asAmendedLink = $('a[href*="amended"], a:contains("as amended"), a:contains("current")').first().attr('href');
    
    // Eğer as amended linki varsa, onu çek
    if (asAmendedLink) {
      // Relative URL ise base URL ekle
      const fullUrl = asAmendedLink.startsWith('http') 
        ? asAmendedLink 
        : `https://www.legislation.gov.uk${asAmendedLink}`;
      
      // Bu URL'den içeriği çekmek için recursive call yapılabilir
      // Şimdilik mevcut sayfadaki içeriği parse ediyoruz
    }
    
    // İçerik seçicileri
    const contentSelectors = [
      '.LegContents',
      '#LegContents',
      '.LegText',
      '#LegText',
      'main',
      'article',
      '.content',
      '#content',
      '[role="main"]'
    ];
    
    let content = '';
    
    for (const selector of contentSelectors) {
      const el = $(selector).first();
      if (el.length > 0) {
        el.find('script, style, nav, header, footer, aside, .ad, .navigation, .breadcrumb').remove();
        const text = el.text();
        if (text && text.trim().length > 500) {
          content = cleanLegalTextPreserveStructure(text);
          break;
        }
      }
    }
    
    // Eğer hala içerik yoksa, body'den çek
    if (!content || content.length < 500) {
      $('body').find('script, style, nav, header, footer, aside, .ad').remove();
      content = cleanLegalTextPreserveStructure($('body').text());
    }
    
    return content;
  } catch (err) {
    console.error('UK Legislation HTML parse error:', err);
    return '';
  }
}

/**
 * Son UK Acts'leri çek (en güncel 20 tanesini)
 */
async function fetchRecentUKActs(limit: number = 20): Promise<UKLegislation[]> {
  const acts: UKLegislation[] = [];
  
  try {
    // UK Acts listesi: https://www.legislation.gov.uk/ukpga
    // RSS feed veya HTML scraping
    const url = 'https://www.legislation.gov.uk/uksi';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // UK Acts listesini bul
      // Genellikle <ul class="results"> veya benzeri yapıda
      $('a[href*="/ukpga/"]').each((i, elem) => {
        if (acts.length >= limit) return false;
        
        const href = $(elem).attr('href');
        const title = $(elem).text().trim();
        
        if (href && title && title.length > 10) {
          // URL'den year ve chapter çıkar
          // Örn: /ukpga/2024/45 -> year=2024, chapter=45
          const match = href.match(/ukpga\/(\d{4})\/(\d+)/);
          if (match) {
            const year = parseInt(match[1]);
            const chapter = match[2];
            
            acts.push({
              title: `UK Act ${year}/${chapter}: ${title}`,
              content: title, // İçerik sonra çekilecek
              date: `${year}-01-01`,
              type: 'act',
              year,
              chapter
            });
          }
        }
      });
    }
  } catch (err) {
    console.error('UK Acts list fetch error:', err);
  }
  
  // Her Act'in "as amended" versiyonunu çek
  for (const act of acts.slice(0, Math.min(10, limit))) {
    try {
      // XML'den çek (tercih edilen)
      const xmlContent = await fetchUKActXML(act.year!, act.chapter!);
      
      if (xmlContent) {
        if (xmlContent.trim().startsWith('<')) {
          // XML formatı
          act.content = parseUKLegislationXML(xmlContent);
        } else {
          // HTML formatı
          act.content = parseUKLegislationHTML(xmlContent);
        }
      } else {
        // Fallback: HTML scraping
        const htmlUrl = `https://www.legislation.gov.uk/ukpga/${act.year}/${act.chapter}/contents`;
        const htmlResponse = await fetch(htmlUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (htmlResponse.ok) {
          const html = await htmlResponse.text();
          act.content = parseUKLegislationHTML(html);
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`UK Act ${act.year}/${act.chapter} fetch error:`, err);
    }
  }
  
  return acts.filter(act => act.content && act.content.length > 200);
}

/**
 * Son UK Statutory Instruments (SI) çek
 */
async function fetchRecentUKSIs(limit: number = 20): Promise<UKLegislation[]> {
  const sis: UKLegislation[] = [];
  
  try {
    // UK SI listesi: https://www.legislation.gov.uk/uksi
    const url = 'https://www.legislation.gov.uk/uksi';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('a[href*="/uksi/"]').each((i, elem) => {
        if (sis.length >= limit) return false;
        
        const href = $(elem).attr('href');
        const title = $(elem).text().trim();
        
        if (href && title && title.length > 10) {
          // URL'den year ve number çıkar
          // Örn: /uksi/2024/123 -> year=2024, number=123
          const match = href.match(/uksi\/(\d{4})\/(\d+)/);
          if (match) {
            const year = parseInt(match[1]);
            const number = match[2];
            
            sis.push({
              title: `UK SI ${year}/${number}: ${title}`,
              content: title, // İçerik sonra çekilecek
              date: `${year}-01-01`,
              type: 'si',
              year,
              chapter: number
            });
          }
        }
      });
    }
  } catch (err) {
    console.error('UK SI list fetch error:', err);
  }
  
  // Her SI'nin "as amended" versiyonunu çek
  for (const si of sis.slice(0, Math.min(10, limit))) {
    try {
      // SI için XML endpoint: https://www.legislation.gov.uk/uksi/{year}/{number}/data.xml
      const xmlUrl = `https://www.legislation.gov.uk/uksi/${si.year}/${si.chapter}/data.xml`;
      const xmlResponse = await fetch(xmlUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/xml, text/xml, */*'
        }
      });
      
      if (xmlResponse.ok) {
        const xmlText = await xmlResponse.text();
        si.content = parseUKLegislationXML(xmlText);
      } else {
        // Fallback: HTML
        const htmlUrl = `https://www.legislation.gov.uk/uksi/${si.year}/${si.chapter}/contents`;
        const htmlResponse = await fetch(htmlUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (htmlResponse.ok) {
          const html = await htmlResponse.text();
          si.content = parseUKLegislationHTML(html);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`UK SI ${si.year}/${si.chapter} fetch error:`, err);
    }
  }
  
  return sis.filter(si => si.content && si.content.length > 200);
}

/**
 * Jurisdiction tespiti (England & Wales, Scotland, Northern Ireland)
 */
function detectJurisdiction(title: string, content: string): 'England & Wales' | 'Scotland' | 'Northern Ireland' | 'UK' {
  const combined = (title + ' ' + content).toUpperCase();
  
  // Scotland
  if (combined.includes('SCOTLAND') || combined.includes('SCOTS LAW') || combined.includes('SCOTTISH')) {
    return 'Scotland';
  }
  
  // Northern Ireland
  if (combined.includes('NORTHERN IRELAND') || combined.includes('NI ') || combined.includes('NORTHERN IRISH')) {
    return 'Northern Ireland';
  }
  
  // England & Wales (default for UK-wide legislation unless specified)
  if (combined.includes('ENGLAND') || combined.includes('WALES') || combined.includes('ENGLISH')) {
    return 'England & Wales';
  }
  
  // UK-wide (default)
  return 'UK';
}

/**
 * Retained EU Law kontrolü (Brexit sonrası)
 */
function checkRetainedEULaw(title: string, content: string): boolean {
  const combined = (title + ' ' + content).toUpperCase();
  
  // Retained EU Law işaretleri
  const indicators = [
    'RETAINED EU LAW',
    'EU RETAINED',
    'EU EXIT',
    'BREXIT',
    'EU (WITHDRAWAL)',
    'EU WITHDRAWAL ACT',
    'REGULATION (EU)',
    'DIRECTIVE',
    'EUROPEAN UNION'
  ];
  
  return indicators.some(indicator => combined.includes(indicator));
}

/**
 * Ana fonksiyon - UK Legislation çek
 */
export async function fetchUKLegislation(limit: number = 20): Promise<Array<{ title: string; content: string; date?: string }>> {
  const allLegislation: UKLegislation[] = [];
  
  try {
    // UK Acts çek
    const acts = await fetchRecentUKActs(Math.floor(limit / 2));
    allLegislation.push(...acts);
    
    // UK SIs çek
    const sis = await fetchRecentUKSIs(Math.floor(limit / 2));
    allLegislation.push(...sis);
    
    // Her bir item için jurisdiction ve retained EU law kontrolü yap
    for (const item of allLegislation) {
      item.jurisdiction = detectJurisdiction(item.title, item.content);
      item.retained_eu_law = checkRetainedEULaw(item.title, item.content);
    }
    
    return allLegislation.map(item => ({
      title: item.title,
      content: item.content,
      date: item.date,
      // Metadata için ekstra bilgiler (return type genişletilebilir)
      jurisdiction: item.jurisdiction,
      retained_eu_law: item.retained_eu_law
    }));
  } catch (err) {
    console.error('UK Legislation fetch error:', err);
    return [];
  }
}

