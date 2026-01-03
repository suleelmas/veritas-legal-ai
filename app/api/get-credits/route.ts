import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function getUserKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const ua = req.headers.get("user-agent") || "";
  return `${ip}_${ua}`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { userId } = await req.json();
    
    // Session kontrolü
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ credits: 0 }, { status: 200 });
    }
    
    // user_key oluştur
    const userKey = getUserKey(req);
    
    // Kredileri çek
    const { data: creditRow } = await supabase
      .from("user_credits")
      .select("credit")
      .eq("user_key", userKey)
      .maybeSingle();
    
    return NextResponse.json({ credits: creditRow?.credit || 0 });
  } catch (error: any) {
    console.error("Get credits error:", error);
    return NextResponse.json({ credits: 0 }, { status: 500 });
  }
}

