// Almanya (DE) dokümanlarını kontrol et - Supabase'de kaç adet var?

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Country: 'DE' etiketli dokümanları say
    const { data: deDocs, error: deError } = await supabase
      .from('documents')
      .select('id, content, metadata', { count: 'exact' })
      .eq('metadata->>country', 'DE');
    
    if (deError) {
      return NextResponse.json({ 
        error: 'Supabase query error', 
        details: deError 
      }, { status: 500 });
    }
    
    // Source bazlı analiz
    const gesetzeDocs = deDocs?.filter(doc => 
      doc.metadata?.source === 'gesetze_im_internet'
    ) || [];
    
    const rechtsprechungDocs = deDocs?.filter(doc => 
      doc.metadata?.source === 'rechtsprechung_im_internet'
    ) || [];
    
    // Paragraf içeren dokümanları say
    const paragraphDocs = deDocs?.filter(doc => 
      doc.content?.includes('§') || doc.metadata?.paragraph
    ) || [];
    
    // Law code bazlı analiz
    const bgbDocs = deDocs?.filter(doc => 
      doc.metadata?.law_code === 'BGB' || doc.content?.includes('BGB')
    ) || [];
    
    const hgbDocs = deDocs?.filter(doc => 
      doc.metadata?.law_code === 'HGB' || doc.content?.includes('HGB')
    ) || [];
    
    // Chunk analizi - metadata'da chunk bilgisi var mı?
    const chunkedDocs = deDocs?.filter(doc => 
      doc.metadata?.chunk_index !== undefined || doc.metadata?.total_chunks
    ) || [];
    
    // İçerik uzunluk analizi
    const contentLengths = deDocs?.map(doc => ({
      id: doc.id,
      length: doc.content?.length || 0,
      hasParagraphs: doc.content?.includes('§') || false,
      source: doc.metadata?.source,
      law_code: doc.metadata?.law_code
    })) || [];
    
    // Örnek içerik (ilk 3 doküman)
    const sampleContents = deDocs?.slice(0, 3).map(doc => ({
      id: doc.id,
      title: doc.metadata?.title || 'No title',
      source: doc.metadata?.source,
      law_code: doc.metadata?.law_code,
      paragraph: doc.metadata?.paragraph,
      content_preview: doc.content?.substring(0, 300) || '',
      hasParagraphs: doc.content?.includes('§') || false,
      chunk_info: doc.metadata?.chunk_index !== undefined ? {
        chunk_index: doc.metadata.chunk_index,
        total_chunks: doc.metadata.total_chunks,
        chunk_length: doc.metadata.chunk_length
      } : null
    })) || [];
    
    return NextResponse.json({
      success: true,
      summary: {
        total_de_documents: deDocs?.length || 0,
        gesetze_im_internet: gesetzeDocs.length,
        rechtsprechung_im_internet: rechtsprechungDocs.length,
        documents_with_paragraphs: paragraphDocs.length,
        bgb_documents: bgbDocs.length,
        hgb_documents: hgbDocs.length,
        chunked_documents: chunkedDocs.length
      },
      content_analysis: {
        average_length: contentLengths.length > 0 
          ? Math.round(contentLengths.reduce((sum, item) => sum + item.length, 0) / contentLengths.length)
          : 0,
        min_length: contentLengths.length > 0 
          ? Math.min(...contentLengths.map(item => item.length))
          : 0,
        max_length: contentLengths.length > 0 
          ? Math.max(...contentLengths.map(item => item.length))
          : 0
      },
      sample_documents: sampleContents,
      all_documents: deDocs?.map(doc => ({
        id: doc.id,
        source: doc.metadata?.source,
        law_code: doc.metadata?.law_code,
        paragraph: doc.metadata?.paragraph,
        has_paragraphs: doc.content?.includes('§') || false,
        content_length: doc.content?.length || 0,
        chunk_info: doc.metadata?.chunk_index !== undefined ? {
          chunk_index: doc.metadata.chunk_index,
          total_chunks: doc.metadata.total_chunks
        } : null
      })) || []
    });
  } catch (error: any) {
    console.error('Check German docs error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}


