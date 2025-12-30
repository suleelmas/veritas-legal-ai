import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { fetchResmiGazeteHeadlines } from '@/lib/fetchResmiGazeteHeadlines';
import { fetchYargitayKararlari } from '@/lib/fetchYargitayKararlari';
import { fetchDanistayKararlari } from '@/lib/fetchDanistayKararlari';
import { fetchAnayasaMahkemesiKararlari } from '@/lib/fetchAnayasaMahkemesiKararlari';
import { fetchKVKKKararlari } from '@/lib/fetchKVKKKararlari';
import { fetchCongressGov } from '@/lib/fetchCongressGov';
import { fetchSCOTUS } from '@/lib/fetchSCOTUS';
import { fetchCourtListener } from '@/lib/fetchCourtListener';
import { fetchOpenJurist } from '@/lib/fetchOpenJurist';
import { upsertDocument } from '@/lib/upsertDocument';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 dakika timeout

interface SyncResult {
  success: boolean;
  source: string;
  new: number;
  updated: number;
  error?: string;
}

async function syncAllSources(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const supabase = await createClient();

  // 1. Resmi Gazete
  try {
    const headlines = await fetchResmiGazeteHeadlines();
    let newCount = 0, updatedCount = 0;
    
    for (const h of headlines) {
      try {
        const { data: existing } = await supabase
          .from('documents')
          .select('id, metadata')
          .eq('content', h)
          .eq('metadata->>source', 'resmigazete')
          .maybeSingle();

        if (!existing) {
          await upsertDocument(h, { 
            source: 'resmigazete',
            date: new Date().toISOString().split('T')[0],
            updated: new Date().toISOString()
          }, supabase);
          newCount++;
        } else {
          const currentMetadata = (existing.metadata as any) || {};
          await supabase
            .from('documents')
            .update({ 
              metadata: { 
                ...currentMetadata,
                updated: new Date().toISOString()
              }
            })
            .eq('id', existing.id);
          updatedCount++;
        }
      } catch (err) {
        console.error('Resmi Gazete upsert error:', err);
      }
    }
    results.push({ success: true, source: 'resmigazete', new: newCount, updated: updatedCount });
  } catch (error: any) {
    results.push({ success: false, source: 'resmigazete', new: 0, updated: 0, error: error.message });
  }

  // 2. Yargıtay
  try {
    const decisions = await fetchYargitayKararlari();
    let newCount = 0;
    
    for (const decision of decisions) {
      try {
        const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
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
          newCount++;
        }
      } catch (err) {
        console.error('Yargıtay upsert error:', err);
      }
    }
    results.push({ success: true, source: 'yargitay', new: newCount, updated: 0 });
  } catch (error: any) {
    results.push({ success: false, source: 'yargitay', new: 0, updated: 0, error: error.message });
  }

  // 3. Danıştay
  try {
    const decisions = await fetchDanistayKararlari();
    let newCount = 0;
    
    for (const decision of decisions) {
      try {
        const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
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
          newCount++;
        }
      } catch (err) {
        console.error('Danıştay upsert error:', err);
      }
    }
    results.push({ success: true, source: 'danistay', new: newCount, updated: 0 });
  } catch (error: any) {
    results.push({ success: false, source: 'danistay', new: 0, updated: 0, error: error.message });
  }

  // 4. Anayasa Mahkemesi
  try {
    const decisions = await fetchAnayasaMahkemesiKararlari();
    let newCount = 0;
    
    for (const decision of decisions) {
      try {
        const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
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
          newCount++;
        }
      } catch (err) {
        console.error('Anayasa upsert error:', err);
      }
    }
    results.push({ success: true, source: 'anayasa', new: newCount, updated: 0 });
  } catch (error: any) {
    results.push({ success: false, source: 'anayasa', new: 0, updated: 0, error: error.message });
  }

  // 5. KVKK
  try {
    const decisions = await fetchKVKKKararlari();
    let newCount = 0;
    
    for (const decision of decisions) {
      try {
        const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
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
          newCount++;
        }
      } catch (err) {
        console.error('KVKK upsert error:', err);
      }
    }
    results.push({ success: true, source: 'kvkk', new: newCount, updated: 0 });
  } catch (error: any) {
    results.push({ success: false, source: 'kvkk', new: 0, updated: 0, error: error.message });
  }

  // 6. Congress.gov
  try {
    const bills = await fetchCongressGov();
    let newCount = 0;
    
    for (const bill of bills) {
      try {
        const content = `${bill.title}${bill.content ? '\n' + bill.content : ''}`;
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
          newCount++;
        }
      } catch (err) {
        console.error('Congress upsert error:', err);
      }
    }
    results.push({ success: true, source: 'congress', new: newCount, updated: 0 });
  } catch (error: any) {
    results.push({ success: false, source: 'congress', new: 0, updated: 0, error: error.message });
  }

  // 7. SCOTUS
  try {
    const decisions = await fetchSCOTUS();
    let newCount = 0;
    
    for (const decision of decisions) {
      try {
        const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
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
          newCount++;
        }
      } catch (err) {
        console.error('SCOTUS upsert error:', err);
      }
    }
    results.push({ success: true, source: 'scotus', new: newCount, updated: 0 });
  } catch (error: any) {
    results.push({ success: false, source: 'scotus', new: 0, updated: 0, error: error.message });
  }

  // 8. CourtListener
  try {
    const decisions = await fetchCourtListener();
    let newCount = 0;
    
    for (const decision of decisions) {
      try {
        const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
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
          newCount++;
        }
      } catch (err) {
        console.error('CourtListener upsert error:', err);
      }
    }
    results.push({ success: true, source: 'courtlistener', new: newCount, updated: 0 });
  } catch (error: any) {
    results.push({ success: false, source: 'courtlistener', new: 0, updated: 0, error: error.message });
  }

  // 9. OpenJurist
  try {
    const decisions = await fetchOpenJurist();
    let newCount = 0;
    
    for (const decision of decisions) {
      try {
        const content = `${decision.title}${decision.content ? '\n' + decision.content : ''}`;
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
          newCount++;
        }
      } catch (err) {
        console.error('OpenJurist upsert error:', err);
      }
    }
    results.push({ success: true, source: 'openjurist', new: newCount, updated: 0 });
  } catch (error: any) {
    results.push({ success: false, source: 'openjurist', new: 0, updated: 0, error: error.message });
  }

  return results;
}

export async function GET(req: Request) {
  // Vercel Cron Jobs için authorization kontrolü
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await syncAllSources();
  const successCount = results.filter(r => r.success).length;
  const totalNew = results.reduce((sum, r) => sum + r.new, 0);
  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);

  return NextResponse.json({
    success: successCount > 0,
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalSources: results.length,
      successful: successCount,
      failed: results.length - successCount,
      totalNew,
      totalUpdated
    }
  });
}

export async function POST() {
  const results = await syncAllSources();
  return NextResponse.json({ results });
}

