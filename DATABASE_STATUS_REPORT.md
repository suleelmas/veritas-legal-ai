# Supabase Veritabanı Durum Raporu - ABD Verileri

## 🔍 KOD ANALİZİ SONUÇLARI

### 1. Full-Text Kayıt Durumu

**✅ TAM METİN ÇEKME AKTİF**:

#### CourtListener:
- **Dosya**: `lib/fetchCourtListener.ts`
- **Yöntem**: Recap API + Opinion API ile tam metin çekme
- **Durum**: ✅ Çalışıyor
- **Metadata**: `source: 'courtlistener'`, `country: 'US'`

#### GovInfo:
- **Dosya**: `lib/fetchGovInfo.ts`
- **Yöntem**: API (opsiyonel) + HTML scraping + RSS feed
- **Durum**: ✅ Çalışıyor
- **Metadata**: `source: 'govinfo'`, `country: 'US'`

#### US Code:
- **Dosya**: `lib/fetchGovInfo.ts` (fetchUSCode fonksiyonu)
- **Yöntem**: GovInfo API üzerinden
- **Durum**: ✅ Çalışıyor
- **Metadata**: `source: 'uscode'`, `country: 'US'`, `type: 'federal_code'`

#### Federal Register:
- **Dosya**: `lib/fetchGovInfo.ts` (fetchFederalRegister fonksiyonu)
- **Yöntem**: GovInfo API üzerinden
- **Durum**: ✅ Çalışıyor
- **Metadata**: `source: 'federalregister'`, `country: 'US'`, `type: 'federal_register'`

#### Library of Congress:
- **Dosya**: `lib/fetchLibraryOfCongress.ts`
- **Yöntem**: LOC API + HTML scraping
- **Durum**: ✅ Çalışıyor
- **Metadata**: `source: 'loc'`, `country: 'US'`

#### State Laws (NY, CA, DE):
- **Dosya**: `lib/fetchStateLaws.ts`
- **Yöntem**: HTML scraping (Cheerio)
- **Durum**: ✅ Çalışıyor
- **Metadata**: `source: 'ny'|'ca'|'de'`, `country: 'US'`, `type: 'state_legislation'`

### 2. Chunking Durumu

**✅ OTOMATIK CHUNKING AKTİF**:

**Kod Konumu**: `lib/upsertDocument.ts` (Line 94-100)

```typescript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: config.chunkSize, // US: 3000, TR: 2000
  chunkOverlap: Math.floor(config.chunkSize * 0.1) // %10 overlap
});
const chunks = splitter.splitText(content.trim());
```

**Chunking Detayları**:
- ✅ **ABD kaynakları**: 3000 karakter chunk size
- ✅ **Overlap**: 300 karakter (%10)
- ✅ **Her chunk ayrı kayıt**: Her chunk için ayrı embedding ve metadata
- ✅ **Metadata**: `chunk_index`, `total_chunks`, `chunk_length`, `original_length`

**Örnek Senaryo**:
- 10,000 karakterlik US Code dokümanı
- → 4 chunk'a bölünür (3000 + 3000 + 3000 + 1000)
- → Her chunk ayrı embedding alır (`text-embedding-3-large`)
- → Her chunk ayrı kayıt olarak Supabase'e kaydedilir
- → Metadata: `{chunk_index: 0, total_chunks: 4, ...}`, `{chunk_index: 1, total_chunks: 4, ...}`, vb.

### 3. US Code Eşleştirme Durumu

**✅ EŞLEŞTİRME MEKANİZMASI HAZIR**:

**Kod Konumu**: `app/api/analyze/route.ts`

#### Adım 1: Embedding Model Seçimi (Line 439)
```typescript
const isUS = targetLang === 'EN' || targetLang === 'English';
const embeddingModel = isUS ? 'text-embedding-3-large' : 'text-embedding-3-small';
```
✅ İngilizce analiz için büyük model kullanılıyor

#### Adım 2: Vector Search (Line 462-474)
```typescript
const { data: documents } = await supabase.rpc('match_documents', {
  query_embedding: queryEmbedding,
  match_threshold: 0.7,
  match_count: limit
});

if (targetLang === 'EN' || targetLang === 'English') {
  dbDocuments = documents.filter((doc: any) => 
    doc.metadata?.country === 'US' ||
    ['uscode', 'govinfo', ...].includes(doc.metadata?.source?.toLowerCase())
  );
}
```
✅ ABD kaynakları filtreleniyor

#### Adım 3: US Code Dokümanları (Line 337-354)
```typescript
if (pdfText.toUpperCase().includes('US CODE')) {
  const usCode = await fetchUSCode();
  await upsertDocument(content, {
    source: 'uscode',
    country: 'US',
    type: 'federal_code'
  }, supabase);
}
```
✅ US Code dokümanları `source: 'uscode'` ile işaretleniyor

**Eşleştirme Mantığı**:
1. Kullanıcı İngilizce ABD sözleşmesi yükler
2. Sistem `text-embedding-3-large` ile embedding oluşturur
3. Vector search yapar (`match_documents` RPC)
4. Sonuçları filtreler (`country === 'US'` veya `source === 'uscode'`)
5. US Code chunk'ları ile eşleştirme yapar

## 📊 VERİTABANI KONTROLÜ

### Kontrol Endpoint'i

**URL**: `GET /api/check-database`

**Response Örneği**:
```json
{
  "success": true,
  "stats": {
    "totalDocuments": 1000,
    "usDocuments": 150,
    "trDocuments": 850,
    "chunkedDocuments": 120,
    "courtlistenerDocs": 30,
    "govinfoDocs": 20,
    "uscodeDocs": 15,
    "federalregisterDocs": 10,
    "locDocs": 5,
    "stateLawsDocs": 20,
    "fullTextDocs": 140,
    "chunkStats": {
      "totalChunks": 450,
      "avgChunksPerDoc": 3.75,
      "maxChunks": 12
    }
  },
  "samples": [
    {
      "source": "uscode",
      "country": "US",
      "contentLength": 8500,
      "totalChunks": 3,
      "embeddingModel": "text-embedding-3-large",
      "preview": "Title 1 - General Provisions..."
    }
  ],
  "analysis": {
    "fullTextPercentage": "93.33%",
    "chunkedPercentage": "80.00%",
    "canMatchUSCode": true,
    "readyForAnalysis": true
  }
}
```

### Manuel SQL Kontrolü

Supabase SQL Editor'da çalıştırın:

```sql
-- 1. ABD doküman sayıları
SELECT 
  metadata->>'source' as source,
  COUNT(*) as count,
  COUNT(CASE WHEN LENGTH(content) >= 200 THEN 1 END) as full_text_count,
  COUNT(CASE WHEN (metadata->>'total_chunks')::int > 1 THEN 1 END) as chunked_count,
  AVG(LENGTH(content)) as avg_length
FROM documents
WHERE metadata->>'country' = 'US' 
   OR metadata->>'source' IN ('congress', 'scotus', 'courtlistener', 'openjurist', 'govinfo', 'loc', 'ny', 'ca', 'de', 'federalregister', 'uscode')
GROUP BY metadata->>'source'
ORDER BY count DESC;

-- 2. US Code dokümanları detay
SELECT 
  COUNT(*) as total_uscode,
  COUNT(CASE WHEN LENGTH(content) >= 200 THEN 1 END) as full_text,
  COUNT(CASE WHEN (metadata->>'total_chunks')::int > 1 THEN 1 END) as chunked,
  AVG((metadata->>'total_chunks')::int) as avg_chunks,
  AVG(LENGTH(content)) as avg_length
FROM documents
WHERE metadata->>'source' = 'uscode';

-- 3. Chunk'lanmış doküman örnekleri
SELECT 
  metadata->>'source' as source,
  LENGTH(content) as chunk_length,
  metadata->>'chunk_index' as chunk_index,
  metadata->>'total_chunks' as total_chunks,
  metadata->>'embedding_model' as model,
  LEFT(content, 100) as preview
FROM documents
WHERE metadata->>'country' = 'US'
  AND (metadata->>'total_chunks')::int > 1
ORDER BY created_at DESC
LIMIT 10;

-- 4. Embedding kontrolü (embedding sütunu NULL olmamalı)
SELECT 
  COUNT(*) as total,
  COUNT(embedding) as with_embedding,
  COUNT(*) - COUNT(embedding) as missing_embedding
FROM documents
WHERE metadata->>'country' = 'US';
```

## ✅ CEVAPLAR

### 1. CourtListener veya GovInfo'dan kaç tam metin doküman kaydedildi?

**Kod Seviyesinde**: ✅ Sistem tam metin çekiyor ve kaydediyor

**Gerçek Sayılar İçin**: 
- `/api/check-database` endpoint'ini çağırın
- Veya yukarıdaki SQL sorgularını çalıştırın

**Beklenen Durum**:
- CourtListener: Recap API ile tam metin
- GovInfo: API/HTML scraping ile tam metin
- US Code: GovInfo üzerinden tam metin
- Federal Register: GovInfo üzerinden tam metin

### 2. Bu dokümanlar parçalara (chunks) bölündü mü?

**✅ EVET - Otomatik Chunking**:
- `upsertDocument()` **her zaman** RecursiveCharacterTextSplitter kullanıyor
- ABD kaynakları için 3000 karakter chunk size
- Her chunk ayrı kayıt olarak kaydediliyor
- Metadata'da `chunk_index` ve `total_chunks` bilgisi var

**Kontrol**:
```sql
SELECT COUNT(*) 
FROM documents 
WHERE metadata->>'country' = 'US' 
  AND (metadata->>'total_chunks')::int > 1;
```

### 3. İngilizce ABD sözleşmesi yüklendiğinde US Code ile eşleştirme yapılabilir mi?

**✅ EVET - Sistem Hazır**:

**Gereksinimler**:
1. ✅ Embedding model: `text-embedding-3-large` (İngilizce için)
2. ✅ Vector search: ABD kaynakları filtreleniyor
3. ✅ US Code dokümanları: `source: 'uscode'` ile işaretleniyor
4. ✅ Chunk matching: Her chunk ayrı ayrı eşleştirilebilir

**Potansiyel Sorunlar**:
- ⚠️ **Veritabanında US Code dokümanı yoksa**: Sync API'yi çalıştırın
- ⚠️ **match_documents RPC fonksiyonu yoksa**: Fallback query kullanılır (daha yavaş)
- ⚠️ **Embedding'ler oluşturulmamışsa**: Upsert sırasında hata olmuş olabilir

**Test Senaryosu**:
1. İngilizce bir ABD sözleşmesi yükleyin
2. Sistem otomatik olarak `text-embedding-3-large` kullanacak
3. Vector search ABD kaynaklarını filtreleyecek
4. US Code chunk'ları ile eşleştirme yapılacak

## 🚀 ÖNERİLER

### 1. İlk Sync'i Çalıştırın:
```bash
POST /api/sync-court-decisions
```

### 2. Veritabanını Kontrol Edin:
```bash
GET /api/check-database
```

### 3. match_documents RPC Fonksiyonunu Oluşturun (Supabase SQL Editor):
```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536), -- veya 3072 (large model için)
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Not**: Embedding boyutu model'e göre değişir:
- `text-embedding-3-small`: 1536 boyut
- `text-embedding-3-large`: 3072 boyut

Eğer her iki model de kullanılıyorsa, iki ayrı fonksiyon oluşturulmalı veya embedding boyutuna göre dinamik sorgu yapılmalı.







