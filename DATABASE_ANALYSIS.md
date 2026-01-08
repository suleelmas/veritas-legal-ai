# Supabase Veritabanı Analizi - ABD Verileri

## 📊 MEVCUT DURUM ANALİZİ

### 1. Chunking Mekanizması

**Kod Analizi (`lib/upsertDocument.ts`)**:
- ✅ **RecursiveCharacterTextSplitter kullanılıyor**
- ✅ **ABD kaynakları için**: 3000 karakter chunk size
- ✅ **Türkiye kaynakları için**: 2000 karakter chunk size
- ✅ **Overlap**: %10 (ABD için 300 karakter, TR için 200 karakter)
- ✅ **Metadata'da chunk bilgisi**: `chunk_index`, `total_chunks` kaydediliyor

**Chunking Mantığı**:
```typescript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: config.chunkSize, // US: 3000, TR: 2000
  chunkOverlap: Math.floor(config.chunkSize * 0.1) // %10 overlap
});
const chunks = splitter.splitText(content.trim());
```

**Her chunk ayrı kayıt olarak kaydediliyor**:
- Her chunk için ayrı embedding oluşturuluyor
- Her chunk için ayrı metadata (chunk_index, total_chunks)
- Batch processing (10'luk gruplar)

### 2. Full-Text Kayıt Durumu

**Kod Analizi**:
- ✅ **CourtListener**: Recap API ile tam metin çekiyor (`lib/fetchCourtListener.ts`)
- ✅ **GovInfo**: API veya HTML scraping ile tam metin çekiyor (`lib/fetchGovInfo.ts`)
- ✅ **US Code**: GovInfo üzerinden tam metin çekiyor
- ✅ **Federal Register**: GovInfo üzerinden tam metin çekiyor
- ✅ **Library of Congress**: API veya HTML scraping ile tam metin çekiyor
- ✅ **State Laws**: HTML scraping ile tam metin çekiyor

**Akıllı Temizlik**:
- `cleanLegalTextPreserveStructure()` fonksiyonu ile reklamlar, menüler temizleniyor
- Madde numaraları ve yapısal öğeler korunuyor

### 3. Vector Search ve Eşleştirme

**Kod Analizi (`app/api/analyze/route.ts`)**:

#### Embedding Model Seçimi:
```typescript
const isUS = targetLang === 'EN' || targetLang === 'English';
const embeddingModel = isUS ? 'text-embedding-3-large' : 'text-embedding-3-small';
```

#### Vector Search Filtreleme:
```typescript
if (targetLang === 'EN' || targetLang === 'English') {
  // ABD kaynakları: country metadata'sına göre filtrele
  dbDocuments = documents.filter((doc: any) => 
    doc.metadata?.country === 'US' ||
    ['congress', 'scotus', 'courtlistener', 'openjurist', 'govinfo', 'loc', 
     'ny', 'ca', 'de', 'federalregister', 'uscode'].includes(doc.metadata?.source?.toLowerCase())
  );
}
```

**✅ US Code Eşleştirme**:
- İngilizce analiz için `text-embedding-3-large` modeli kullanılıyor
- Vector search'te ABD kaynakları filtreleniyor (`country === 'US'` veya `source === 'uscode'`)
- US Code dokümanları `metadata.source === 'uscode'` ile işaretleniyor
- Chunk'lar ayrı ayrı kaydedildiği için, her chunk eşleştirme için kullanılabilir

### 4. Veritabanı Kontrol API

**Yeni Endpoint**: `/api/check-database`

Bu endpoint şunları kontrol eder:
- Toplam ABD doküman sayısı
- CourtListener, GovInfo, US Code, Federal Register, LOC, State Laws doküman sayıları
- Full-text doküman sayısı (200+ karakter)
- Chunk'lanmış doküman sayısı
- Ortalama chunk sayısı
- Örnek dokümanlar

**Kullanım**:
```bash
GET /api/check-database
```

**Response**:
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
  "analysis": {
    "fullTextPercentage": "93.33%",
    "chunkedPercentage": "80.00%",
    "canMatchUSCode": true,
    "readyForAnalysis": true
  }
}
```

## ✅ CEVAPLAR

### 1. CourtListener veya GovInfo'dan kaç tam metin doküman kaydedildi?

**Kod Analizi**:
- ✅ **CourtListener**: Recap API ile tam metin çekiyor ve kaydediyor
- ✅ **GovInfo**: API veya HTML scraping ile tam metin çekiyor ve kaydediyor
- ✅ **US Code**: GovInfo üzerinden tam metin çekiyor
- ✅ **Federal Register**: GovInfo üzerinden tam metin çekiyor

**Kontrol için**: `/api/check-database` endpoint'ini çağırın.

### 2. Bu dokümanlar parçalara (chunks) bölündü mü?

**✅ EVET - Otomatik Chunking**:
- `upsertDocument()` fonksiyonu **her zaman** RecursiveCharacterTextSplitter kullanıyor
- ABD kaynakları için 3000 karakter chunk size
- Her chunk ayrı bir kayıt olarak kaydediliyor
- Metadata'da `chunk_index` ve `total_chunks` bilgisi var

**Örnek**:
- 10,000 karakterlik bir US Code dokümanı → 4 chunk'a bölünür (3000 + 3000 + 3000 + 1000)
- Her chunk ayrı embedding alır ve ayrı kayıt olarak kaydedilir

### 3. İngilizce ABD sözleşmesi yüklendiğinde US Code ile eşleştirme yapılabilir mi?

**✅ EVET - Sistem Hazır**:

**Mekanizma**:
1. **Embedding Model**: İngilizce analiz için `text-embedding-3-large` kullanılıyor
2. **Vector Search**: ABD kaynakları filtreleniyor (`country === 'US'`)
3. **US Code Dokümanları**: `metadata.source === 'uscode'` ile işaretleniyor
4. **Chunk Matching**: Her chunk ayrı ayrı eşleştirilebilir

**Kod Doğrulaması**:
```typescript
// app/api/analyze/route.ts - Line 439
const embeddingModel = isUS ? 'text-embedding-3-large' : 'text-embedding-3-small';

// Line 471-476
if (targetLang === 'EN' || targetLang === 'English') {
  dbDocuments = documents.filter((doc: any) => 
    doc.metadata?.country === 'US' ||
    ['uscode', 'govinfo', ...].includes(doc.metadata?.source?.toLowerCase())
  );
}
```

**Potansiyel Sorunlar**:
- ⚠️ **Veritabanında US Code dokümanı yoksa**: Eşleştirme yapılamaz
- ⚠️ **Chunk'lar embedding oluşturulmamışsa**: Vector search çalışmaz
- ⚠️ **match_documents RPC fonksiyonu yoksa**: Fallback query kullanılır (daha yavaş)

## 🔍 KONTROL ADIMLARI

### 1. Veritabanı İstatistiklerini Kontrol Et:
```bash
curl http://localhost:3000/api/check-database
```

### 2. Supabase SQL Editor'da Manuel Kontrol:
```sql
-- ABD dokümanlarını say
SELECT 
  COUNT(*) as total_us_docs,
  COUNT(CASE WHEN LENGTH(content) >= 200 THEN 1 END) as full_text_docs,
  COUNT(CASE WHEN (metadata->>'total_chunks')::int > 1 THEN 1 END) as chunked_docs
FROM documents
WHERE metadata->>'country' = 'US' 
   OR metadata->>'source' IN ('congress', 'scotus', 'courtlistener', 'openjurist', 'govinfo', 'loc', 'ny', 'ca', 'de', 'federalregister', 'uscode');

-- US Code dokümanlarını kontrol et
SELECT 
  COUNT(*) as uscode_count,
  AVG(LENGTH(content)) as avg_length,
  COUNT(CASE WHEN (metadata->>'total_chunks')::int > 1 THEN 1 END) as chunked_count
FROM documents
WHERE metadata->>'source' = 'uscode';

-- Örnek US Code dokümanları
SELECT 
  metadata->>'source' as source,
  LENGTH(content) as content_length,
  metadata->>'total_chunks' as total_chunks,
  metadata->>'embedding_model' as embedding_model,
  LEFT(content, 200) as preview
FROM documents
WHERE metadata->>'source' = 'uscode'
LIMIT 5;
```

### 3. Vector Search Fonksiyonunu Kontrol Et:
```sql
-- match_documents RPC fonksiyonu var mı?
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'match_documents';
```

## 📝 SONUÇ

**Kod Seviyesinde**:
- ✅ Chunking mekanizması çalışıyor
- ✅ Full-text çekme mekanizması çalışıyor
- ✅ Vector search filtreleme çalışıyor
- ✅ US Code eşleştirme mantığı hazır

**Veritabanı Seviyesinde** (Kontrol Gerekli):
- ⚠️ Gerçek veri sayıları kontrol edilmeli (`/api/check-database`)
- ⚠️ US Code dokümanlarının varlığı kontrol edilmeli
- ⚠️ Embedding'lerin oluşturulup oluşturulmadığı kontrol edilmeli
- ⚠️ `match_documents` RPC fonksiyonunun varlığı kontrol edilmeli

**Öneri**: `/api/check-database` endpoint'ini çağırarak gerçek durumu kontrol edin.






