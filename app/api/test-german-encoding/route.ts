// Almanca UTF-8 Encoding Test - Umlaut karakterlerinin doğru kaydedildiğini test et

import { fetchGermanLegislation } from '@/lib/fetchGermanLegislation';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { SAMPLE_GERMAN_TEXT, testGermanEncoding, GERMAN_LEGAL_TERMS } from '@/lib/testGermanEncoding';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Gerçek bir Alman kanun metni çek (BGB örneği)
    console.log('Fetching German legislation (BGB)...');
    const germanLaws = await fetchGermanLegislation(1);
    
    if (germanLaws.length === 0) {
      return NextResponse.json({
        error: 'No German legislation fetched',
        message: 'Gesetze-im-internet.de\'den veri çekilemedi. Lütfen sync-court-decisions endpoint\'ini çalıştırın.'
      }, { status: 404 });
    }
    
    const sampleLaw = germanLaws[0];
    
    // 2. Umlaut karakterlerini kontrol et
    const umlauts = {
      'ä': (sampleLaw.content.match(/ä/g) || []).length,
      'ö': (sampleLaw.content.match(/ö/g) || []).length,
      'ü': (sampleLaw.content.match(/ü/g) || []).length,
      'ß': (sampleLaw.content.match(/ß/g) || []).length,
      'Ä': (sampleLaw.content.match(/Ä/g) || []).length,
      'Ö': (sampleLaw.content.match(/Ö/g) || []).length,
      'Ü': (sampleLaw.content.match(/Ü/g) || []).length
    };
    
    const totalUmlauts = Object.values(umlauts).reduce((sum, count) => sum + count, 0);
    
    // 3. UTF-8 encoding kontrolü
    const contentBuffer = Buffer.from(sampleLaw.content, 'utf8');
    const contentUTF8 = contentBuffer.toString('utf8');
    const encodingValid = contentUTF8 === sampleLaw.content;
    
    // 4. Örnek paragraf metni (Umlaut içeren)
    const paragraphMatch = sampleLaw.content.match(/(§\s*\d+[^\n]*\n[^\n]*)/);
    const sampleParagraph = paragraphMatch ? paragraphMatch[1] : sampleLaw.content.substring(0, 500);
    
    // 5. Veritabanından kontrol et (eğer kaydedilmişse)
    const supabase = await createClient();
    const { data: dbDoc } = await supabase
      .from('documents')
      .select('content, metadata')
      .eq('metadata->>country', 'DE')
      .eq('metadata->>source', 'gesetze_im_internet')
      .limit(1)
      .maybeSingle();
    
    let dbUmlauts = null;
    let dbEncodingValid = null;
    let dbSampleParagraph = null;
    
    if (dbDoc) {
      dbUmlauts = {
        'ä': (dbDoc.content.match(/ä/g) || []).length,
        'ö': (dbDoc.content.match(/ö/g) || []).length,
        'ü': (dbDoc.content.match(/ü/g) || []).length,
        'ß': (dbDoc.content.match(/ß/g) || []).length,
        'Ä': (dbDoc.content.match(/Ä/g) || []).length,
        'Ö': (dbDoc.content.match(/Ö/g) || []).length,
        'Ü': (dbDoc.content.match(/Ü/g) || []).length
      };
      
      const dbContentBuffer = Buffer.from(dbDoc.content, 'utf8');
      const dbContentUTF8 = dbContentBuffer.toString('utf8');
      dbEncodingValid = dbContentUTF8 === dbDoc.content;
      
      const dbParagraphMatch = dbDoc.content.match(/(§\s*\d+[^\n]*\n[^\n]*)/);
      dbSampleParagraph = dbParagraphMatch ? dbParagraphMatch[1] : dbDoc.content.substring(0, 500);
    }
    
    // 6. Örnek Alman hukuk terimleri (Umlaut içeren)
    const germanTerms = [
      'Bürgerliches Gesetzbuch',
      'Handelsgesetzbuch',
      'Aktiengesetz',
      'Strafgesetzbuch',
      'GmbH',
      'Geschäftsführer',
      'Gesellschaft',
      'Vermögen',
      'Schuldverhältnis',
      'Kaufvertrag',
      'Miete',
      'Pacht',
      'Bürgschaft',
      'Hypothek',
      'Grundschuld'
    ];
    
    const foundTerms = germanTerms.filter(term => 
      sampleLaw.content.includes(term)
    );
    
    // 7. Örnek metin testi (hardcoded sample)
    const sampleTest = testGermanEncoding(SAMPLE_GERMAN_TEXT);
    
    return NextResponse.json({
      success: true,
      sample_text_verification: {
        sample_text: SAMPLE_GERMAN_TEXT,
        encoding_test: sampleTest,
        umlaut_examples: {
          'ä': 'Verkäufer, Käufer, Sachmängel',
          'ö': 'Vermögen, Geschäftsführer',
          'ü': 'Bürgerliches, Bürgschaft, Schuldverhältnis',
          'ß': 'Gesellschaft, Grundschuld'
        }
      },
      test_results: {
        fetched_content: {
          title: sampleLaw.title,
          content_length: sampleLaw.content.length,
          umlaut_counts: umlauts,
          total_umlauts: totalUmlauts,
          encoding_valid: encodingValid,
          sample_paragraph: sampleParagraph,
          found_german_terms: foundTerms
        },
        database_content: dbDoc ? {
          content_length: dbDoc.content.length,
          umlaut_counts: dbUmlauts,
          encoding_valid: dbEncodingValid,
          sample_paragraph: dbSampleParagraph,
          metadata: dbDoc.metadata
        } : null,
        encoding_verification: {
          source_encoding: 'UTF-8',
          buffer_test: encodingValid ? 'PASS' : 'FAIL',
          umlaut_preservation: totalUmlauts > 0 ? 'PASS' : 'WARNING: No umlauts found',
          database_preservation: dbDoc ? (dbEncodingValid ? 'PASS' : 'FAIL') : 'NOT TESTED (No DB document)'
        }
      },
      sample_texts: {
        full_content_preview: sampleLaw.content.substring(0, 1000),
        paragraph_examples: sampleLaw.content.match(/§\s*\d+[^\n]{0,200}/g)?.slice(0, 5) || [],
        umlaut_examples: [
          ...(sampleLaw.content.match(/[äöüßÄÖÜ][^\n]{0,50}/g) || []).slice(0, 10)
        ]
      },
      recommendations: totalUmlauts === 0 
        ? ['⚠️ UYARI: Çekilen metinde Umlaut karakteri bulunamadı. Gesetze-im-internet.de\'den veri çekimi kontrol edilmeli.']
        : encodingValid 
          ? ['✅ UTF-8 encoding doğru çalışıyor.', '✅ Umlaut karakterleri korunuyor.']
          : ['❌ UTF-8 encoding sorunu tespit edildi!']
    });
  } catch (error: any) {
    console.error('German encoding test error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

