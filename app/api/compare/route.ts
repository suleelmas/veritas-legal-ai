import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { pdfText1, pdfText2, targetLang } = await req.json();

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL || '';
    const isAdmin = !!(user.email && adminEmail && user.email.toLowerCase() === adminEmail.toLowerCase());

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('package_type')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[Compare API] Profile lookup failed:', profileError.message);
      return NextResponse.json({ error: "Unable to verify plan" }, { status: 503 });
    }

    const userPackage = profile?.package_type || 'free';
    const isGlobalPackage = isAdmin || userPackage === 'enterprise' || userPackage === 'quantum_global';

    if (!pdfText1 || !pdfText2) {
      return NextResponse.json({ error: "Both documents are required" }, { status: 400 });
    }

    // Paket kontrolü yalnızca sunucuda doğrulanmış profil bilgisine dayanır.
    if (!isAdmin && userPackage !== 'professional' && !isGlobalPackage) {
      return NextResponse.json({ 
        error: "Document comparison requires Professional or Global package",
        requiresUpgrade: true 
      }, { status: 403 });
    }

    // Dil tespiti (Professional için aynı dil kontrolü)
    const detectLanguage = (text: string): string => {
      // Basit dil tespiti
      if (/[ğüşıöçĞÜŞİÖÇ]/.test(text)) return 'TR';
      if (/[äöüßÄÖÜ]/.test(text)) return 'DE';
      if (/[àâäéèêëïîôùûüÿç]/.test(text)) return 'FR';
      return 'EN';
    };

    const lang1 = detectLanguage(pdfText1);
    const lang2 = detectLanguage(pdfText2);

    // Professional paket için aynı dil kontrolü
    if (!isAdmin && userPackage === 'professional' && lang1 !== lang2) {
      return NextResponse.json({ 
        error: "Professional package only supports same-language comparison. Upgrade to Global for cross-language comparison.",
        requiresUpgrade: true 
      }, { status: 403 });
    }

    // AI Prompt oluştur
    const comparisonPrompt = isGlobalPackage && lang1 !== lang2
      ? `Bu iki dökümanı karşılaştır. İlk döküman ${lang1} dilinde, ikinci döküman ${lang2} dilindedir. Çeviri doğruluğunu kontrol et ve hukuki anlam kaymalarını tespit et. Özellikle:
- Çeviride kaybolan veya değişen hukuki terimler
- Farklı yargı sistemlerindeki karşılıklar
- Risk seviyesindeki değişimler
- Aleyhe değişen maddeler
Format: [Madde/Bölüm] | [Değişiklik Tipi] | [Risk Etkisi: Artmış/Azalmış] | [Açıklama]`
      : `Bu iki dökümanı karşılaştır. Aradaki farkları maddeler halinde çıkar. Özellikle:
- Riskli değişiklikler
- Eklenen gizli yükümlülükler
- Aleyhe olan ifadeler
- Silinen haklar veya eklenen riskler
Format: [Madde/Bölüm] | [Değişiklik Tipi: Eklendi/Silindi/Değiştirildi] | [Risk Etkisi: Artmış/Azalmış] | [Açıklama]`;

    const systemPrompt = `Sen profesyonel bir hukuk analistisin. Analizini ${targetLang} dilinde yap. İki döküman arasındaki farkları detaylı bir şekilde karşılaştır ve raporla.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${comparisonPrompt}\n\nİlk Döküman:\n${pdfText1.substring(0, 15000)}\n\nİkinci Döküman:\n${pdfText2.substring(0, 15000)}` }
      ],
      temperature: 0.3,
    });

    const comparisonResult = response.choices[0].message.content || 'Comparison complete';

    // Farkları parse et
    const differences: Array<{
      section: string;
      changeType: string;
      riskImpact: string;
      description: string;
    }> = [];

    const diffRegex = /\[([^\]]+)\]\s*\|\s*\[([^\]]+)\]\s*\|\s*\[([^\]]+)\]\s*\|\s*\[([^\]]+)\]/g;
    const matches = comparisonResult.matchAll(diffRegex);
    for (const match of matches) {
      differences.push({
        section: match[1] || '',
        changeType: match[2] || '',
        riskImpact: match[3] || '',
        description: match[4] || ''
      });
    }

    return NextResponse.json({ 
      reply: comparisonResult,
      differences: differences.length > 0 ? differences : null,
      isCrossLanguage: lang1 !== lang2 && isGlobalPackage
    });
  } catch (error: any) {
    console.error('Comparison API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

