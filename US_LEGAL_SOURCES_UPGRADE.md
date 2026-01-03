# ABD Yasal Veri Kaynakları - Profesyonel Seviye Güncellemesi

## ✅ TAMAMLANAN İYİLEŞTİRMELER

### 1. Kaynak Genişletme ve Derinleştirme

#### ✅ GovInfo API (`lib/fetchGovInfo.ts`)
- **US Code**: ABD Federal Kanunlar Kodu
- **Bills**: Tasarılar ve yasalar
- **Federal Register**: Federal yönetmelikler ve düzenlemeler
- API key desteği (opsiyonel) - `GOVINFO_API_KEY` environment variable
- Fallback: HTML scraping ve RSS feed

#### ✅ CourtListener Recap Arşivi (`lib/fetchCourtListener.ts`)
- **Geliştirilmiş**: Tam metin çekme (Recap API ile)
- **Precedent filtering**: Sadece önemli federal kararlar (`stat_Precedential=on`)
- **Federal courts**: SCOTUS ve tüm Circuit Courts (CA1-CA11, CA-DC)
- Opinion HTML parsing ile tam metin çekme
- Fallback: Recap sayfası scraping

#### ✅ Library of Congress (`lib/fetchLibraryOfCongress.ts`)
- LOC API entegrasyonu
- Congress.gov entegrasyonu
- Tam metin çekme desteği
- Fallback: HTML scraping

### 2. Eyalet Bazlı Veri

#### ✅ Eyalet Scraperları (`lib/fetchStateLaws.ts`)
- **New York**: NY State Senate/Assembly Bills
- **California**: CA Legislative Information
- **Delaware**: DE General Assembly (Ticaret hukuku için kritik)
- Her eyalet için özel scraper fonksiyonları
- Tam metin çekme desteği

### 3. Teknik İyileştirmeler

#### ✅ RecursiveCharacterTextSplitter (`lib/textSplitter.ts`)
- Hukuki metinler için optimize edilmiş chunking
- Öncelik sırası:
  1. Paragraflar (`\n\n`)
  2. Satırlar (`\n`)
  3. Cümleler (`. `)
  4. Yan cümleler (`; `)
  5. Kelimeler arası boşluk
  6. Karakter karakter (son çare)
- Overlap desteği (context korunması)
- Configurable chunk size ve overlap

#### ✅ text-embedding-3-large Modeli (`lib/upsertDocument.ts`)
- **ABD kaynakları için**: `text-embedding-3-large` (3072 boyutlu embedding)
- **Türkiye kaynakları için**: `text-embedding-3-small` (1536 boyutlu embedding)
- Otomatik ülke tespiti (metadata'dan)
- Common Law terminolojisi için daha iyi embedding doğruluğu

#### ✅ Akıllı Chunking
- Uzun metinler için otomatik parçalama
- Chunk size: ABD için 3000 karakter, TR için 2000 karakter
- Overlap: %10 (context korunması için)
- Batch processing (10'luk gruplar halinde)

### 4. Veri Senkronizasyonu

#### ✅ ABD/TR Kaynak Filtreleme (`app/api/analyze/route.ts`)
- **ABD kaynakları**: `metadata.country === 'US'` filtresi
- **Türkiye kaynakları**: `metadata.country !== 'US'` filtresi
- Vector search'te otomatik filtreleme
- Kullanıcı dil seçimine göre kaynak ayrımı

#### ✅ Metadata Yapısı
```typescript
{
  source: 'govinfo' | 'uscode' | 'federalregister' | 'loc' | 'ny' | 'ca' | 'de' | ...,
  country: 'US' | 'TR',
  type: 'federal_legislation' | 'federal_code' | 'federal_register' | 'state_legislation' | ...,
  state?: 'ny' | 'ca' | 'de',
  embedding_model: 'text-embedding-3-large' | 'text-embedding-3-small',
  chunk_index: number,
  total_chunks: number
}
```

## 📊 TOPLAM KAYNAK SAYISI

### Türkiye Kaynakları (7):
1. Yargıtay
2. Danıştay
3. Anayasa Mahkemesi
4. KVKK
5. Resmi Gazete
6. TBMM
7. MBS

### ABD Kaynakları (11):
1. Congress.gov (Bills)
2. SCOTUS (Supreme Court)
3. CourtListener (Recap Archive)
4. OpenJurist
5. **GovInfo** (Bills, US Code, Federal Register) ⭐ YENİ
6. **US Code** ⭐ YENİ
7. **Federal Register** ⭐ YENİ
8. **Library of Congress** ⭐ YENİ
9. **New York State Laws** ⭐ YENİ
10. **California State Laws** ⭐ YENİ
11. **Delaware State Laws** ⭐ YENİ

**Toplam: 18 kaynak**

## 🔧 TEKNİK DETAYLAR

### Embedding Modelleri:
- **ABD**: `text-embedding-3-large` (3072 boyut)
- **TR**: `text-embedding-3-small` (1536 boyut)

### Chunking:
- **ABD**: 3000 karakter chunk size, 300 karakter overlap
- **TR**: 2000 karakter chunk size, 200 karakter overlap

### Filtreleme:
- `getRelevantDocuments()` fonksiyonu otomatik olarak ülkeye göre filtreler
- Vector search sonuçları `metadata.country` alanına göre filtrelenir

## 🚀 KULLANIM

### Environment Variables:
```env
OPENAI_API_KEY=your_key_here
GOVINFO_API_KEY=your_key_here  # Opsiyonel
COURTLISTENER_API_KEY=your_key_here  # Opsiyonel
```

### Sync API:
```bash
POST /api/sync-court-decisions
GET /api/sync-court-decisions?authorization=Bearer YOUR_CRON_SECRET
```

### Analyze API:
- Otomatik ülke tespiti
- ABD kaynakları için büyük model kullanımı
- Vector search'te otomatik filtreleme


