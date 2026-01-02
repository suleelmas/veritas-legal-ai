// CourtListener'dan mahkeme kararlarını çekmek için fonksiyon
// CourtListener: https://www.courtlistener.com/
// Free Law Project API: https://www.courtlistener.com/api/
// Improved version - Recap arşivi ile tam metin çekme
import * as cheerio from 'cheerio';
import { cleanLegalTextPreserveStructure } from './textCleaner';

export async function fetchCourtListener(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    const apiKey = process.env.COURTLISTENER_API_KEY || '';
    const decisions: Array<{ title: string; content: string; date?: string }> = [];
    
    // CourtListener API - Önemli federal kararları çek (precedents)
    const apiUrl = `https://www.courtlistener.com/api/rest/v3/search/?order_by=-dateFiled&page_size=20&stat_Precedential=on&court_type=scotus+ca1+ca2+ca3+ca4+ca5+ca6+ca7+ca8+ca9+ca10+ca11+ca-dc&format=json`;
    
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Token ${apiKey}`;
    }
    
    try {
      const response = await fetch(apiUrl, { headers });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.results && Array.isArray(data.results)) {
          for (const result of data.results.slice(0, 20)) {
            try {
              const title = result.caseName || result.docketNumber || 'Unknown Case';
              let content = result.caseName || '';
              const date = result.dateFiled || result.dateModified || new Date().toISOString().split('T')[0];
              
              // Tam metni çek - Recap API kullan
              if (result.id && apiKey) {
                try {
                  // Opinion metnini çek
                  const opinionUrl = `https://www.courtlistener.com/api/rest/v3/opinions/${result.id}/?format=json`;
                  const opinionResp = await fetch(opinionUrl, {
                    headers: {
                      'Authorization': `Token ${apiKey}`,
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                  });
                  
                  if (opinionResp.ok) {
                    const opinion = await opinionResp.json();
                    if (opinion.html_with_citations || opinion.html || opinion.plain_text) {
                      const html = opinion.html_with_citations || opinion.html || '';
                      
                      if (html) {
                        const $ = cheerio.load(html);
                        // Gereksiz elementleri kaldır
                        $('script, style, nav, header, footer, aside, .citation, .footnote').remove();
                        content = cleanLegalTextPreserveStructure($('body').text() || $('main').text() || '');
                      } else if (opinion.plain_text) {
                        content = cleanLegalTextPreserveStructure(opinion.plain_text);
                      }
                    }
                  }
                } catch (opinionErr) {
                  console.error('CourtListener opinion fetch error:', opinionErr);
                }
              }
              
              // Eğer hala içerik yoksa, Recap sayfasından çek
              if (!content || content.length < 200) {
                try {
                  const recapUrl = `https://www.courtlistener.com${result.absolute_url || `/docket/${result.docketId}/`}`;
                  const recapResp = await fetch(recapUrl, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                  });
                  
                  if (recapResp.ok) {
                    const recapHtml = await recapResp.text();
                    const $ = cheerio.load(recapHtml);
                    
                    // Recap sayfasından opinion metnini çek
                    const opinionSelectors = [
                      '#opinion-content',
                      '.opinion-content',
                      '#content',
                      '.content',
                      'main',
                      'article'
                    ];
                    
                    for (const selector of opinionSelectors) {
                      const contentEl = $(selector).first();
                      if (contentEl.length > 0) {
                        contentEl.find('script, style, nav, header, footer, aside').remove();
                        const text = contentEl.text();
                        if (text && text.trim().length > 200) {
                          content = cleanLegalTextPreserveStructure(text);
                          break;
                        }
                      }
                    }
                  }
                } catch (recapErr) {
                  console.error('CourtListener Recap fetch error:', recapErr);
                }
              }
              
              if (content && content.length > 50) {
                decisions.push({
                  title: `CourtListener: ${title}`,
                  content: content,
                  date: date
                });
              }
            } catch (err) {
              console.error('CourtListener decision processing error:', err);
            }
          }
        }
      }
    } catch (apiErr) {
      console.error('CourtListener API error:', apiErr);
    }
    
    return decisions;
  } catch (err) {
    console.error('CourtListener fetch error:', err);
    return [];
  }
}
