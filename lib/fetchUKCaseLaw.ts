// UK Case Law Scraper - The National Archives (Caselaw)
// High Court ve Court of Appeal kararlarına erişim

import * as cheerio from 'cheerio';
import { cleanLegalTextPreserveStructure } from './textCleaner';

interface UKCase {
  title: string;
  content: string;
  date?: string;
  court: 'High Court' | 'Court of Appeal' | 'Supreme Court' | 'Other';
  jurisdiction?: 'England & Wales' | 'Scotland' | 'Northern Ireland' | 'UK';
  neutral_citation?: string; // e.g., [2024] EWHC 123 (Admin)
  court_name?: string;
}

/**
 * The National Archives Caselaw'dan High Court kararlarını çek
 * URL: https://caselaw.nationalarchives.gov.uk/
 */
async function fetchHighCourtCases(limit: number = 20): Promise<UKCase[]> {
  const cases: UKCase[] = [];
  
  try {
    // Caselaw search endpoint
    // The National Archives Caselaw genellikle şu yapıda:
    // - Search API: https://caselaw.nationalarchives.gov.uk/api/search
    // - Individual case: https://caselaw.nationalarchives.gov.uk/cases/{id}
    
    // HTML scraping approach (API varsa öncelik verilir)
    const searchUrl = 'https://caselaw.nationalarchives.gov.uk/';
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Case links'i bul
      // Genellikle <a href="/cases/..."> formatında
      $('a[href*="/cases/"], a[href*="/judgments/"]').each((i, elem) => {
        if (cases.length >= limit) return false;
        
        const href = $(elem).attr('href');
        const title = $(elem).text().trim();
        
        // High Court veya Court of Appeal referansı var mı?
        const isHighCourt = title.match(/High Court|\[.*\]\s*EWHC|EWHC/i);
        const isCourtOfAppeal = title.match(/Court of Appeal|\[.*\]\s*EWCA|EWCA/i);
        
        if (href && title && (isHighCourt || isCourtOfAppeal)) {
          const caseUrl = href.startsWith('http') ? href : `https://caselaw.nationalarchives.gov.uk${href}`;
          
          cases.push({
            title: title,
            content: title, // İçerik sonra çekilecek
            court: isHighCourt ? 'High Court' : 'Court of Appeal',
            neutral_citation: title.match(/\[[\d\s]+\]\s*[A-Z]+/)?.[0] || undefined
          });
        }
      });
      
      // Her case'in detayını çek
      for (const caseItem of cases.slice(0, Math.min(10, limit))) {
        try {
          if (caseItem.title.match(/cases|judgments/)) {
            // Case URL'i oluştur (eğer full URL değilse)
            const caseUrl = caseItem.title.includes('http') 
              ? caseItem.title 
              : `https://caselaw.nationalarchives.gov.uk${caseItem.title}`;
            
            const caseResponse = await fetch(caseUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (caseResponse.ok) {
              const caseHtml = await caseResponse.text();
              const $case = cheerio.load(caseHtml);
              
              // Case content'ini çek
              const contentSelectors = [
                '.judgment-content',
                '.judgment-body',
                '#judgment',
                '.content',
                'main',
                'article',
                '[role="main"]'
              ];
              
              for (const selector of contentSelectors) {
                const contentEl = $case(selector).first();
                if (contentEl.length > 0) {
                  contentEl.find('script, style, nav, header, footer, aside, .ad').remove();
                  const content = contentEl.text();
                  if (content && content.trim().length > 500) {
                    caseItem.content = cleanLegalTextPreserveStructure(content);
                    
                    // Jurisdiction tespiti
                    const contentUpper = content.toUpperCase();
                    if (contentUpper.includes('SCOTLAND') || contentUpper.includes('SCOTS LAW')) {
                      caseItem.jurisdiction = 'Scotland';
                    } else if (contentUpper.includes('NORTHERN IRELAND') || contentUpper.includes('NI ')) {
                      caseItem.jurisdiction = 'Northern Ireland';
                    } else if (contentUpper.includes('ENGLAND') || contentUpper.includes('WALES')) {
                      caseItem.jurisdiction = 'England & Wales';
                    } else {
                      caseItem.jurisdiction = 'UK';
                    }
                    
                    // Court name extraction
                    const courtMatch = content.match(/(High Court|Court of Appeal|Supreme Court|House of Lords)/i);
                    if (courtMatch) {
                      caseItem.court_name = courtMatch[1];
                      if (courtMatch[1].toLowerCase().includes('high court')) {
                        caseItem.court = 'High Court';
                      } else if (courtMatch[1].toLowerCase().includes('court of appeal')) {
                        caseItem.court = 'Court of Appeal';
                      } else if (courtMatch[1].toLowerCase().includes('supreme')) {
                        caseItem.court = 'Supreme Court';
                      }
                    }
                    
                    // Date extraction
                    const dateMatch = content.match(/(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i);
                    if (dateMatch) {
                      try {
                        const date = new Date(dateMatch[1]);
                        caseItem.date = date.toISOString().split('T')[0];
                      } catch {}
                    }
                    
                    break;
                  }
                }
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.error('UK Case detail fetch error:', err);
        }
      }
    }
  } catch (err) {
    console.error('UK High Court cases fetch error:', err);
  }
  
  return cases.filter(c => c.content && c.content.length > 200);
}

/**
 * Court of Appeal kararlarını çek
 */
async function fetchCourtOfAppealCases(limit: number = 20): Promise<UKCase[]> {
  const cases: UKCase[] = [];
  
  try {
    // Court of Appeal için özel arama
    const searchUrl = 'https://caselaw.nationalarchives.gov.uk/search?court=court-of-appeal';
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('a[href*="/cases/"], a[href*="/judgments/"]').each((i, elem) => {
        if (cases.length >= limit) return false;
        
        const href = $(elem).attr('href');
        const title = $(elem).text().trim();
        const isCourtOfAppeal = title.match(/Court of Appeal|\[.*\]\s*EWCA|EWCA/i);
        
        if (href && title && isCourtOfAppeal) {
          cases.push({
            title: title,
            content: title,
            court: 'Court of Appeal',
            neutral_citation: title.match(/\[[\d\s]+\]\s*[A-Z]+/)?.[0] || undefined
          });
        }
      });
      
      // Detayları çek (High Court ile aynı mantık)
      for (const caseItem of cases.slice(0, Math.min(10, limit))) {
        try {
          const caseUrl = caseItem.title.includes('http') 
            ? caseItem.title 
            : `https://caselaw.nationalarchives.gov.uk${caseItem.title}`;
          
          const caseResponse = await fetch(caseUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (caseResponse.ok) {
            const caseHtml = await caseResponse.text();
            const $case = cheerio.load(caseHtml);
            
            const contentSelectors = [
              '.judgment-content',
              '.judgment-body',
              '#judgment',
              '.content',
              'main',
              'article'
            ];
            
            for (const selector of contentSelectors) {
              const contentEl = $case(selector).first();
              if (contentEl.length > 0) {
                contentEl.find('script, style, nav, header, footer, aside').remove();
                const content = contentEl.text();
                if (content && content.trim().length > 500) {
                  caseItem.content = cleanLegalTextPreserveStructure(content);
                  
                  // Jurisdiction tespiti
                  const contentUpper = content.toUpperCase();
                  if (contentUpper.includes('SCOTLAND')) {
                    caseItem.jurisdiction = 'Scotland';
                  } else if (contentUpper.includes('NORTHERN IRELAND')) {
                    caseItem.jurisdiction = 'Northern Ireland';
                  } else {
                    caseItem.jurisdiction = 'England & Wales';
                  }
                  
                  break;
                }
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error('UK Court of Appeal case detail fetch error:', err);
        }
      }
    }
  } catch (err) {
    console.error('UK Court of Appeal cases fetch error:', err);
  }
  
  return cases.filter(c => c.content && c.content.length > 200);
}

/**
 * Ana fonksiyon - UK Case Law çek
 */
export async function fetchUKCaseLaw(limit: number = 20): Promise<Array<{ title: string; content: string; date?: string }>> {
  const allCases: UKCase[] = [];
  
  try {
    // High Court cases
    const highCourtCases = await fetchHighCourtCases(Math.floor(limit / 2));
    allCases.push(...highCourtCases);
    
    // Court of Appeal cases
    const courtOfAppealCases = await fetchCourtOfAppealCases(Math.floor(limit / 2));
    allCases.push(...courtOfAppealCases);
    
    return allCases.map(item => ({
      title: item.title,
      content: item.content,
      date: item.date
    }));
  } catch (err) {
    console.error('UK Case Law fetch error:', err);
    return [];
  }
}

/**
 * UK Case metadata'sını döndür (jurisdiction, court, citation)
 */
export function getUKCaseMetadata(caseTitle: string, caseContent: string): {
  court: string;
  jurisdiction?: string;
  neutral_citation?: string;
} {
  const contentUpper = caseContent.toUpperCase();
  const titleUpper = caseTitle.toUpperCase();
  
  // Jurisdiction tespiti
  let jurisdiction: string | undefined;
  if (contentUpper.includes('SCOTLAND') || titleUpper.includes('SCOTLAND') || titleUpper.includes('SCOTS')) {
    jurisdiction = 'Scotland';
  } else if (contentUpper.includes('NORTHERN IRELAND') || titleUpper.includes('NORTHERN IRELAND') || titleUpper.includes('NI ')) {
    jurisdiction = 'Northern Ireland';
  } else if (contentUpper.includes('ENGLAND') || contentUpper.includes('WALES') || titleUpper.includes('ENGLAND') || titleUpper.includes('WALES')) {
    jurisdiction = 'England & Wales';
  } else {
    jurisdiction = 'UK';
  }
  
  // Court tespiti
  let court = 'Other';
  if (titleUpper.match(/HIGH COURT|EWHC/)) {
    court = 'High Court';
  } else if (titleUpper.match(/COURT OF APPEAL|EWCA/)) {
    court = 'Court of Appeal';
  } else if (titleUpper.match(/SUPREME COURT|UKSC/)) {
    court = 'Supreme Court';
  }
  
  // Neutral citation
  const citationMatch = caseTitle.match(/\[[\d\s]+\]\s*([A-Z]+)/);
  const neutral_citation = citationMatch ? citationMatch[0] : undefined;
  
  return {
    court,
    jurisdiction,
    neutral_citation
  };
}

