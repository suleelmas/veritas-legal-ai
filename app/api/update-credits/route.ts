import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { user_key, purchased_package } = await req.json();
    // Shopier webhooksdan veya admin panelden: purchased_package="basic" ise 10, pro 50, elite 9999
    let credit = 1;
    if (purchased_package === "basic") credit = 10;
    else if (purchased_package === "professional" || purchased_package === "pro") credit = 50;
    else if (purchased_package === "elite") credit = 9999;

    // Kullanıcı zaten varsa üzerine yazar yoksa ekler
    await supabase
      .from("user_credits")
      .upsert({ user_key, purchased_package, credit }, { onConflict: 'user_key' });

    return NextResponse.json({ success: true, message: `Kullanıcıya (${purchased_package}) ${credit} analiz hakkı tanımlandı.` });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}




