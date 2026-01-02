// Veritabanı kontrol fonksiyonları - ABD verilerini analiz et
import { createClient } from '@/utils/supabase/server';

export interface DatabaseStats {
  totalDocuments: number;
  usDocuments: number;
  trDocuments: number;
  chunkedDocuments: number;
  courtlistenerDocs: number;
  govinfoDocs: number;
  uscodeDocs: number;
  federalregisterDocs: number;
  locDocs: number;
  stateLawsDocs: number;
  fullTextDocs: number; // 200+ karakter içerik
  chunkStats: {
    totalChunks: number;
    avgChunksPerDoc: number;
    maxChunks: number;
  };
}

export async function checkUSDatabase(): Promise<DatabaseStats> {
  try {
    const supabase = await createClient();
    
    // Tüm ABD dokümanlarını çek
    const { data: usDocs, error: usError } = await supabase
      .from('documents')
      .select('content, metadata')
      .or('metadata->>country.eq.US,metadata->>source.in.(congress,scotus,courtlistener,openjurist,govinfo,loc,ny,ca,de,federalregister,uscode)');
    
    if (usError) {
      console.error('US documents query error:', usError);
      throw usError;
    }
    
    // Tüm dokümanları çek (karşılaştırma için)
    const { data: allDocs, error: allError } = await supabase
      .from('documents')
      .select('content, metadata')
      .limit(10000);
    
    if (allError) {
      console.error('All documents query error:', allError);
    }
    
    // TR dokümanlarını çek
    const { data: trDocs } = await supabase
      .from('documents')
      .select('content, metadata')
      .or('metadata->>country.eq.TR,metadata->>source.in.(yargitay,danistay,anayasa,kvkk,resmigazete,tbmm,mbs)');
    
    const usDocuments = usDocs || [];
    const trDocuments = trDocs?.data || [];
    const allDocuments = allDocs || [];
    
    // İstatistikler
    const stats: DatabaseStats = {
      totalDocuments: allDocuments.length,
      usDocuments: usDocuments.length,
      trDocuments: trDocuments.length,
      chunkedDocuments: 0,
      courtlistenerDocs: 0,
      govinfoDocs: 0,
      uscodeDocs: 0,
      federalregisterDocs: 0,
      locDocs: 0,
      stateLawsDocs: 0,
      fullTextDocs: 0,
      chunkStats: {
        totalChunks: 0,
        avgChunksPerDoc: 0,
        maxChunks: 0
      }
    };
    
    // Chunk sayılarını hesapla
    const chunkCounts: number[] = [];
    let totalChunks = 0;
    
    for (const doc of usDocuments) {
      const metadata = doc.metadata as any;
      const source = metadata?.source || '';
      const content = doc.content || '';
      
      // Kaynak bazlı sayım
      if (source === 'courtlistener') stats.courtlistenerDocs++;
      if (source === 'govinfo') stats.govinfoDocs++;
      if (source === 'uscode') stats.uscodeDocs++;
      if (source === 'federalregister') stats.federalregisterDocs++;
      if (source === 'loc') stats.locDocs++;
      if (['ny', 'ca', 'de'].includes(source)) stats.stateLawsDocs++;
      
      // Full-text kontrolü (200+ karakter)
      if (content.length >= 200) {
        stats.fullTextDocs++;
      }
      
      // Chunk kontrolü
      const docTotalChunks = metadata?.total_chunks;
      if (docTotalChunks && docTotalChunks > 1) {
        stats.chunkedDocuments++;
        chunkCounts.push(docTotalChunks);
        totalChunks += docTotalChunks;
      } else if (content.length > 3000) {
        // Büyük doküman ama chunk bilgisi yok - muhtemelen chunk'lanmamış
        console.warn(`Large document without chunk info: ${source} (${content.length} chars)`);
      }
    }
    
    // Chunk istatistikleri
    if (chunkCounts.length > 0) {
      stats.chunkStats.totalChunks = chunkCounts.reduce((a, b) => a + b, 0);
      stats.chunkStats.avgChunksPerDoc = stats.chunkStats.totalChunks / chunkCounts.length;
      stats.chunkStats.maxChunks = Math.max(...chunkCounts);
    }
    
    return stats;
  } catch (err) {
    console.error('Database check error:', err);
    throw err;
  }
}

// Örnek dokümanları göster
export async function getSampleUSDocuments(limit: number = 5) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('documents')
      .select('content, metadata, created_at')
      .or('metadata->>country.eq.US,metadata->>source.in.(congress,scotus,courtlistener,openjurist,govinfo,loc,ny,ca,de,federalregister,uscode)')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Sample documents query error:', error);
      throw error;
    }
    
    return data?.map(doc => ({
      source: (doc.metadata as any)?.source || 'unknown',
      country: (doc.metadata as any)?.country || 'unknown',
      contentLength: doc.content?.length || 0,
      totalChunks: (doc.metadata as any)?.total_chunks || 1,
      embeddingModel: (doc.metadata as any)?.embedding_model || 'unknown',
      date: (doc.metadata as any)?.date || doc.created_at,
      preview: doc.content?.substring(0, 200) || ''
    })) || [];
  } catch (err) {
    console.error('Get sample documents error:', err);
    throw err;
  }
}

