import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { file_name, report } = await req.json();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!file_name || !report) {
      return NextResponse.json({ error: "Eksik veri." }, { status: 400 });
    }

    const { data, error } = await supabase.from('analyses').insert({
      user_id: user.id,
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











