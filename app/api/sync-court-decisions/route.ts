import { fetchYargitayKararlari } from '@/lib/fetchYargitayKararlari';
import { fetchDanistayKararlari } from '@/lib/fetchDanistayKararlari';
import { fetchAnayasaMahkemesiKararlari } from '@/lib/fetchAnayasaMahkemesiKararlari';
import { fetchKVKKKararlari } from '@/lib/fetchKVKKKararlari';
import { fetchTBMM } from '@/lib/fetchTBMM';
import { fetchMBS } from '@/lib/fetchMBS';
import { fetchCongressGov } from '@/lib/fetchCongressGov';
import { fetchSCOTUS } from '@/lib/fetchSCOTUS';
import { fetchCourtListener } from '@/lib/fetchCourtListener';
import { fetchOpenJurist } from '@/lib/fetchOpenJurist';
import { fetchGovInfo, fetchUSCode, fetchFederalRegister } from '@/lib/fetchGovInfo';
import { fetchLibraryOfCongress } from '@/lib/fetchLibraryOfCongress';
import { fetchStateLaws } from '@/lib/fetchStateLaws';
import { fetchUKLegislation } from '@/lib/fetchUKLegislation';
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
    let tbmmOk = 0, tbmmFail = 0, tbmmNew = 0;
    let mbsOk = 0, mbsFail = 0, mbsNew = 0;
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

    // TBMM kanun ve tasarılarını çek ve kaydet
    try {
      const tbmmLaws = await fetchTBMM();
      for (const law of tbmmLaws) {
        try {
          const content = `${law.title}${law.content ? '\n' + law.content : ''}`;
          
          // Daha önce kaydedilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'tbmm')
            .maybeSingle();

          if (!existing) {
            await upsertDocument(content, {
              source: 'tbmm',
              date: law.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: law.title.includes('Tasarı') ? 'tasarı' : 'kanun'
            }, supabase);
            tbmmNew++;
          }
          tbmmOk++;
        } catch (err) {
          console.error('TBMM kanun/tasarı kayıt hatası:', err);
          tbmmFail++;
        }
      }
    } catch (err) {
      console.error('TBMM fetch hatası:', err);
    }

    // MBS (Mevzuat Bilgi Sistemi) mevzuatlarını çek ve kaydet
    try {
      const mbsRegulations = await fetchMBS();
      for (const regulation of mbsRegulations) {
        try {
          const content = `${regulation.title}${regulation.content ? '\n' + regulation.content : ''}`;
          
          // Daha önce kaydedilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'mbs')
            .maybeSingle();

          if (!existing) {
            await upsertDocument(content, {
              source: 'mbs',
              date: regulation.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'mevzuat'
            }, supabase);
            mbsNew++;
          }
          mbsOk++;
        } catch (err) {
          console.error('MBS mevzuat kayıt hatası:', err);
          mbsFail++;
        }
      }
    } catch (err) {
      console.error('MBS fetch hatası:', err);
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
              country: 'US',
              level: 'Federal'
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
              country: 'US',
              level: 'Federal',
              court: 'U.S. Supreme Court'
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
              country: 'US',
              level: 'Federal' // CourtListener genelde federal mahkemeler
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
              country: 'US',
              level: 'Federal' // OpenJurist genelde federal mahkemeler
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

    // GovInfo - Bills
    try {
      const govinfoBills = await fetchGovInfo('bills');
      for (const bill of govinfoBills) {
        try {
          const content = `${bill.title}${bill.content ? '\n' + bill.content : ''}`;
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'govinfo')
            .maybeSingle();
          if (!existing) {
            await upsertDocument(content, {
              source: 'govinfo',
              date: bill.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'federal_legislation',
              country: 'US',
              level: 'Federal'
            }, supabase);
            govinfoNew++;
          }
          govinfoOk++;
        } catch (err) {
          console.error('GovInfo bill kayıt hatası:', err);
          govinfoFail++;
        }
      }
    } catch (err) {
      console.error('GovInfo fetch hatası:', err);
    }

    // US Code
    try {
      const usCodeDocs = await fetchUSCode();
      for (const doc of usCodeDocs) {
        try {
          const content = `${doc.title}${doc.content ? '\n' + doc.content : ''}`;
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'uscode')
            .maybeSingle();
          if (!existing) {
            await upsertDocument(content, {
              source: 'uscode',
              date: doc.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'federal_code',
              country: 'US',
              level: 'Federal'
            }, supabase);
            uscodeNew++;
          }
          uscodeOk++;
        } catch (err) {
          console.error('US Code kayıt hatası:', err);
          uscodeFail++;
        }
      }
    } catch (err) {
      console.error('US Code fetch hatası:', err);
    }

    // Federal Register
    try {
      const frDocs = await fetchFederalRegister();
      for (const doc of frDocs) {
        try {
          const content = `${doc.title}${doc.content ? '\n' + doc.content : ''}`;
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'federalregister')
            .maybeSingle();
          if (!existing) {
            await upsertDocument(content, {
              source: 'federalregister',
              date: doc.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'federal_register',
              country: 'US',
              level: 'Federal'
            }, supabase);
            federalregisterNew++;
          }
          federalregisterOk++;
        } catch (err) {
          console.error('Federal Register kayıt hatası:', err);
          federalregisterFail++;
        }
      }
    } catch (err) {
      console.error('Federal Register fetch hatası:', err);
    }

    // Library of Congress
    try {
      const locDocs = await fetchLibraryOfCongress();
      for (const doc of locDocs) {
        try {
          const content = `${doc.title}${doc.content ? '\n' + doc.content : ''}`;
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'loc')
            .maybeSingle();
          if (!existing) {
            await upsertDocument(content, {
              source: 'loc',
              date: doc.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'federal_legislation',
              country: 'US',
              level: 'Federal'
            }, supabase);
            locNew++;
          }
          locOk++;
        } catch (err) {
          console.error('LOC kayıt hatası:', err);
          locFail++;
        }
      }
    } catch (err) {
      console.error('LOC fetch hatası:', err);
    }

    // State Laws (NY, CA, DE)
    try {
      const stateLaws = await fetchStateLaws(['ny', 'ca', 'de']);
      for (const law of stateLaws) {
        try {
          const content = `${law.title}${law.content ? '\n' + law.content : ''}`;
          const state = law.title.includes('NY') ? 'ny' : law.title.includes('CA') ? 'ca' : 'de';
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', state)
            .maybeSingle();
          if (!existing) {
            await upsertDocument(content, {
              source: state,
              date: law.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: 'state_legislation',
              country: 'US',
              state: state.toUpperCase(), // 'NY', 'CA', 'DE'
              level: 'State' // Eyalet seviyesi
            }, supabase);
            statelawsNew++;
          }
          statelawsOk++;
        } catch (err) {
          console.error('State law kayıt hatası:', err);
          statelawsFail++;
        }
      }
    } catch (err) {
      console.error('State laws fetch hatası:', err);
    }

    // UK Legislation (legislation.gov.uk)
    try {
      const ukLegislation = await fetchUKLegislation(20);
      for (const item of ukLegislation) {
        try {
          const content = `${item.title}${item.content ? '\n' + item.content : ''}`;
          
          const { data: existing } = await supabase
            .from('documents')
            .select('id')
            .eq('content', content)
            .eq('metadata->>source', 'uk')
            .maybeSingle();
          
          if (!existing) {
            await upsertDocument(content, {
              source: 'uk',
              date: item.date || new Date().toISOString().split('T')[0],
              updated: new Date().toISOString(),
              type: item.title.includes('SI') ? 'statutory_instrument' : 'act',
              country: 'UK',
              level: 'National' // UK national legislation
            }, supabase);
            ukNew++;
          }
          ukOk++;
        } catch (err) {
          console.error('UK legislation kayıt hatası:', err);
          ukFail++;
        }
      }
    } catch (err) {
      console.error('UK legislation fetch hatası:', err);
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
      govinfo: {
        total: govinfoOk + govinfoFail,
        ok: govinfoOk,
        fail: govinfoFail,
        new: govinfoNew
      },
      uscode: {
        total: uscodeOk + uscodeFail,
        ok: uscodeOk,
        fail: uscodeFail,
        new: uscodeNew
      },
      federalregister: {
        total: federalregisterOk + federalregisterFail,
        ok: federalregisterOk,
        fail: federalregisterFail,
        new: federalregisterNew
      },
      loc: {
        total: locOk + locFail,
        ok: locOk,
        fail: locFail,
        new: locNew
      },
      statelaws: {
        total: statelawsOk + statelawsFail,
        ok: statelawsOk,
        fail: statelawsFail,
        new: statelawsNew
      },
      uk: {
        total: ukOk + ukFail,
        ok: ukOk,
        fail: ukFail,
        new: ukNew
      },
      message: `TR: Yargıtay: ${yargitayOk} (${yargitayNew} yeni) | Danıştay: ${danistayOk} (${danistayNew} yeni) | Anayasa: ${anayasaOk} (${anayasaNew} yeni) | KVKK: ${kvkkOk} (${kvkkNew} yeni) | TBMM: ${tbmmOk} (${tbmmNew} yeni) | MBS: ${mbsOk} (${mbsNew} yeni) | US: Congress.gov: ${congressOk} (${congressNew} yeni) | SCOTUS: ${scotusOk} (${scotusNew} yeni) | CourtListener: ${courtlistenerOk} (${courtlistenerNew} yeni) | OpenJurist: ${openjuristOk} (${openjuristNew} yeni) | GovInfo: ${govinfoOk} (${govinfoNew} yeni) | US Code: ${uscodeOk} (${uscodeNew} yeni) | Federal Register: ${federalregisterOk} (${federalregisterNew} yeni) | LOC: ${locOk} (${locNew} yeni) | State Laws: ${statelawsOk} (${statelawsNew} yeni) | UK: Legislation.gov.uk: ${ukOk} (${ukNew} yeni)`
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

