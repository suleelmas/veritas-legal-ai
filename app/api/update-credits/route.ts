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
    const { action } = await req.json();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // user_key oluştur
    const userKey = getUserKey(req);
    
    if (action === 'decrement') {
      // Kredi azalt
      const { data: creditRow } = await supabase
        .from("user_credits")
        .select("credit")
        .eq("user_key", userKey)
        .maybeSingle();
      
      if (creditRow && creditRow.credit > 0) {
        await supabase
          .from("user_credits")
          .update({ credit: creditRow.credit - 1 })
          .eq("user_key", userKey);
      }
    } else if (action === 'increment') {
      // Credits may only be granted by a verified payment/server-side flow.
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update credits error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
