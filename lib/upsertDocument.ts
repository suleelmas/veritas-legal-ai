import type { SupabaseClient } from '@supabase/supabase-js';
import { RecursiveCharacterTextSplitter } from './textSplitter';

// Embedding modelleri
// ABD kaynakları için daha büyük model (Common Law terminology için daha iyi)
const EMBEDDING_MODEL_US = 'text-embedding-3-large'; // 3072 boyutlu embedding
const EMBEDDING_MODEL_TR = 'text-embedding-3-small'; // 1536 boyutlu embedding (daha hızlı, Türkçe için yeterli)

// Token limitleri
const MAX_EMBEDDING_TOKENS_SMALL = 8000;  // text-embedding-3-small
const MAX_EMBEDDING_TOKENS_LARGE = 8000;  // text-embedding-3-large (aynı limit)
const CHARS_PER_TOKEN = 4; // Yaklaşık token hesaplama
const MAX_EMBEDDING_CHARS_SMALL = MAX_EMBEDDING_TOKENS_SMALL * CHARS_PER_TOKEN;
const MAX_EMBEDDING_CHARS_LARGE = MAX_EMBEDDING_TOKENS_LARGE * CHARS_PER_TOKEN;

// Ülke/region belirleme (metadata'dan)
function determineCountry(metadata: any): 'US' | 'TR' {
  const source = metadata?.source || '';
  const country = metadata?.country || '';
  
  // ABD kaynakları
  if (country === 'US' || 
      ['congress', 'scotus', 'courtlistener', 'openjurist', 'govinfo', 'loc', 
       'ny', 'ca', 'de', 'federalregister', 'uscode'].includes(source.toLowerCase())) {
    return 'US';
  }
  
  // Türkiye kaynakları (varsayılan)
  return 'TR';
}

// Ülkeye göre model ve limit belirle
function getEmbeddingConfig(metadata: any): { model: string; maxChars: number; chunkSize: number } {
  const country = determineCountry(metadata);
  
  if (country === 'US') {
    return {
      model: EMBEDDING_MODEL_US,
      maxChars: MAX_EMBEDDING_CHARS_LARGE,
      chunkSize: 3000 // ABD hukuk metinleri genelde daha uzun, daha büyük chunk
    };
  }
  
  return {
    model: EMBEDDING_MODEL_TR,
    maxChars: MAX_EMBEDDING_CHARS_SMALL,
    chunkSize: 2000 // Türkiye için orta boy chunk
  };
}

// Tek bir chunk için embedding oluştur
async function createEmbedding(text: string, model: string, apiKey: string): Promise<number[]> {
  const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: text,
      model: model
    })
  });
  
  const embeddingData = await embeddingResp.json();
  
  if (!embeddingResp.ok || !embeddingData.data) {
    throw new Error(`OpenAI embedding failed: ${embeddingData.error?.message || 'Unknown error'}`);
  }
  
  return embeddingData.data[0].embedding;
}

export async function upsertDocument(
  content: string, 
  metadata: any = {},
  supabase: SupabaseClient
) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    // İçerik boşsa hata ver
    if (!content || content.trim().length === 0) {
      throw new Error('Content is empty');
    }
    
    // Ülkeye göre embedding konfigürasyonu
    const config = getEmbeddingConfig(metadata);
    const country = determineCountry(metadata);
    
    // 1. RecursiveCharacterTextSplitter ile metni chunk'lara böl
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: Math.floor(config.chunkSize * 0.1) // %10 overlap
    });
    
    const chunks = splitter.splitText(content.trim());
    
    if (chunks.length === 0) {
      throw new Error('No valid chunks created from content');
    }
    
    // 2. Her chunk için embedding oluştur ve kaydet
    const documentsToUpsert: Array<{
      content: string;
      metadata: any;
      embedding: number[];
    }> = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Chunk'ın çok uzun olmadığından emin ol
      if (chunk.length > config.maxChars) {
        console.warn(`Chunk ${i + 1} exceeds max length (${chunk.length} > ${config.maxChars}), splitting further`);
        // Daha küçük parçalara böl
        const subSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: Math.floor(config.chunkSize / 2),
          chunkOverlap: Math.floor(config.chunkSize * 0.05)
        });
        const subChunks = subSplitter.splitText(chunk);
        
        for (let j = 0; j < subChunks.length; j++) {
          const subChunk = subChunks[j];
          try {
            const embedding = await createEmbedding(subChunk, config.model, apiKey);
            documentsToUpsert.push({
              content: subChunk,
              metadata: {
                ...metadata,
                country: country,
                chunk_index: `${i}_${j}`,
                total_chunks: chunks.length,
                sub_chunk_index: j,
                total_sub_chunks: subChunks.length,
                chunk_length: subChunk.length,
                original_length: content.length,
                embedding_model: config.model
              },
              embedding
            });
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err: any) {
            console.error(`Embedding hatası (sub-chunk ${i}_${j}):`, err.message);
          }
        }
        continue;
      }
      
      try {
        // Embedding oluştur
        const embedding = await createEmbedding(chunk, config.model, apiKey);
        
        // Metadata'ya chunk bilgisi ekle
        const chunkMetadata = {
          ...metadata,
          country: country,
          chunk_index: i,
          total_chunks: chunks.length,
          chunk_length: chunk.length,
          original_length: content.length,
          embedding_model: config.model
        };
        
        documentsToUpsert.push({
          content: chunk,
          metadata: chunkMetadata,
          embedding
        });
        
        // Rate limiting için kısa bekleme (her embedding arasında)
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (embeddingErr: any) {
        console.error(`Embedding hatası (chunk ${i + 1}/${chunks.length}):`, embeddingErr.message);
        // Bir chunk başarısız olsa bile diğerlerini kaydetmeye devam et
        continue;
      }
    }
    
    // 3. Tüm chunk'ları Supabase'e kaydet
    if (documentsToUpsert.length === 0) {
      throw new Error('No valid embeddings created');
    }
    
    // Her chunk'ı ayrı ayrı kaydet (veya batch olarak)
    // Supabase'in upsert limitini aşmamak için batch'ler halinde kaydet
    const BATCH_SIZE = 10;
    for (let i = 0; i < documentsToUpsert.length; i += BATCH_SIZE) {
      const batch = documentsToUpsert.slice(i, i + BATCH_SIZE);
      
      const { error, data } = await supabase
        .from('documents')
        .upsert(batch, {
          onConflict: 'content', // Aynı içerik varsa güncelle
        });
      
      if (error) {
        console.error(`Supabase upsert hatası (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, error);
        // Batch hataları olsa bile devam et
        continue;
      }
    }
    
    return {
      success: true,
      chunks_created: documentsToUpsert.length,
      total_chunks: chunks.length,
      original_length: content.length,
      country: country,
      embedding_model: config.model
    };
  } catch (err: any) {
    console.error('upsertDocument error:', err);
    throw err;
  }
}
