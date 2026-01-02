// Resmi Gazete başlıklarını ve içeriklerini çekmek için fonksiyon
// Kuantum Hassasiyeti: Cheerio + PDF desteği ile tam metin çekme
import * as cheerio from 'cheerio';
import * as pdfParse from 'pdf-parse';
import { Buffer } from 'buffer';
import { cleanLegalTextPreserveStructure } from './textCleaner';

export async function fetchResmiGazeteHeadlines(): Promise<string[]> {
  try {
    const resp = await fetch('https://www.resmigazete.gov.tr/rss.aspx');
    const xml = await resp.text();
    
    // RSS'den başlık ve link çek
    const itemMatches = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g));
    const headlines: string[] = [];
    
    for (const match of itemMatches.slice(0, 20)) {
      const item = match[1];
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);
      const descriptionMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i);
      
      if (titleMatch) {
        const title = titleMatch[1].trim();
        if (title && !title.toLowerCase().includes("resmî gazete rss")) {
          let fullContent = title;
          
          // Link varsa detay sayfasından tam metni çek
          if (linkMatch) {
            const link = linkMatch[1].trim();
            try {
              const detailResponse = await fetch(link, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              
              if (detailResponse.ok) {
                const contentType = detailResponse.headers.get('content-type') || '';
                
                // PDF kontrolü
                if (link.endsWith('.pdf') || contentType.includes('application/pdf')) {
                  try {
                    // PDF içeriğini çek
                    const pdfBuffer = await detailResponse.arrayBuffer();
                    const pdfData = await pdfParse(Buffer.from(pdfBuffer));
                    
                    // PDF metnini temizle
                    let pdfText = pdfData.text;
                    pdfText = cleanLegalTextPreserveStructure(pdfText);
                    
                    if (pdfText && pdfText.length > 200) {
                      fullContent = `${title}\n\n${pdfText}`;
                    }
                  } catch (pdfErr) {
                    console.error('PDF parse hatası:', pdfErr);
                    // PDF parse edilemezse description'ı kullan
                    if (descriptionMatch) {
                      const description = descriptionMatch[1].trim();
                      fullContent = `${title}\n\n${cleanLegalTextPreserveStructure(description)}`;
                    }
                  }
                } else {
                  // HTML içerik
                  const detailHtml = await detailResponse.text();
                  const $ = cheerio.load(detailHtml);
                  
                  // Resmi Gazete için CSS seçicileri
                  let content = '';
                  const selectors = [
                    '#icerik',
                    '#rg-icerik',
                    '.icerik',
                    '.rg-icerik',
                    '.rg-metin',
                    '.metin',
                    '#content',
                    '.content',
                    'main',
                    'article',
                    '[role="main"]',
                  ];
                  
                  for (const selector of selectors) {
                    const contentEl = $(selector).first();
                    if (contentEl.length > 0) {
                      // Gereksiz elementleri kaldır
                      contentEl.find('script, style, nav, header, footer, aside, .ad, .advertisement, .menu, .navbar, .social, .share').remove();
                      
                      content = contentEl.text();
                      
                      // Eğer içerik yeterli uzunluktaysa dur
                      if (content && content.trim().length > 200) {
                        break;
                      }
                    }
                  }
                  
                  // Eğer hala içerik bulunamadıysa, body'den al ama gereksiz kısımları çıkar
                  if (!content || content.trim().length < 200) {
                    $('script, style, nav, header, footer, aside, .ad, .advertisement, .menu, .navbar, .social, .share').remove();
                    content = $('body').text();
                  }
                  
                  // Akıllı temizlik
                  content = cleanLegalTextPreserveStructure(content);
                  
                  if (content && content.length > 200) {
                    fullContent = `${title}\n\n${content}`;
                  } else if (descriptionMatch) {
                    // Eğer HTML'den içerik bulunamadıysa description'ı kullan
                    const description = descriptionMatch[1].trim();
                    fullContent = `${title}\n\n${cleanLegalTextPreserveStructure(description)}`;
                  }
                }
              }
            } catch (detailErr) {
              console.error('Resmi Gazete detay sayfası hatası:', detailErr);
              // Detay sayfası çekilemezse description'ı kullan
              if (descriptionMatch) {
                const description = descriptionMatch[1].trim();
                fullContent = `${title}\n\n${cleanLegalTextPreserveStructure(description)}`;
              }
            }
          } else if (descriptionMatch) {
            // Link yoksa description'ı kullan
            const description = descriptionMatch[1].trim();
            fullContent = `${title}\n\n${cleanLegalTextPreserveStructure(description)}`;
          }
          
          if (fullContent && fullContent.trim().length > 50) {
            headlines.push(fullContent);
          }
        }
      }
    }
    
    return headlines;
  } catch (err) {
    console.error('RSS çekmede hata:', err);
    return [];
  }
}
