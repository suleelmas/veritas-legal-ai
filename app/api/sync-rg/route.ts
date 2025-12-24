import { fetchResmiGazeteHeadlines } from '@/lib/fetchResmiGazeteHeadlines';
import { upsertDocument } from '@/lib/upsertDocument';

export const dynamic = 'force-dynamic';

export async function POST() {
  const headlines = await fetchResmiGazeteHeadlines();
  let ok = 0, fail = 0;
  for (const h of headlines) {
    try {
      await upsertDocument(h, { source: 'resmigazete' });
      ok++;
    } catch {
      fail++;
    }
  }
  return new Response(`Başarılı kayıt: ${ok}, Hatalı: ${fail}`, { status: 200 });
}




