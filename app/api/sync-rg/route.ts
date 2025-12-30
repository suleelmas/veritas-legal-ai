import { fetchResmiGazeteHeadlines } from '@/lib/fetchResmiGazeteHeadlines';
import { upsertDocument } from '@/lib/upsertDocument';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 dakika timeout

async function syncResmiGazete() {
  try {
    const supabase = await createClient();
    const headlines = await fetchResmiGazeteHeadlines();
    let ok = 0, fail = 0, newCount = 0, updatedCount = 0;

    for (const h of headlines) {
      try {
        // Önce bu başlığın daha önce kaydedilip kaydedilmediğini kontrol et
        const { data: existing } = await supabase
          .from('documents')
          .select('id, content, metadata')
          .eq('content', h)
          .eq('metadata->>source', 'resmigazete')
          .maybeSingle();

        if (!existing) {
          // Yeni başlık, kaydet
          await upsertDocument(h, { 
            source: 'resmigazete',
            date: new Date().toISOString().split('T')[0],
            updated: new Date().toISOString()
          }, supabase);
          newCount++;
        } else {
          // Mevcut başlık, güncelleme tarihini güncelle
          const currentMetadata = (existing.metadata as any) || {};
          await supabase
            .from('documents')
            .update({ 
              metadata: { 
                ...currentMetadata,
                source: 'resmigazete',
                date: currentMetadata.date || new Date().toISOString().split('T')[0],
                updated: new Date().toISOString()
              }
            })
            .eq('id', existing.id);
          updatedCount++;
        }
        ok++;
      } catch (err) {
        console.error('Upsert error for headline:', h, err);
        fail++;
      }
    }

    return {
      success: true,
      total: headlines.length,
      ok,
      fail,
      new: newCount,
      updated: updatedCount,
      message: `Başarılı: ${ok}, Hatalı: ${fail}, Yeni: ${newCount}, Güncellenen: ${updatedCount}`
    };
  } catch (error: any) {
    console.error('Sync error:', error);
    return {
      success: false,
      error: error.message,
      message: `Hata: ${error.message}`
    };
  }
}

export async function POST() {
  const result = await syncResmiGazete();
  return Response.json(result, { status: result.success ? 200 : 500 });
}

// GET endpoint - Cron job ve manuel çağrılar için
export async function GET(req: Request) {
  // Vercel cron job'ları otomatik olarak authorization header ekler
  // Manuel çağrılar için opsiyonel kontrol
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncResmiGazete();
  return Response.json(result, { status: result.success ? 200 : 500 });
}





