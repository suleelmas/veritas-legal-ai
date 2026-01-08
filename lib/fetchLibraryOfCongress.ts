// Library of Congress (LOC) API - Mevzuat takibi
// LOC API: https://www.loc.gov/apis/
import * as cheerio from 'cheerio';
import { cleanLegalTextPreserveStructure } from './textCleaner';

export async function fetchLibraryOfCongress(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    const documents: Array<{ title: string; content: string; date?: string }> = [];
    
    // LOC API endpoint - Congress.gov entegrasyonu
    // LOC Congress API: https://www.loc.gov/collections/united-states-code/
    const apiUrl = 'https://www.loc.gov/search/?q=legislation&fo=json&c=100';
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // LOC API response yapısına göre parse et
        if (data.results && Array.isArray(data.results)) {
          for (const result of data.results.slice(0, 20)) {
            try {
              const title = result.title || result.item?.title || 'Unknown';
              let content = result.description || result.summary || title;
              const date = result.date || result.created || new Date().toISOString().split('T')[0];
              
              // Detay sayfasından tam metni çek
              if (result.url) {
                try {
                  const detailResp = await fetch(result.url, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                  });
                  
                  if (detailResp.ok) {
                    const detailHtml = await detailResp.text();
                    const $ = cheerio.load(detailHtml);
                    
                    const contentSelectors = [
                      '#content',
                      '.content',
                      'main',
                      'article',
                      '[role="main"]'
                    ];
                    
                    for (const selector of contentSelectors) {
                      const contentEl = $(selector).first();
                      if (contentEl.length > 0) {
                        contentEl.find('script, style, nav, header, footer, aside').remove();
                        const text = contentEl.text();
                        if (text && text.trim().length > 300) {
                          content = cleanLegalTextPreserveStructure(text);
                          break;
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.error('LOC detail fetch error:', err);
                }
              }
              
              documents.push({
                title: `LOC: ${title}`,
                content: content,
                date: date
              });
            } catch (err) {
              console.error('LOC result processing error:', err);
            }
          }
        }
      }
    } catch (apiErr) {
      console.error('LOC API error, falling back to scraping:', apiErr);
      
      // Fallback: HTML scraping
      try {
        const htmlResp = await fetch('https://www.loc.gov/collections/united-states-code/', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (htmlResp.ok) {
          const html = await htmlResp.text();
          const $ = cheerio.load(html);
          
          $('a[href*="legislation"], a[href*="uscode"], a[href*="bill"]').each((_, el) => {
            if (documents.length >= 20) return false;
            
            const href = $(el).attr('href');
            const title = $(el).text().trim();
            
            if (href && title && title.length > 10) {
              const fullUrl = href.startsWith('http') ? href : `https://www.loc.gov${href}`;
              
              documents.push({
                title: `LOC: ${title}`,
                content: title,
                date: new Date().toISOString().split('T')[0]
              });
            }
          });
        }
      } catch (htmlErr) {
        console.error('LOC HTML scraping error:', htmlErr);
      }
    }
    
    return documents;
  } catch (err) {
    console.error('Library of Congress fetch error:', err);
    return [];
  }
}






