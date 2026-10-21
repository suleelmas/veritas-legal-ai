import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
    if (!process.env.SHOPIER_OSB_USER || !process.env.SHOPIER_OSB_PASS) {
      console.error("[Shopier] OSB credentials are not configured.");
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const supabase = supabaseAdmin;
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
    const normalizedPackage = String(purchased_package || '').toLowerCase();
    if (normalizedPackage.includes("single") || normalizedPackage.includes("basic")) creditsToAdd = 1;
    else if (normalizedPackage.includes("professional") || normalizedPackage.includes("pro")) creditsToAdd = 5;
    else if (
      normalizedPackage.includes("quantum global") ||
      normalizedPackage.includes("global") ||
      normalizedPackage.includes("elite") ||
      normalizedPackage.includes("enterprise")
    ) creditsToAdd = 9999;

    if (creditsToAdd === 0) {
      console.error("[Shopier] Unknown purchased package.");
      return NextResponse.json({ error: "Unknown package" }, { status: 400 });
    }

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

    console.log("[Shopier] Payment processed successfully.");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Shopier Webhook Hatası:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

