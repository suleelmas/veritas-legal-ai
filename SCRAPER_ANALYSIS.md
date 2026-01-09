# Scraper Analiz Raporu - MBS ve Resmi Gazete

## 📋 MEVCUT DURUM

### 1. MBS (Mevzuat Bilgi Sistemi)

**Dosya**: `lib/fetchMBS.ts`

**Şu Anki Yöntem**:
- ❌ **CSS Seçicisi KULLANMIYOR** - Regex ile yaklaşıyor
- Regex pattern'leri ile şunları arıyor:
  - `class*="mevzuat"` içeren div'ler
  - `id*="mevzuat"` içeren div'ler
  - `class*="content"` içeren div'ler
  - `<main>`, `<article>`, `<body>` fallback

**Gerçek Site Yapısı** (Test Edilmeli):
MBS sitesinin gerçek HTML yapısı şu şekilde olabilir:
```html
<div id="icerik" class="mevzuat-metin">
  <h1>Kanun Başlığı</h1>
  <div class="madde">Madde 1 - ...</div>
  <div class="madde">Madde 2 - ...</div>
</div>
```

**Önerilen CSS Seçicileri** (Test Edilmeli):
- `#icerik`
- `.icerik`
- `#mevzuat-metin`
- `.mevzuat-metin`
- `div.madde` (madde numaraları için)

---

### 2. Resmi Gazete

**Dosya**: `lib/fetchResmiGazeteHeadlines.ts`

**Şu Anki Yöntem**:
1. ✅ RSS Feed'den başlık + link alıyor
2. ✅ Link varsa detay sayfasına gidiyor
3. ❌ **CSS Seçicisi KULLANMIYOR** - Regex ile `class*="icerik"` veya `id*="icerik"` arıyor
4. ❌ **PDF desteği YOK** - Sadece HTML parse ediyor

**Gerçek Site Yapısı** (Test Edilmeli):
Resmi Gazete detay sayfaları şu şekilde olabilir:
```html
<div id="icerik" class="rg-icerik">
  <h2>Başlık</h2>
  <div class="rg-metin">Mevzuat metni...</div>
</div>
```

**Önerilen İyileştirmeler**:
- PDF linkleri tespit edilirse, PDF parse kütüphanesi kullanılmalı (pdf-parse, pdfjs-dist)
- Gerçek CSS seçicileri kullanılmalı: `#icerik`, `.rg-icerik`, `.rg-metin`

---

## ✅ SUPABASE'E KAYDETME

**Durum**: ✅ **TAM METİN OLARAK KAYDEDİLİYOR**

`lib/upsertDocument.ts` fonksiyonu:
- Aldığı `content` parametresini direkt Supabase'e kaydediyor
- OpenAI embedding oluşturuyor (`text-embedding-3-small`)
- Vector database'e kaydediyor

```typescript
await supabase.from('documents').upsert([{ 
  content,      // ← Tam metin burada
  metadata, 
  embedding 
}]);
```

---

## 🔧 ÖNERİLEN İYİLEŞTİRMELER

### 1. Gerçek Site Yapısını Test Et
```bash
# MBS örnek URL'i manuel test et
curl https://www.mevzuat.gov.tr/mevzuatmetin/1.5.6098.htm | grep -i "id\|class" | head -20

# Resmi Gazete örnek URL'i manuel test et
curl https://www.resmigazete.gov.tr/eskiler/2024/01/20240115.htm | grep -i "id\|class" | head -20
```

### 2. CSS Seçici Kütüphanesi Kullan
Regex yerine **Cheerio** veya **jsdom** kullan:
```typescript
import * as cheerio from 'cheerio';

const $ = cheerio.load(detailHtml);
const content = $('#icerik').text() || 
                $('.icerik').text() || 
                $('main').text() || 
                $('article').text();
```

### 3. PDF Desteği Ekle (Resmi Gazete için)
```typescript
import * as pdfParse from 'pdf-parse';

if (fullUrl.endsWith('.pdf')) {
  const pdfResponse = await fetch(fullUrl);
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfData = await pdfParse(Buffer.from(pdfBuffer));
  fullContent = pdfData.text;
}
```

### 4. Error Handling İyileştir
- Detay sayfası bulunamazsa logla
- CSS seçicisi bulunamazsa alternatif dene
- Rate limiting ekle (şu an var: 500ms)

---

## 📊 SONUÇ

**Mevcut Durum**:
- ❌ CSS seçicisi kullanılmıyor (regex ile yaklaşılıyor)
- ✅ Tam metin çekmeye çalışıyor
- ✅ Supabase'e tam metin olarak kaydediliyor
- ⚠️ Gerçek site yapısına göre test edilmemiş

**Yapılması Gerekenler**:
1. Gerçek MBS ve Resmi Gazete URL'lerini test et
2. Gerçek CSS seçicilerini/ID'leri belirle
3. Regex yerine Cheerio gibi bir parser kullan
4. PDF desteği ekle (Resmi Gazete için)







