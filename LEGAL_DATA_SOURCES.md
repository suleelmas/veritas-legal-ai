# VERITAS Q-AI - Yasal Veri Kaynakları Raporu

## 📋 ÖZET

Sistemde **hibrit veri modeli** kullanılmaktadır:
- **Veritabanı (Supabase)**: Güncel mevzuat ve kararlar vector database'de saklanıyor
- **Real-time Fetch**: Kritik anahtar kelimeler veya eski veriler tespit edildiğinde canlı veri çekiliyor
- **Sync API'leri**: Periyodik olarak veritabanı güncelleniyor

---

## 🇹🇷 TÜRKİYE KAYNAKLARI

### 1. Yargıtay Kararları
- **URL**: `https://www.yargitay.gov.tr/kategori/100/yargitay-kararlari`
- **Yöntem**: HTML Scraping
- **Real-time**: ✅ Kritik durumlarda canlı çekiliyor
- **Sync API**: `/api/sync-court-decisions`
- **Dosya**: `lib/fetchYargitayKararlari.ts`
- **Durum**: ⚠️ Basit HTML parsing kullanıyor, içerik detayları eksik

### 2. Danıştay Kararları
- **URL**: `https://www.danistay.gov.tr/kararlar`
- **Yöntem**: HTML Scraping
- **Real-time**: ✅ Kritik durumlarda canlı çekiliyor
- **Sync API**: `/api/sync-court-decisions`
- **Dosya**: `lib/fetchDanistayKararlari.ts`
- **Durum**: ⚠️ Basit HTML parsing kullanıyor, içerik detayları eksik

### 3. Anayasa Mahkemesi Kararları
- **URL**: `https://kararlarbilgibankasi.anayasa.gov.tr/`
- **Yöntem**: HTML Scraping
- **Real-time**: ✅ Kritik durumlarda canlı çekiliyor
- **Sync API**: `/api/sync-court-decisions`
- **Dosya**: `lib/fetchAnayasaMahkemesiKararlari.ts`
- **Durum**: ⚠️ Basit HTML parsing kullanıyor, içerik detayları eksik

### 4. KVKK (Kişisel Verilerin Korunması Kurumu) Kararları
- **URL**: `https://www.kvkk.gov.tr/Icerik/6729/Kararlar`
- **Yöntem**: HTML Scraping
- **Real-time**: ✅ Kritik durumlarda canlı çekiliyor
- **Sync API**: `/api/sync-court-decisions`
- **Dosya**: `lib/fetchKVKKKararlari.ts`
- **Durum**: ⚠️ Basit HTML parsing kullanıyor, içerik detayları eksik

### 5. Resmi Gazete
- **URL**: `https://www.resmigazete.gov.tr/rss.aspx`
- **Yöntem**: RSS Feed
- **Real-time**: ❌ Sadece sync ile güncelleniyor
- **Sync API**: `/api/sync-rg`
- **Dosya**: `lib/fetchResmiGazeteHeadlines.ts`
- **Durum**: ⚠️ Sadece başlıklar çekiliyor, tam metin yok

---

## 🇺🇸 ABD KAYNAKLARI (İngilizce Analizler İçin)

### 6. Congress.gov (Federal Mevzuat)
- **URL**: 
  - RSS: `https://www.congress.gov/rss/bills.xml`
  - HTML: `https://www.congress.gov/search`
- **Yöntem**: RSS Feed (Primary), HTML Scraping (Fallback)
- **Real-time**: ✅ Kritik durumlarda canlı çekiliyor
- **Sync API**: `/api/sync-court-decisions`
- **Dosya**: `lib/fetchCongressGov.ts`
- **Durum**: ✅ RSS feed çalışıyor

### 7. SCOTUS (Supreme Court of the United States)
- **URL**: `https://www.supremecourt.gov/opinions/slipopinions/`
- **Yöntem**: HTML Scraping
- **Real-time**: ✅ Kritik durumlarda canlı çekiliyor
- **Sync API**: `/api/sync-court-decisions`
- **Dosya**: `lib/fetchSCOTUS.ts`
- **Durum**: ⚠️ Basit HTML parsing, PDF linklerinden başlık çıkarılıyor

### 8. CourtListener
- **URL**: 
  - API: `https://www.courtlistener.com/api/rest/v3/search/`
  - HTML: `https://www.courtlistener.com/` (Fallback)
- **Yöntem**: REST API (Primary), HTML Scraping (Fallback)
- **Real-time**: ✅ Kritik durumlarda canlı çekiliyor
- **Sync API**: `/api/sync-court-decisions`
- **API Key**: `process.env.COURTLISTENER_API_KEY` (opsiyonel)
- **Dosya**: `lib/fetchCourtListener.ts`
- **Durum**: ✅ API kullanımı mevcut, rate limit var

### 9. OpenJurist
- **URL**: `https://openjurist.org/`
- **Yöntem**: HTML Scraping
- **Real-time**: ✅ Kritik durumlarda canlı çekiliyor
- **Sync API**: `/api/sync-court-decisions`
- **Dosya**: `lib/fetchOpenJurist.ts`
- **Durum**: ⚠️ Basit HTML parsing

---

## 🔄 VERİ AKIŞI MİMARİSİ

### Analiz Sırasında (app/api/analyze/route.ts):

1. **Vector Search**: PDF metninden embedding oluşturuluyor, Supabase'de benzer belgeler aranıyor
2. **Kritik Kelime Kontrolü**: Eğer kritik kelimeler varsa (KVKK, TBK, SCOTUS, 2024, vb.) real-time fetch yapılıyor
3. **Veritabanı Stale Kontrolü**: Veritabanı 1 günden eskiyse canlı veri çekiliyor
4. **Context Merge**: Veritabanı ve canlı veriler birleştiriliyor
5. **Tarih Çelişkisi Çözümü**: Aynı konu için en güncel tarihli belge seçiliyor

### Sync İşlemleri:

- **Sync Court Decisions** (`/api/sync-court-decisions`): Tüm mahkeme kararlarını periyodik olarak çeker
- **Sync Resmi Gazete** (`/api/sync-rg`): Resmi Gazete başlıklarını RSS'den çeker

---

## ⚠️ EKSİKLİKLER VE İYİLEŞTİRME ÖNERİLERİ

### Kritik Eksiklikler:

1. **HTML Parsing Zayıf**: 
   - Tüm Türkiye kaynakları basit regex ile parse ediliyor
   - Karar içerikleri (content) çekilmiyor, sadece başlıklar
   - Site yapısı değişirse çalışmayabilir

2. **Resmi Gazete Sadece Başlık**:
   - RSS'den sadece başlık çekiliyor
   - Tam metin yok

3. **API Key Eksikleri**:
   - CourtListener için API key opsiyonel ama rate limit var
   - Diğer kaynaklar için resmi API yok (scraping kullanılıyor)

4. **Hata Yönetimi Zayıf**:
   - Fetch hataları sadece console'a loglanıyor
   - Fallback mekanizmaları sınırlı

### Tamamlanan Kaynaklar ✅:

1. **TBMM (Türkiye Büyük Millet Meclisi)**:
   - ✅ Kanun tasarıları ve kanunlar (Full-Text)
   - URL: `https://www.tbmm.gov.tr/`
   - Dosya: `lib/fetchTBMM.ts`

2. **Mevzuat Bilgi Sistemi (MBS)**:
   - ✅ Tüm mevzuat metinleri (Full-Text)
   - URL: `https://www.mevzuat.gov.tr/`
   - Dosya: `lib/fetchMBS.ts`

### Eksik Kaynaklar (Türkiye):

1. **Bakanlık Mevzuatları**:
   - Adalet Bakanlığı
   - İçişleri Bakanlığı
   - vb.

4. **Bölge İdare Mahkemeleri**:
   - Yargıtay ve Danıştay'ın altında kalan mahkemeler

5. **İl İdare Mahkemeleri Kararları**

6. **Vergi Mahkemeleri Kararları**

7. **İş Mahkemeleri Kararları**

### Önerilen İyileştirmeler:

1. **Gelişmiş HTML Parsing**:
   - Cheerio veya Puppeteer kullanımı
   - Site-specific parser'lar

2. **Resmi API Entegrasyonları**:
   - Mevzuat Bilgi Sistemi API (varsa)
   - TBMM API (varsa)

3. **Cache Mekanizması**:
   - Fetch edilen veriler cache'lenmeli
   - Rate limiting korunmalı

4. **Error Handling**:
   - Retry mekanizması
   - Fallback kaynaklar
   - Monitoring ve alerting

---

## 📊 MEVCUT KAYNAK LİSTESİ

| # | Kaynak | URL | Yöntem | Real-time | Durum |
|---|--------|-----|--------|-----------|-------|
| 1 | Yargıtay | https://www.yargitay.gov.tr/ | HTML Scraping (Full-Text) | ✅ | ✅ Güncellendi |
| 2 | Danıştay | https://www.danistay.gov.tr/ | HTML Scraping (Full-Text) | ✅ | ✅ Güncellendi |
| 3 | Anayasa Mahkemesi | https://kararlarbilgibankasi.anayasa.gov.tr/ | HTML Scraping (Full-Text) | ✅ | ✅ Güncellendi |
| 4 | KVKK | https://www.kvkk.gov.tr/ | HTML Scraping (Full-Text) | ✅ | ✅ Güncellendi |
| 5 | Resmi Gazete | https://www.resmigazete.gov.tr/ | RSS Feed (Full-Text) | ❌ | ✅ Güncellendi |
| 6 | **TBMM** | https://www.tbmm.gov.tr/ | HTML Scraping (Full-Text) | ✅ | ✅ **YENİ** |
| 7 | **MBS** | https://www.mevzuat.gov.tr/ | HTML Scraping (Full-Text) | ✅ | ✅ **YENİ** |
| 8 | Congress.gov | https://www.congress.gov/ | RSS/HTML | ✅ | ✅ |
| 9 | SCOTUS | https://www.supremecourt.gov/ | HTML Scraping | ✅ | ⚠️ İyileştirilmeli |
| 10 | CourtListener | https://www.courtlistener.com/ | REST API | ✅ | ✅ |
| 11 | OpenJurist | https://openjurist.org/ | HTML Scraping | ✅ | ⚠️ İyileştirilmeli |

---

## 🔍 KOD REFERANSLARI

### Kritik Anahtar Kelimeler:
```17:26:app/api/analyze/route.ts
const CRITICAL_KEYWORDS_TR = [
  'KVKK', 'TBK', 'HMK', 'İİK', 'AYM', 'Yargıtay', 'Danıştay', 
  'Anayasa', 'Kanun', 'Yönetmelik', 'Tüzük', 'Tebliğ', 'Karar',
  '2024', '2025', 'son karar', 'güncel', 'yeni mevzuat'
];

const CRITICAL_KEYWORDS_EN = [
  'SCOTUS', 'Supreme Court', 'Congress', 'Federal', 'Act', 'Law',
  '2024', '2025', 'recent', 'latest', 'current legislation', 'case law'
];
```

### Real-time Fetch Mantığı:
```374:382:app/api/analyze/route.ts
    // Adım B: Real-time Fetch - Kritik durumlarda canlı veri çek
    const needsLiveFetch = hasCriticalKeywords(pdfText, targetLang) || await isDatabaseStale(supabase, 1);
    
    let liveDocuments: any[] = [];
    if (needsLiveFetch) {
      onStatusUpdate?.('Dış kaynaklardan canlı doğrulama yapılıyor...');
      usedLiveFetch = true;
      liveDocuments = await fetchLiveData(pdfText, targetLang, supabase);
    }
```

---

## 📝 SONUÇ

Sistemde **11 ana kaynak** kullanılmakta:
- **7 Türkiye kaynağı** (Yargıtay, Danıştay, AYM, KVKK, Resmi Gazete, **TBMM**, **MBS**)
- **4 ABD kaynağı** (Congress.gov, SCOTUS, CourtListener, OpenJurist)

**Hibrit model**: Veritabanı + Real-time fetch kombinasyonu kullanılıyor.

**✅ Tamamlanan İyileştirmeler**:
- ✅ **TBMM ve MBS kaynakları eklendi**
- ✅ **Full-Text Parsing**: Tüm Türkiye kaynakları artık tam metin çekiyor (başlık + içerik)
- ✅ **Vector Embedding**: Her belge OpenAI embedding ile Supabase Vector Database'e kaydediliyor
- ✅ **Gelişmiş HTML Parsing**: Detay sayfalarından tam metin çekme mantığı eklendi

**Vector Embedding Sistemi**:
- Her çekilen belge `upsertDocument()` fonksiyonu ile işleniyor
- OpenAI `text-embedding-3-small` modeli kullanılıyor
- Embedding'ler Supabase'de `documents` tablosuna kaydediliyor
- Kuantum analizi için vektörel benzerlik hesaplama hazır

**Kalan İyileştirmeler**:
- Bakanlık mevzuatları (Adalet, İçişleri, vb.)
- Bölge/İl İdare Mahkemeleri
- Vergi ve İş Mahkemeleri
- Resmi API entegrasyonları (varsa)

