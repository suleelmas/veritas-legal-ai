import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const formData = await req.formData();
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const screenshot = formData.get('screenshot') as File | null;
    const { data: { user } } = await supabase.auth.getUser();

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    // Screenshot'ı base64'e çevir (eğer varsa)
    let screenshotBase64: string | null = null;
    if (screenshot) {
      const arrayBuffer = await screenshot.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      screenshotBase64 = buffer.toString('base64');
    }

    // Feedback'i Supabase'e kaydet
    const { data, error } = await supabase
      .from('feedbacks')
      .insert({
        user_id: user?.id || null,
        user_email: user?.email || null,
        title,
        description,
        status: 'pending',
        screenshot: screenshotBase64,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

