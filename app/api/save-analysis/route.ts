import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user_id, file_name, report } = await req.json();
    if (!user_id || !file_name || !report) {
      return NextResponse.json({ error: "Eksik veri." }, { status: 400 });
    }
    // Kullanıcıya özel insert
    const { data, error } = await supabase.from('analyses').insert({
      user_id,
      file_name,
      report
    }).select();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err))}, { status: 500 });
  }
}











