// Akıllı metin temizleme fonksiyonu - Hukuki metinleri saf hale getirir
export function cleanLegalText(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // 1. HTML etiketlerini temizle (Cheerio'dan sonra gelen metin zaten temiz olmalı ama güvence için)
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  
  // 2. Gereksiz boşlukları temizle
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // 3. Reklam ve menü metinlerini kaldır
  const unwantedPatterns = [
    // Reklamlar
    /tıklayınız/gi,
    /tıkla/gi,
    /click here/gi,
    /reklam/gi,
    /advertisement/gi,
    /sponsorlu içerik/gi,
    /sponsored content/gi,
    
    // Menü ve navigasyon
    /ana sayfa/gi,
    /home page/gi,
    /menü/gi,
    /menu/gi,
    /hakkımızda/gi,
    /about us/gi,
    /iletişim/gi,
    /contact/gi,
    /giriş yap/gi,
    /login/gi,
    /kayıt ol/gi,
    /sign up/gi,
    /register/gi,
    
    // Sosyal medya
    /paylaş/gi,
    /share/gi,
    /takip et/gi,
    /follow/gi,
    /beğen/gi,
    /like/gi,
    
    // Cookie ve Gizlilik
    /çerez/gi,
    /cookie/gi,
    /kabul et/gi,
    /accept/gi,
    /reddet/gi,
    /reject/gi,
    /gizlilik politikası/gi,
    /privacy policy/gi,
    
    // Diğer gereksiz metinler
    /yukarı/gi,
    /up/gi,
    /aşağı/gi,
    /down/gi,
    /geri dön/gi,
    /go back/gi,
    /yazdır/gi,
    /print/gi,
    /e-posta ile gönder/gi,
    /send via email/gi,
    
    // Form elemanları
    /arama yap/gi,
    /search/gi,
    /ara/gi,
    /filtrele/gi,
    /filter/gi,
    /sırala/gi,
    /sort/gi,
    
    // JavaScript ve dinamik içerik
    /javascript:void\(0\)/gi,
    /onclick=/gi,
    /onerror=/gi,
  ];
  
  unwantedPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // 4. URL'leri kaldır (ama PDF linklerini koruyalım - önemli olabilir)
  cleaned = cleaned.replace(/https?:\/\/[^\s]+(?<!\.pdf)/gi, '');
  
  // 5. E-posta adreslerini kaldır
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
  
  // 6. Fazla noktalama işaretlerini temizle
  cleaned = cleaned.replace(/[.]{3,}/g, '...');
  cleaned = cleaned.replace(/[!]{2,}/g, '!');
  cleaned = cleaned.replace(/[?]{2,}/g, '?');
  
  // 7. Madde numaralarını koru (örn: "Madde 1 -", "Article 1 -")
  // Bu pattern'ler korunacak, temizlenmeyecek
  
  // 8. Çok kısa satırları kaldır (muhtemelen reklam veya menü)
  const lines = cleaned.split('\n').map(line => line.trim());
  cleaned = lines
    .filter(line => {
      // 3 karakterden kısa satırları kaldır (ama sayıları koru)
      if (line.length < 3 && !/^\d+$/.test(line)) return false;
      // Sadece özel karakterlerden oluşan satırları kaldır
      if (/^[^\w\s]+$/.test(line)) return false;
      return true;
    })
    .join('\n');
  
  // 9. Fazla boş satırları temizle
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // 10. Başta ve sonda boşlukları temizle
  cleaned = cleaned.trim();
  
  // 11. Telefon numaralarını kaldır (hukuki metinlerde genelde yok)
  cleaned = cleaned.replace(/(\d{3}[\s.-]?){2,}\d{4}/g, '');
  
  return cleaned;
}

// Madde numaralarını ve yapısal öğeleri koruyarak temizleme
export function cleanLegalTextPreserveStructure(text: string): string {
  let cleaned = cleanLegalText(text);
  
  // Madde, fıkra, bent gibi yapısal öğeleri koru
  const structurePatterns = [
    /Madde\s+\d+/gi,
    /Article\s+\d+/gi,
    /Fıkra\s+\d+/gi,
    /Paragraph\s+\d+/gi,
    /Bent\s+[a-zöçğışü]/gi,
    /Item\s+[a-z]/gi,
    /\([a-z]\)/gi, // Alt bentler: (a), (b), (c)
    /\(\d+\)/gi, // Numaralı parantezler: (1), (2)
  ];
  
  // Bu pattern'lerin çevresindeki boşlukları normalize et
  structurePatterns.forEach(pattern => {
    cleaned = cleaned.replace(new RegExp(`\\s*(${pattern.source})\\s*`, 'gi'), '\n$1\n');
  });
  
  // Fazla boş satırları tekrar temizle
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

