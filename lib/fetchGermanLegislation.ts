// German Legislation Scraper - Gesetze im Internet
// XML formatı kullanarak "as amended" (yürürlükteki güncel) versiyonları çek

import * as cheerio from 'cheerio';
import { cleanLegalTextPreserveStructure } from './textCleaner';

interface GermanLegislation {
  title: string;
  content: string;
  date?: string;
  type: 'bgb' | 'hgb' | 'aktg' | 'stgb' | 'other';
  law_code?: string; // e.g., "BGB", "HGB", "AktG", "StGB"
  paragraph?: string; // e.g., "§ 433" veya "§§ 433-449"
}

/**
 * Alman hukukuna özgü atıf formatını parse et
 * Örn: § 433 BGB, §§ 433-449 BGB
 */
export function parseGermanCitation(text: string): { paragraph?: string; law_code?: string } {
  // § 433 BGB veya §§ 433-449 BGB formatını yakala
  const citationPattern = /(§+)\s*(\d+[a-z]*(-?\d+[a-z]*)?)\s+([A-Z]+)/i;
  const match = text.match(citationPattern);
  
  if (match) {
    return {
      paragraph: `${match[1]} ${match[2]}`,
      law_code: match[4].toUpperCase()
    };
  }
  
  // Sadece paragraf numarası
  const paragraphPattern = /(§+)\s*(\d+[a-z]*(-?\d+[a-z]*)?)/;
  const paraMatch = text.match(paragraphPattern);
  
  if (paraMatch) {
    return {
      paragraph: `${paraMatch[1]} ${paraMatch[2]}`
    };
  }
  
  return {};
}

/**
 * Gesetze im Internet'ten XML formatında kanun çek
 * URL: https://www.gesetze-im-internet.de/
 */
async function fetchGermanLawXML(lawCode: string): Promise<string | null> {
  try {
    // Gesetze im Internet XML endpoint yapısı:
    // https://www.gesetze-im-internet.de/bgb/BGB.xml (örnek)
    // Ancak bazı kanunlar için XML yerine HTML sayfaları olabilir
    const xmlUrl = `https://www.gesetze-im-internet.de/${lawCode.toLowerCase()}/${lawCode.toUpperCase()}.xml`;
    
    const response = await fetch(xmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/xml, text/xml, text/html, */*',
        'Accept-Charset': 'UTF-8'
      }
    });
    
    if (response.ok) {
      const xmlText = await response.text();
      // UTF-8 encoding kontrolü
      if (xmlText.includes('<?xml') || xmlText.includes('<normen') || xmlText.includes('<norm')) {
        return xmlText;
      }
      // HTML formatında da gelebilir
      if (xmlText.includes('<html') || xmlText.includes('§')) {
        return xmlText; // HTML olarak işlenecek
      }
    }
    
    // Fallback: HTML versiyonu (index sayfası)
    const htmlUrl = `https://www.gesetze-im-internet.de/${lawCode.toLowerCase()}/index.html`;
    const htmlResponse = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html, */*',
        'Accept-Charset': 'UTF-8'
      }
    });
    
    if (htmlResponse.ok) {
      const htmlText = await htmlResponse.text();
      // Eğer içinde § işareti varsa (Alman kanun metni), kabul et
      if (htmlText.includes('§') || htmlText.includes('Paragraf')) {
        return htmlText;
      }
    }
    
    // Son fallback: Ana sayfa
    const mainUrl = `https://www.gesetze-im-internet.de/${lawCode.toLowerCase()}/`;
    const mainResponse = await fetch(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html, */*',
        'Accept-Charset': 'UTF-8'
      }
    });
    
    if (mainResponse.ok) {
      return await mainResponse.text();
    }
    
    return null;
  } catch (err) {
    console.error(`German Law XML fetch error for ${lawCode}:`, err);
    return null;
  }
}

/**
 * XML'den Alman kanun içeriğini parse et
 */
function parseGermanLegislationXML(xmlText: string, lawCode: string): string {
  try {
    // Cheerio XML modunda parse et
    const $ = cheerio.load(xmlText, { 
      xmlMode: true,
      decodeEntities: true // UTF-8 karakterler için
    });
    
    let fullText = '';
    
    // Gesetze im Internet XML yapısı genellikle şu şekildedir:
    // <normen><norm><textdaten><text></text></textdaten></norm></normen>
    // Veya <norm><metadaten><titel></titel></metadaten><textdaten><text></text></textdaten></norm>
    
    // Norm elementlerini bul
    $('norm').each((i, elem) => {
      const $norm = $(elem);
      
      // Titel (Başlık)
      const titel = $norm.find('titel').first().text().trim();
      if (titel) {
        fullText += `\n\n[${titel}]\n`;
      }
      
      // Paragraf numarası
      const nummer = $norm.find('nummer, enbez, gliederungseinheit').first().text().trim();
      if (nummer) {
        const citation = parseGermanCitation(nummer);
        if (citation.paragraph) {
          fullText += `${citation.paragraph} ${lawCode}\n`;
        }
      }
      
      // Text (Madde metni)
      const text = $norm.find('text, textdaten text').text().trim();
      if (text && text.length > 10) {
        // Umlauts ve özel karakterleri koru
        fullText += text + '\n';
      }
      
      // Absatz (Fıkra) ve Satz (Cümle) yapısını koru
      $norm.find('absatz, satz').each((j, subElem) => {
        const subText = $(subElem).text().trim();
        if (subText && subText.length > 5) {
          fullText += `  ${subText}\n`;
        }
      });
    });
    
    // Eğer XML yapısı farklıysa, tüm metni çıkar
    if (!fullText || fullText.trim().length < 100) {
      $('*').each((i, elem) => {
        const text = $(elem).text().trim();
        // Umlauts içeren satırları filtrele (Almanca karakterler)
        if (text && text.length > 20 && /[äöüßÄÖÜ]/.test(text)) {
          fullText += text + '\n';
        }
      });
    }
    
    // UTF-8 encoding'i koru, temizle
    return cleanLegalTextPreserveStructure(fullText);
  } catch (err) {
    console.error('German Legislation XML parse error:', err);
    // Fallback: raw text extraction (UTF-8 korunarak)
    return xmlText.replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
  }
}

/**
 * HTML'den Alman kanun içeriğini parse et
 */
function parseGermanLegislationHTML(htmlText: string): string {
  try {
    const $ = cheerio.load(htmlText, {
      decodeEntities: true // UTF-8 için
    });
    
    // Gesetze im Internet HTML yapısı genellikle şu şekildedir:
    // <div id="container"> içinde <div class="jnhtml"> içinde içerik
    
    const contentSelectors = [
      '#container',
      '.jnhtml',
      '.jurAbsatz',
      '.jurAbsatzText',
      'main',
      'article',
      '#content'
    ];
    
    let content = '';
    
    for (const selector of contentSelectors) {
      const el = $(selector).first();
      if (el.length > 0) {
        el.find('script, style, nav, header, footer, aside, .ad, .navigation').remove();
        const text = el.text();
        if (text && text.trim().length > 500) {
          // Umlauts kontrolü
          if (/[äöüßÄÖÜ]/.test(text)) {
            content = cleanLegalTextPreserveStructure(text);
            break;
          }
        }
      }
    }
    
    // Paragraf yapısını koru (§ işaretleri)
    content = content.replace(/(§+)\s*(\d+)/g, '\n\n$1 $2\n');
    
    return content;
  } catch (err) {
    console.error('German Legislation HTML parse error:', err);
    return '';
  }
}

/**
 * Temel Alman kanunlarını çek (BGB, HGB, AktG, StGB)
 */
export async function fetchGermanLegislation(limit: number = 20): Promise<Array<{ title: string; content: string; date?: string }>> {
  const allLegislation: GermanLegislation[] = [];
  
  // Temel kanunlar
  const lawCodes = ['BGB', 'HGB', 'AktG', 'StGB'];
  const lawNames: Record<string, string> = {
    'BGB': 'Bürgerliches Gesetzbuch (Medeni Kanun)',
    'HGB': 'Handelsgesetzbuch (Ticaret Kanunu)',
    'AktG': 'Aktiengesetz (Anonim Şirketler Kanunu)',
    'StGB': 'Strafgesetzbuch (Ceza Kanunu)'
  };
  
  for (const lawCode of lawCodes) {
    try {
      // XML'den çek (tercih edilen)
      const xmlContent = await fetchGermanLawXML(lawCode);
      
      if (xmlContent) {
        let content = '';
        let title = `${lawCode}: ${lawNames[lawCode]}`;
        
        if (xmlContent.trim().startsWith('<') || xmlContent.includes('<?xml')) {
          // XML formatı
          content = parseGermanLegislationXML(xmlContent, lawCode);
        } else {
          // HTML formatı
          content = parseGermanLegislationHTML(xmlContent);
        }
        
        if (content && content.length > 200) {
          // Paragraf bazlı chunking için metadata ekle
          const paragraphs = content.match(/§+\s*\d+/g) || [];
          const firstParagraph = paragraphs[0] || '';
          const lastParagraph = paragraphs[paragraphs.length - 1] || '';
          
          allLegislation.push({
            title: title,
            content: content,
            date: new Date().toISOString().split('T')[0],
            type: lawCode.toLowerCase() as any,
            law_code: lawCode,
            paragraph: paragraphs.length > 0 ? `${firstParagraph}${lastParagraph !== firstParagraph ? '-' + lastParagraph : ''}` : undefined
          });
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`German Law ${lawCode} fetch error:`, err);
    }
  }
  
  return allLegislation.map(item => ({
    title: item.title,
    content: item.content,
    date: item.date
  }));
}

