// Veritabanı kontrol API endpoint'i
import { NextResponse } from "next/server";
import { checkUSDatabase, getSampleUSDocuments } from '@/lib/checkDatabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // İstatistikleri çek
    const stats = await checkUSDatabase();
    
    // Örnek dokümanları çek
    const samples = await getSampleUSDocuments(10);
    
    return NextResponse.json({
      success: true,
      stats,
      samples,
      analysis: {
        fullTextPercentage: stats.usDocuments > 0 
          ? ((stats.fullTextDocs / stats.usDocuments) * 100).toFixed(2) + '%'
          : '0%',
        chunkedPercentage: stats.usDocuments > 0
          ? ((stats.chunkedDocuments / stats.usDocuments) * 100).toFixed(2) + '%'
          : '0%',
        canMatchUSCode: stats.uscodeDocs > 0 && stats.fullTextDocs > 0,
        readyForAnalysis: stats.usDocuments > 0 && stats.fullTextDocs > 5
      }
    });
  } catch (error: any) {
    console.error('Database check API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}







