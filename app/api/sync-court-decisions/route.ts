import { fetchYargitayKararlari } from '@/lib/fetchYargitayKararlari';
import { fetchDanistayKararlari } from '@/lib/fetchDanistayKararlari';
import { fetchAnayasaMahkemesiKararlari } from '@/lib/fetchAnayasaMahkemesiKararlari';
import { fetchKVKKKararlari } from '@/lib/fetchKVKKKararlari';
import { fetchCongressGov } from '@/lib/fetchCongressGov';
import { fetchSCOTUS } from '@/lib/fetchSCOTUS';
import { fetchCourtListener } from '@/lib/fetchCourtListener';
import { fetchOpenJurist } from '@/lib/fetchOpenJurist';
import { upsertDocument } from '@/lib/upsertDocument';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 dakika timeout

async function syncCourtDecisions() {
  try {
    const supabase = await createClient();
    let yargitayOk = 0, yargitayFail = 0, yargitayNew = 0;
    let danistayOk = 0, danistayFail = 0, danistayNew = 0;
    let anayasaOk = 0, anayasaFail = 0, anayasaNew = 0;
    let kvkkOk = 0, kvkkFail = 0, kvkkNew = 0;
    let congressOk = 0, congressFail = 0, congressNew = 0;
    let scotusOk = 0, scotusFail = 0, scotusNew = 0;
    let courtlistenerOk = 0, courtlistenerFail = 0, courtlistenerNew = 0;
    let openjuristOk = 0, openjuristFail = 0, openjuristNew = 0;

    // Yargıtay kararlarını çek ve kaydet
    try {
      const yargitayDecisions = await fetchYargitayKararlari();
      for (const decision of yargitayDecisions) {
        try {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          
          // Daha önce kaydedilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'yargitay')
            .maybeSingle();

          if (!existing) {
            await upsertDocument(content, {
              source: 'yargitay',
              date: decision.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'karar'
            }, supabase);
            yargitayNew++;
          }
          yargitayOk++;
        } catch (err) {
          console.error('Yargıtay karar kayıt hatası:', err);
          yargitayFail++;
        }
      }
    } catch (err) {
      console.error('Yargıtay fetch hatası:', err);
    }

    // Danıştay kararlarını çek ve kaydet
    try {
      const danistayDecisions = await fetchDanistayKararlari();
      for (const decision of danistayDecisions) {
        try {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          
          // Daha önce kaydedilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'danistay')
            .maybeSingle();

          if (!existing) {
            await upsertDocument(content, {
              source: 'danistay',
              date: decision.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'karar'
            }, supabase);
            danistayNew++;
          }
          danistayOk++;
        } catch (err) {
          console.error('Danıştay karar kayıt hatası:', err);
          danistayFail++;
        }
      }
    } catch (err) {
      console.error('Danıştay fetch hatası:', err);
    }

    // Anayasa Mahkemesi kararlarını çek ve kaydet
    try {
      const anayasaDecisions = await fetchAnayasaMahkemesiKararlari();
      for (const decision of anayasaDecisions) {
        try {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          
          // Daha önce kaydedilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'anayasa')
            .maybeSingle();

          if (!existing) {
            await upsertDocument(content, {
              source: 'anayasa',
              date: decision.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'karar'
            }, supabase);
            anayasaNew++;
          }
          anayasaOk++;
        } catch (err) {
          console.error('Anayasa Mahkemesi karar kayıt hatası:', err);
          anayasaFail++;
        }
      }
    } catch (err) {
      console.error('Anayasa Mahkemesi fetch hatası:', err);
    }

    // KVKK kararlarını çek ve kaydet
    try {
      const kvkkDecisions = await fetchKVKKKararlari();
      for (const decision of kvkkDecisions) {
        try {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          
          // Daha önce kaydedilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'kvkk')
            .maybeSingle();

          if (!existing) {
            await upsertDocument(content, {
              source: 'kvkk',
              date: decision.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'karar'
            }, supabase);
            kvkkNew++;
          }
          kvkkOk++;
        } catch (err) {
          console.error('KVKK karar kayıt hatası:', err);
          kvkkFail++;
        }
      }
    } catch (err) {
      console.error('KVKK fetch hatası:', err);
    }

    // Congress.gov federal mevzuatını çek ve kaydet
    try {
      const congressBills = await fetchCongressGov();
      for (const bill of congressBills) {
        try {
          const content = `${bill.title}${bill.content ? '\n' + bill.content : ''}`;
          
          // Daha önce kaydedilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'congress')
            .maybeSingle();

          if (!existing) {
            await upsertDocument(content, {
              source: 'congress',
              date: bill.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'federal_legislation',
              country: 'US'
            }, supabase);
            congressNew++;
          }
          congressOk++;
        } catch (err) {
          console.error('Congress.gov yasa kayıt hatası:', err);
          congressFail++;
        }
      }
    } catch (err) {
      console.error('Congress.gov fetch hatası:', err);
    }

    // SCOTUS (Supreme Court of the United States) kararlarını çek ve kaydet
    try {
      const scotusDecisions = await fetchSCOTUS();
      for (const decision of scotusDecisions) {
        try {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          
          // Daha önce kaydedilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'scotus')
            .maybeSingle();

          if (!existing) {
            await upsertDocument(content, {
              source: 'scotus',
              date: decision.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'supreme_court_decision',
              country: 'US'
            }, supabase);
            scotusNew++;
          }
          scotusOk++;
        } catch (err) {
          console.error('SCOTUS karar kayıt hatası:', err);
          scotusFail++;
        }
      }
    } catch (err) {
      console.error('SCOTUS fetch hatası:', err);
    }

    // CourtListener kararlarını çek ve kaydet
    try {
      const courtlistenerDecisions = await fetchCourtListener();
      for (const decision of courtlistenerDecisions) {
        try {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          
          // Daha önce kaydedilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'courtlistener')
            .maybeSingle();

          if (!existing) {
            await upsertDocument(content, {
              source: 'courtlistener',
              date: decision.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'court_decision',
              country: 'US'
            }, supabase);
            courtlistenerNew++;
          }
          courtlistenerOk++;
        } catch (err) {
          console.error('CourtListener karar kayıt hatası:', err);
          courtlistenerFail++;
        }
      }
    } catch (err) {
      console.error('CourtListener fetch hatası:', err);
    }

    // OpenJurist kararlarını çek ve kaydet
    try {
      const openjuristDecisions = await fetchOpenJurist();
      for (const decision of openjuristDecisions) {
        try {
          const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
          
          // Daha önce kaydedilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'openjurist')
            .maybeSingle();

          if (!existing) {
            await upsertDocument(content, {
              source: 'openjurist',
              date: decision.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'court_decision',
              country: 'US'
            }, supabase);
            openjuristNew++;
          }
          openjuristOk++;
        } catch (err) {
          console.error('OpenJurist karar kayıt hatası:', err);
          openjuristFail++;
        }
      }
    } catch (err) {
      console.error('OpenJurist fetch hatası:', err);
    }

    return {
      success: true,
      yargitay: {
        total: yargitayOk + yargitayFail,
        ok: yargitayOk,
        fail: yargitayFail,
        new: yargitayNew
      },
      danistay: {
        total: danistayOk + danistayFail,
        ok: danistayOk,
        fail: danistayFail,
        new: danistayNew
      },
      anayasa: {
        total: anayasaOk + anayasaFail,
        ok: anayasaOk,
        fail: anayasaFail,
        new: anayasaNew
      },
      kvkk: {
        total: kvkkOk + kvkkFail,
        ok: kvkkOk,
        fail: kvkkFail,
        new: kvkkNew
      },
      congress: {
        total: congressOk + congressFail,
        ok: congressOk,
        fail: congressFail,
        new: congressNew
      },
      scotus: {
        total: scotusOk + scotusFail,
        ok: scotusOk,
        fail: scotusFail,
        new: scotusNew
      },
      courtlistener: {
        total: courtlistenerOk + courtlistenerFail,
        ok: courtlistenerOk,
        fail: courtlistenerFail,
        new: courtlistenerNew
      },
      openjurist: {
        total: openjuristOk + openjuristFail,
        ok: openjuristOk,
        fail: openjuristFail,
        new: openjuristNew
      },
      message: `Yargıtay: ${yargitayOk} başarılı (${yargitayNew} yeni), ${yargitayFail} hatalı | Danıştay: ${danistayOk} başarılı (${danistayNew} yeni), ${danistayFail} hatalı | Anayasa: ${anayasaOk} başarılı (${anayasaNew} yeni), ${anayasaFail} hatalı | KVKK: ${kvkkOk} başarılı (${kvkkNew} yeni), ${kvkkFail} hatalı | Congress.gov: ${congressOk} başarılı (${congressNew} yeni), ${congressFail} hatalı | SCOTUS: ${scotusOk} başarılı (${scotusNew} yeni), ${scotusFail} hatalı | CourtListener: ${courtlistenerOk} başarılı (${courtlistenerNew} yeni), ${courtlistenerFail} hatalı | OpenJurist: ${openjuristOk} başarılı (${openjuristNew} yeni), ${openjuristFail} hatalı`
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
  const result = await syncCourtDecisions();
  return Response.json(result, { status: result.success ? 200 : 500 });
}

// GET endpoint - Cron job için
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncCourtDecisions();
  return Response.json(result, { status: result.success ? 200 : 500 });
}

