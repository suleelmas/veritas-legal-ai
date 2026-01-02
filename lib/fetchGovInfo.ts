// GovInfo API - ABD Federal yasaları, tasarılar ve Federal Register için ana kaynak
// GovInfo API: https://www.govinfo.gov/developers
// Documentation: https://www.govinfo.gov/developers/api
import * as cheerio from 'cheerio';
import { cleanLegalTextPreserveStructure } from './textCleaner';

interface GovInfoDoc {
  title: string;
  content: string;
  date?: string;
  type: 'uscode' | 'bills' | 'federalregister';
}

export async function fetchGovInfo(
  type: 'uscode' | 'bills' | 'federalregister' = 'bills',
  limit: number = 20
): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    const apiKey = process.env.GOVINFO_API_KEY || '';
    const documents: GovInfoDoc[] = [];
    
    // GovInfo API endpoint'leri
    const endpoints = {
      uscode: 'https://www.govinfo.gov/bulkdata/BILLSTATUS',
      bills: 'https://www.govinfo.gov/bulkdata/BILLSTATUS',
      federalregister: 'https://www.govinfo.gov/feeds/fr',
    };
    
    // API key varsa API kullan, yoksa HTML scraping
    if (apiKey && type === 'bills') {
      try {
        // GovInfo API kullanarak son tasarıları çek
        const apiUrl = `https://api.govinfo.gov/collections/BILLS/${new Date().getFullYear()}?pageSize=${limit}&api_key=${apiKey}`;
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.packages && Array.isArray(data.packages)) {
            for (const pkg of data.packages.slice(0, limit)) {
              try {
                // Her paketin detayını çek
                const detailUrl = `https://api.govinfo.gov/packages/${pkg.packageId}/summary?api_key=${apiKey}`;
                const detailResp = await fetch(detailUrl);
                
                if (detailResp.ok) {
                  const detail = await detailResp.json();
                  // Tam metni çek
                  const textUrl = `https://api.govinfo.gov/packages/${pkg.packageId}/txt?api_key=${apiKey}`;
                  const textResp = await fetch(textUrl);
                  
                  let content = detail.title || '';
                  if (textResp.ok) {
                    content = await textResp.text();
                    content = cleanLegalTextPreserveStructure(content);
                  }
                  
                  documents.push({
                    title: `GovInfo Bill: ${detail.title || pkg.packageId}`,
                    content: content || detail.title || '',
                    date: detail.dateIssued || pkg.lastModified || new Date().toISOString().split('T')[0],
                    type: 'bills',
                    metadata: {
                      country: 'US',
                      level: 'Federal'
                    }
                  });
                }
              } catch (err) {
                console.error('GovInfo package detail error:', err);
              }
            }
          }
        }
      } catch (apiErr) {
        console.error('GovInfo API error, falling back to scraping:', apiErr);
      }
    }
    
    // Fallback: HTML scraping veya RSS feed
    if (documents.length === 0) {
      try {
        let url = '';
        if (type === 'federalregister') {
          url = 'https://www.govinfo.gov/feeds/fr.xml';
        } else if (type === 'uscode') {
          url = 'https://www.govinfo.gov/app/collection/uscode';
        } else {
          url = 'https://www.congress.gov/rss/bills.xml';
        }
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          
          if (contentType.includes('xml') || url.endsWith('.xml')) {
            // RSS/XML feed
            const xml = await response.text();
            const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
            const items = Array.from(xml.matchAll(itemPattern));
            
            for (const match of items.slice(0, limit)) {
              const item = match[1];
              const titleMatch = item.match(/<title>(.*?)<\/title>/i);
              const linkMatch = item.match(/<link>(.*?)<\/link>/i);
              const descriptionMatch = item.match(/<description>(.*?)<\/description>/i);
              const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
              
              if (titleMatch) {
                const title = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
                const link = linkMatch ? linkMatch[1].trim() : '';
                const description = descriptionMatch ? descriptionMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
                const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString().split('T')[0];
                
                let content = description || title;
                
                // Link varsa detay sayfasından tam metni çek
                if (link) {
                  try {
                    const detailResp = await fetch(link, {
                      headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                      }
                    });
                    
                    if (detailResp.ok) {
                      const detailHtml = await detailResp.text();
                      const $ = cheerio.load(detailHtml);
                      
                      // GovInfo sayfalarında içerik genellikle belirli div'lerde
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
                          contentEl.find('script, style, nav, header, footer, aside, .ad').remove();
                          const text = contentEl.text();
                          if (text && text.trim().length > 300) {
                            content = cleanLegalTextPreserveStructure(text);
                            break;
                          }
                        }
                      }
                    }
                  } catch (err) {
                    console.error('GovInfo detail fetch error:', err);
                  }
                }
                
                  // Metadata'ya level ve state bilgisi ekle
                  const metadata: any = {
                    title: `GovInfo ${type}: ${title}`,
                    content: content,
                    date: pubDate,
                    type,
                    country: 'US'
                  };
                  
                  if (type === 'uscode' || type === 'bills' || type === 'federalregister') {
                    metadata.level = 'Federal';
                  }
                  
                  if (['ny', 'ca', 'de'].includes(source?.toLowerCase())) {
                    metadata.state = source.toUpperCase();
                    metadata.level = 'State';
                  }
                  
                  documents.push({
                    title: metadata.title,
                    content: metadata.content,
                    date: metadata.date
                  });
              }
            }
          } else {
            // HTML scraping
            const html = await response.text();
            const $ = cheerio.load(html);
            
            $('a[href*="bill"], a[href*="uscode"], a[href*="FR"]').each((_, el) => {
              if (documents.length >= limit) return false;
              
              const href = $(el).attr('href');
              const title = $(el).text().trim();
              
              if (href && title && title.length > 10) {
                const fullUrl = href.startsWith('http') ? href : `https://www.govinfo.gov${href}`;
                
                documents.push({
                  title: `GovInfo ${type}: ${title}`,
                  content: title, // Detay sayfasından çekilebilir
                  date: new Date().toISOString().split('T')[0],
                  type
                });
              }
            });
          }
        }
      } catch (err) {
        console.error('GovInfo fetch error:', err);
      }
    }
    
    return documents.slice(0, limit).map(doc => ({
      title: doc.title,
      content: doc.content,
      date: doc.date
    }));
  } catch (err) {
    console.error('GovInfo fetch error:', err);
    return [];
  }
}

// US Code özel fonksiyonu
export async function fetchUSCode(): Promise<Array<{ title: string; content: string; date?: string }>> {
  return fetchGovInfo('uscode', 20);
}

// Federal Register özel fonksiyonu
export async function fetchFederalRegister(): Promise<Array<{ title: string; content: string; date?: string }>> {
  return fetchGovInfo('federalregister', 20);
}

