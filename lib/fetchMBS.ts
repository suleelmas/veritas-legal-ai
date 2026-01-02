// MBS (Mevzuat Bilgi Sistemi) mevzuat metinlerini çekmek için fonksiyon
// Kuantum Hassasiyeti: Cheerio ile CSS seçicileri kullanarak hedef odaklı veri çekme
import * as cheerio from 'cheerio';
import { cleanLegalTextPreserveStructure } from './textCleaner';

export async function fetchMBS(): Promise<Array<{ title: string; content: string; date?: string }>> {
  try {
    const regulations: Array<{ title: string; content: string; date?: string }> = [];
    
    try {
      // Son eklenen mevzuatları çek
      const response = await fetch('https://www.mevzuat.gov.tr/anasayfa/MevzuatFihristDetay', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        console.error('MBS fetch failed:', response.status);
        return [];
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // MBS linklerini CSS seçicileri ile çek
      const links: Array<{ href: string; title: string; date?: string }> = [];
      
      // Olası link konumları
      $('a[href*="mevzuatmetin"], a[href*="MevzuatDetay"], a[href*="mevzuat"]').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        
        if (href && title && title.length > 10 && !title.toLowerCase().includes('mevzuat')) {
          // Tarih bilgisini yakın bir elementten al
          const dateEl = $(el).closest('tr, li, div').find('time, .date, [class*="tarih"]').first();
          const date = dateEl.text().trim() || dateEl.attr('datetime') || undefined;
          
          links.push({ href, title, date });
        }
      });
      
      // Alternatif: Tablo satırlarından link çek
      if (links.length === 0) {
        $('table tr, .list-item, .item').each((_, el) => {
          const linkEl = $(el).find('a').first();
          const href = linkEl.attr('href');
          const title = linkEl.text().trim();
          
          if (href && (href.includes('mevzuat') || href.includes('MevzuatDetay')) && title && title.length > 10) {
            const dateEl = $(el).find('time, .date, td').last();
            const date = dateEl.text().trim() || undefined;
            links.push({ href, title, date });
          }
        });
      }
      
      // Tarihleri regex ile de destekle
      const dateMatches = Array.from(html.matchAll(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g));
      const dates = dateMatches.map(m => m[1]);
      
      let linkCount = 0;
      for (const link of links.slice(0, 20)) {
        if (linkCount >= 20) break;
        
        const fullUrl = link.href.startsWith('http') ? link.href : `https://www.mevzuat.gov.tr${link.href}`;
        
        // PDF yerine HTML varsa onu tercih et
        let finalUrl = fullUrl;
        if (fullUrl.includes('.pdf')) {
          finalUrl = fullUrl.replace('.pdf', '.htm');
        }
        
        try {
          const detailResponse = await fetch(finalUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (detailResponse.ok) {
            const detailHtml = await detailResponse.text();
            const $detail = cheerio.load(detailHtml);
            
            // MBS'de gerçek CSS seçicileri ile içerik çek
            let fullContent = '';
            
            // Öncelik sırasına göre CSS seçicileri
            const selectors = [
              '#icerik',
              '#mevzuat',
              '#metin',
              '#content',
              '.icerik',
              '.mevzuat',
              '.mevzuat-metin',
              '.metin',
              '.content',
              'main',
              'article',
              '[role="main"]',
            ];
            
            for (const selector of selectors) {
              const contentEl = $detail(selector).first();
              if (contentEl.length > 0) {
                // Gereksiz elementleri kaldır
                contentEl.find('script, style, nav, header, footer, aside, .ad, .advertisement, .menu, .navbar').remove();
                
                // Metni al
                fullContent = contentEl.text();
                
                // Eğer içerik yeterli uzunluktaysa dur
                if (fullContent && fullContent.trim().length > 300) {
                  break;
                }
              }
            }
            
            // Eğer hala içerik bulunamadıysa, body'den al ama gereksiz kısımları çıkar
            if (!fullContent || fullContent.trim().length < 300) {
              $detail('script, style, nav, header, footer, aside, .ad, .advertisement, .menu, .navbar').remove();
              fullContent = $detail('body').text();
            }
            
            // Akıllı temizlik
            fullContent = cleanLegalTextPreserveStructure(fullContent || link.title);
            
            if (fullContent && fullContent.length > 100) {
              regulations.push({
                title: `MBS: ${link.title}`,
                content: fullContent,
                date: link.date || dates[linkCount] || new Date().toISOString().split('T')[0]
              });
              
              linkCount++;
              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (detailErr) {
          console.error(`MBS detay sayfası hatası (${link.title}):`, detailErr);
          // Hata durumunda sadece başlığı kaydet
          regulations.push({
            title: `MBS: ${link.title}`,
            content: link.title,
            date: link.date || dates[linkCount] || new Date().toISOString().split('T')[0]
          });
          linkCount++;
        }
      }
    } catch (err) {
      console.error('MBS fetch hatası:', err);
    }
    
    // Alternatif: RSS feed (eğer HTML'den hiçbir şey bulunamadıysa)
    if (regulations.length === 0) {
      try {
        const rssResponse = await fetch('https://www.mevzuat.gov.tr/rss', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (rssResponse.ok) {
          const xml = await rssResponse.text();
          const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
          const itemMatches = Array.from(xml.matchAll(itemPattern));
          
          for (const match of itemMatches.slice(0, 10)) {
            const item = match[1];
            const titleMatch = item.match(/<title>(.*?)<\/title>/i);
            const descriptionMatch = item.match(/<description>(.*?)<\/description>/i);
            const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
            
            if (titleMatch) {
              const title = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
              const description = descriptionMatch ? descriptionMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
              const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString().split('T')[0];
              
              regulations.push({
                title: `MBS: ${title}`,
                content: cleanLegalTextPreserveStructure(description || title),
                date: pubDate
              });
            }
          }
        }
      } catch (err) {
        console.error('MBS RSS fetch hatası:', err);
      }
    }
    
    return regulations.slice(0, 20);
  } catch (err) {
    console.error('MBS mevzuat çekme hatası:', err);
    return [];
  }
}
