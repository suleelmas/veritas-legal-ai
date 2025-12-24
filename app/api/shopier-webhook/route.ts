import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isValidShopierRequest(req: Request) {
  const user = req.headers.get("shopier-osb-user");
  const pass = req.headers.get("shopier-osb-pass");
  return (
    user === process.env.SHOPIER_OSB_USER &&
    pass === process.env.SHOPIER_OSB_PASS
  );
}

export async function POST(req: Request) {
  try {
    if (!isValidShopierRequest(req)) {
      console.log("Shopier güvenlik kontrolü başarısız!");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // Shopier'in dökümantasyonu örneği: {status, email, purchased_package}
    const { status, email, purchased_package } = body;
    if (status !== "success" || !email) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    let creditsToAdd = 0;
    if (purchased_package?.toLowerCase().includes("basic")) creditsToAdd = 10;
    else if (purchased_package?.toLowerCase().includes("pro")) creditsToAdd = 50;
    else if (
      purchased_package?.toLowerCase().includes("elite") ||
      purchased_package?.toLowerCase().includes("enterprise")
    ) creditsToAdd = 9999;

    // user_credits tablosunda var mı?
    const { data: userRow } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_email", email)
      .maybeSingle();

    if (userRow) {
      // Zaten kayıtlıysa, eski kredilere ekle
      await supabase
        .from("user_credits")
        .update({ credits: userRow.credits + creditsToAdd, plan_type: purchased_package })
        .eq("user_email", email);
    } else {
      // Yeni kullanıcıya hak tanımla
      await supabase
        .from("user_credits")
        .insert({ user_email: email, credits: creditsToAdd, plan_type: purchased_package });
    }

    console.log("Ödeme Başarılı: " + email);
    return NextResponse.json({ success: true, message: `Ödeme Başarılı: ${email}` });
  } catch (err) {
    console.error("Shopier Webhook Hatası:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

