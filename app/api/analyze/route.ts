import { NextResponse } from "next/server";
import OpenAI from 'openai';
import { supabase } from "@/lib/supabase";
import PDFParser from 'pdf2json';
import { applyWeightedRanking, getWeightedDocuments } from "@/lib/weightedSearch";
import { detectJurisdiction } from "@/lib/jurisdictionDetection";
import { getJurisdictionAnalysisInstructions } from "@/lib/legalSources/jurisdictionAnalysisInstructions";

// Runtime configuration for Next.js App Router
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET handler for debugging (404 hatasını önlemek için)
export async function GET(req: Request) {
  console.log('[API] GET /api/analyze çağrıldı - Bu endpoint sadece POST kabul eder');
  return NextResponse.json({ 
    error: 'Method not allowed',
    message: 'This endpoint only accepts POST requests',
    allowedMethods: ['POST']
  }, { status: 405 });
}

// Telegram Notification Helper
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8415963295:AAEgRJ3QX2ZBVsIh5lxiXhFOf_-7WTpIOdc";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8418884482";

async function sendTelegramNotification(message: string, isCritical: boolean = false) {
  try {
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const emoji = isCritical ? "🚨" : "📊";
    const formattedMessage = `${emoji} ${message}`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: formattedMessage,
        parse_mode: 'HTML'
      })
    });
    
    if (!response.ok) {
      console.error('Telegram notification failed:', await response.text());
    }
  } catch (error) {
    console.error('Telegram notification error:', error);
  }
}

// PDF Parse modülü artık standart import ile yükleniyor

function getUserKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const ua = req.headers.get("user-agent") || "";
  return `${ip}_${ua}`;
}


function getJurisdictionFilter(targetLang: string): Record<string, any> {
  const normalized = (targetLang || '').toLowerCase();

  if (normalized === 'tr' || normalized.includes('turkish')) {
    return { country: 'TR', embedding_model: 'text-embedding-3-small' };
  }

  if (normalized === 'de' || normalized.includes('german')) {
    return { country: 'DE', embedding_model: 'text-embedding-3-small' };
  }

  if (normalized === 'en-us' || normalized.includes('us') || normalized.includes('usa')) {
    return { country: 'US', embedding_model: 'text-embedding-3-large' };
  }

  if (normalized === 'en-gb' || normalized.includes('uk') || normalized.includes('british')) {
    // Mevcut upsertDocument fonksiyonunda UK ayrı ülke olarak işaretlenmemiş olabilir.
    // Bu yüzden önce UK aranır, sonuç yoksa küçük embedding modelindeki genel kaynaklara düşülür.
    return { country: 'UK', embedding_model: 'text-embedding-3-small' };
  }

  return { embedding_model: 'text-embedding-3-small' };
}

function getQueryEmbeddingModel(targetLang: string): string {
  const normalized = (targetLang || '').toLowerCase();

  // upsertDocument.ts içinde US kaynakları text-embedding-3-large ile kaydediliyor.
  if (normalized === 'en-us' || normalized.includes('us') || normalized.includes('usa')) {
    return 'text-embedding-3-large';
  }

  return 'text-embedding-3-small';
}

async function createQueryEmbedding(text: string, targetLang: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const model = getQueryEmbeddingModel(targetLang);

  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text.slice(0, 12000),
      model,
    }),
  });

  const data = await resp.json();

  if (!resp.ok || !data.data?.[0]?.embedding) {
    throw new Error(data.error?.message || "Embedding failed");
  }

  return data.data[0].embedding;
}

async function runVectorSearch(queryEmbedding: number[], filter: Record<string, any>, matchCount = 20) {
  console.log("[RAG DEBUG] vector search filter:", JSON.stringify(filter));

  return supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter,
  });
}
type SupportedJurisdiction = "TR" | "US" | "UK" | "DE";

async function retrieveLegalContext(
  pdfText: string,
  jurisdiction: SupportedJurisdiction
): Promise<string> {
  try {
    const embeddingModel = "text-embedding-3-small";

    const queryEmbedding = await createQueryEmbedding(
      pdfText,
      embeddingModel
    );

    const primaryFilter = {
      country: jurisdiction,
    };

    console.log(
      "[RAG DEBUG] selected jurisdiction:",
      jurisdiction
    );

    console.log(
      "[RAG DEBUG] strict country filter:",
      JSON.stringify(primaryFilter)
    );

    let searchResult = await runVectorSearch(
      queryEmbedding,
      primaryFilter,
      20
    );
    
    let data = searchResult.data;
    let error = searchResult.error;

    if (error) {
      console.error("RAG primary search error:", error);
    }

    if (error) {
      console.error("RAG search error:", error);
      return "";
    }

    if (!data || data.length === 0) {
      console.warn("RAG search returned no documents");
      return "";
    }

    const similarityByContent = new Map<string, number>();
    for (const d of data as any[]) {
      similarityByContent.set(d.content, d.similarity);
    }

    const weighted = applyWeightedRanking(
      (data as any[]).map((d: any) => ({
        content: d.content,
        metadata: d.metadata || {},
      })),
      pdfText
    );

    const finalDocs = getWeightedDocuments(weighted).slice(0, 12);

    return finalDocs
      .map((doc, index) => {
        const source = doc.metadata?.source || "unknown";
        const docCountry = doc.metadata?.country || doc.metadata?.source_country || "unknown";
        const date = doc.metadata?.date || doc.metadata?.updated || "unknown";
        const type = doc.metadata?.type || "legal_source";
        const similarity = similarityByContent.get(doc.content);

        return `
[KAYNAK ${index + 1}]
Source: ${source}
Country: ${docCountry}
Type: ${type}
Date: ${date}
Similarity: ${typeof similarity === "number" ? similarity.toFixed(4) : "unknown"}
Content:
${doc.content.slice(0, 2200)}
`;
      })
      .join("\n\n");
  } catch (err) {
    console.error("retrieveLegalContext error:", err);
    return "";
  }
}
function getValidSourceNumbers(legalContext: string): Set<number> {
  const validSources = new Set<number>();
  const matches = legalContext.matchAll(/\[KAYNAK\s+(\d+)\]/gi);

  for (const match of matches) {
    const sourceNumber = Number(match[1]);

    if (Number.isInteger(sourceNumber) && sourceNumber > 0) {
      validSources.add(sourceNumber);
    }
  }

  return validSources;
}

function hasValidSourceCitation(
  text: unknown,
  validSources: Set<number>
): boolean {
  if (typeof text !== "string") {
    return false;
  }

  const matches = text.matchAll(/\[KAYNAK\s+(\d+)\]/gi);

  for (const match of matches) {
    const sourceNumber = Number(match[1]);

    if (validSources.has(sourceNumber)) {
      return true;
    }
  }

  return false;
}

function parseLegalSources(legalContext: string): Map<number, string> {
  const sources = new Map<number, string>();

  const blocks = legalContext.split(/(?=\[KAYNAK\s+\d+\])/gi);

  for (const block of blocks) {
    const match = block.match(/\[KAYNAK\s+(\d+)\]/i);

    if (!match) continue;

    const sourceNumber = Number(match[1]);

    if (Number.isInteger(sourceNumber)) {
      sources.set(sourceNumber, block);
    }
  }

  return sources;
}

function normalizeForGrounding(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[§.,:;()[\]{}"'’`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCitedSourceNumbers(text: string): number[] {
  return Array.from(text.matchAll(/\[KAYNAK\s+(\d+)\]/gi))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function extractLegalClaims(text: string): string[] {
  const patterns = [
    /\bKVKK\s*(?:m\.?|madde)?\s*\d+(?:\/\d+)?/gi,
    /\b6698\s+sayılı\b/gi,
    /\bTBK\s*(?:m\.?|madde)?\s*\d+(?:\/\d+)?/gi,
    /\bTTK\s*(?:m\.?|madde)?\s*\d+(?:\/\d+)?/gi,
    /\bGDPR\s*(?:Art\.?|Article)?\s*\d+(?:\(\d+\))?/gi,
    /\bBGB\s*§+\s*\d+[a-z]?/gi,
    /\bUCC\s*(?:Article)?\s*\d+(?:-\d+)?/gi,
    /\bCISG\s*(?:Art\.?|Article)?\s*\d+/gi,
    /\b\d{4}\/\d+\s*E\.?\s*,?\s*\d{4}\/\d+\s*K\.?/gi,
    /\b\d[\d.,]*\s*(?:TL|TRY|EUR|USD|€|\$)\b/gi,
  ];

  const claims: string[] = [];

  for (const pattern of patterns) {
    const matches = text.match(pattern);

    if (matches) claims.push(...matches);
  }

  return claims;
}

function isClaimSupported(
  text: unknown,
  sources: Map<number, string>
): boolean {
  if (typeof text !== "string") return false;

  const citedNumbers = getCitedSourceNumbers(text);

  if (citedNumbers.length === 0) return false;

  const citedText = citedNumbers
    .map((number) => sources.get(number) || "")
    .join("\n");

  if (!citedText.trim()) return false;

  const claims = extractLegalClaims(text);

  // Spesifik hukuk iddiası yoksa, geçerli bir kaynak etiketi yeterlidir.
  if (claims.length === 0) return true;

  const normalizedSource = normalizeForGrounding(citedText);

  return claims.every((claim) => {
    const normalizedClaim = normalizeForGrounding(claim);

    return (
      normalizedClaim.length > 0 &&
      normalizedSource.includes(normalizedClaim)
    );
  });
}

function removeUnsupportedSentences(
  text: unknown,
  sources: Map<number, string>
): string {
  if (typeof text !== "string") return "";

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const cleaned = sentences.filter((sentence) => {
    const specificClaims = extractLegalClaims(sentence);

    // Spesifik kanun, karar veya tutar içermeyen genel açıklamayı koru.
    if (specificClaims.length === 0) return true;

    return isClaimSupported(sentence, sources);
  });

  return cleaned.join(" ").trim();
}

function sanitizeGroundedAnalysis(
  rawAnalysis: string,
  legalContext: string,
  pdfText: string
): string {
  try {
    const jsonStart = rawAnalysis.indexOf("{");
    const jsonEnd = rawAnalysis.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      console.warn("[GROUNDING] Geçerli JSON bulunamadı.");
      return rawAnalysis;
    }

    const parsed = JSON.parse(
      rawAnalysis.substring(jsonStart, jsonEnd + 1)
    );

    const sources = parseLegalSources(legalContext);
    const normalizedDocument = normalizeForGrounding(pdfText || "");

    console.log(
      "[GROUNDING] İçeriği kontrol edilen kaynaklar:",
      Array.from(sources.keys())
    );

    const cleanReferenceArray = (value: unknown): string[] => {
      if (!Array.isArray(value)) return [];

      return value.filter(
        (item): item is string =>
          typeof item === "string" &&
          isClaimSupported(item, sources)
      );
    };

    const isMentionedInDocument = (text: unknown): boolean => {
      if (typeof text !== "string") return false;

      const normalizedText = normalizeForGrounding(text);

      const identifiers = [
        ...Array.from(normalizedText.matchAll(/\b\d{4}\b/g)).map(
          (match) => match[0]
        ),
        "kişisel verilerin korunması kanunu",
        "kvkk",
        "türk borçlar kanunu",
        "tbk",
        "türk ticaret kanunu",
        "ttk",
        "gdpr",
        "bgb",
        "ucc",
        "cisg",
      ].filter((identifier) =>
        normalizedText.includes(identifier)
      );

      return identifiers.some((identifier) =>
        normalizedDocument.includes(identifier)
      );
    };

    const containsExactDeadline = (text: string): boolean => {
      return /\b\d+\s*(gün|hafta|ay|yıl|saat)\b/iu.test(text);
    };

    const containsExactCost = (text: string): boolean => {
      return /\b\d[\d.,]*\s*(tl|try|eur|usd|€|\$)\b/iu.test(text);
    };

    const containsUnsupportedLegalConclusion = (
      text: string
    ): boolean => {
      return /\b(uyumludur|uygun olarak hazırlanmıştır|hukuki geçerliliğe sahiptir|bağlayıcıdır|uygulanabilir|yaptırım uygulanabilir|yaptırıma yol açabilir|hukuki sonuç doğurabilir|ciddi hukuki sonuçlar doğurabilir|yasal süreç başlatılabilir|hukuki ihtilaf doğabilir|sözleşmenin feshi|sözleşme feshedilebilir|tazminat talebi|tazminat talepleri|tazminata yol açabilir|idari para cezası|idari para cezaları|para cezasına neden olabilir|cezai sorumluluk|hukuki sorumluluk|yasal sorumluluk|sorumluluk doğurur|yaptırım gücü vardır)\b/iu.test(text);
    };
    const sanitizeNarrative = (
      value: unknown,
      allowDocumentMentions = true
    ): string => {
      if (typeof value !== "string") return "";

      const sentences = value
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);

      const cleaned = sentences.filter((sentence) => {
        const hasSpecificClaim =
          extractLegalClaims(sentence).length > 0;

        const hasLegalConclusion =
          containsUnsupportedLegalConclusion(sentence);

        const hasExactValue =
          containsExactDeadline(sentence) ||
          containsExactCost(sentence);

        if (
          !hasSpecificClaim &&
          !hasLegalConclusion &&
          !hasExactValue
        ) {
          return true;
        }

        if (isClaimSupported(sentence, sources)) {
          return true;
        }

        // PDF'nin kendisinde geçen kanuna yalnızca "belgede atıf var"
        // şeklindeki açıklamalarda izin ver.
        if (
          allowDocumentMentions &&
          isMentionedInDocument(sentence) &&
          /\b(atıf|belirt|düzenle|yer veril|bahsed|ifade edil)\b/iu.test(
            sentence
          ) &&
          !hasLegalConclusion &&
          !hasExactValue
        ) {
          return true;
        }

        return false;
      });

      return cleaned.join(" ").trim();
    };

    // Uygulanabilir kanunlar: en azından PDF içinde adı geçmeli
    // veya bir hukuk kaynağı tarafından desteklenmeli.
    if (Array.isArray(parsed.applicable_laws)) {
      parsed.applicable_laws = parsed.applicable_laws.filter(
        (law: unknown) =>
          typeof law === "string" &&
          (
            isMentionedInDocument(law) ||
            isClaimSupported(law, sources)
          )
      );
    } else {
      parsed.applicable_laws = [];
    }

    // Hukuki referanslar.
    if (parsed.references && typeof parsed.references === "object") {
      for (const key of Object.keys(parsed.references)) {
        parsed.references[key] = cleanReferenceArray(
          parsed.references[key]
        );
      }
    }

    // Risk kartları.
    if (Array.isArray(parsed.risk_cards)) {
      parsed.risk_cards = parsed.risk_cards.map((card: any) => {
        if (
          card?.affected_articles &&
          typeof card.affected_articles === "object"
        ) {
          for (const key of Object.keys(card.affected_articles)) {
            card.affected_articles[key] = cleanReferenceArray(
              card.affected_articles[key]
            );
          }
        }

        card.case_law_references = cleanReferenceArray(
          card?.case_law_references
        );

        card.description = sanitizeNarrative(
          card?.description,
          true
        );

        card.potential_consequences = sanitizeNarrative(
          card?.potential_consequences,
          false
        );

        card.mitigation_suggestions = sanitizeNarrative(
          card?.mitigation_suggestions,
          true
        );

        return card;
      });
    }

    // Eylem planı.
    if (Array.isArray(parsed.action_plan)) {
      parsed.action_plan = parsed.action_plan.map((action: any) => {
        if (!isClaimSupported(action?.legal_basis, sources)) {
          action.legal_basis =
            "Veritabanında doğrulanamadı.";
        }

        const originalDeadline =
          typeof action?.deadline_note === "string"
            ? action.deadline_note
            : "";

        if (
          containsExactDeadline(originalDeadline) &&
          !isClaimSupported(originalDeadline, sources)
        ) {
          action.deadline_note =
            "Kesin süre veritabanında doğrulanamadı.";
        } else {
          action.deadline_note =
            sanitizeNarrative(originalDeadline, false) ||
            "Kesin süre veritabanında doğrulanamadı.";
        }

        const originalCost =
          typeof action?.estimated_cost === "string"
            ? action.estimated_cost
            : "";

        if (
          containsExactCost(originalCost) &&
          !isClaimSupported(originalCost, sources)
        ) {
          action.estimated_cost =
            "Kesin maliyet veritabanında doğrulanamadı.";
        } else {
          action.estimated_cost =
            sanitizeNarrative(originalCost, false) ||
            "Kesin maliyet veritabanında doğrulanamadı.";
        }

        return action;
      });
    }

    // Özet: PDF'de geçen kanun atıfları kalabilir,
    // fakat doğrulanmamış uyumluluk veya yaptırım hükümleri silinir.
    parsed.summary = sanitizeNarrative(
      parsed.summary,
      true
    );

    // Kaynaklarla doğrulanmış en az bir hukuki referans var mı?
    const verifiedReferenceCount =
      parsed.references &&
      typeof parsed.references === "object"
        ? Object.values(parsed.references).reduce(
            (total: number, value: any) =>
              total + (Array.isArray(value) ? value.length : 0),
            0
          )
        : 0;
// Doğrulanmış hukuk kaynağı yoksa serbest metindeki
// kesin hukuki sonuçları güvenli açıklamalarla değiştir.
if (verifiedReferenceCount === 0) {
  if (Array.isArray(parsed.risk_cards)) {
    parsed.risk_cards = parsed.risk_cards.map((card: any) => ({
      ...card,

      description:
        "Belge metninde gizli bilgilerin korunmasına ilişkin yükümlülükler ve olası ihlal alanları tespit edilmiştir. Ancak mevcut Veritas hukuk kaynakları, bu durumun doğurabileceği spesifik hukuki yaptırım, tazminat veya sorumluluk sonuçlarını doğrulamak için yeterli değildir.",

      potential_consequences:
        "Bilgi güvenliği, itibar ve iş ilişkileri bakımından operasyonel riskler oluşabilir. İdari para cezası, tazminat, fesih veya diğer hukuki sonuçlar veritabanındaki mevcut kaynaklarla doğrulanamamıştır.",

      case_law_references: [],

      affected_articles:
        card?.affected_articles &&
        typeof card.affected_articles === "object"
          ? Object.fromEntries(
              Object.keys(card.affected_articles).map((key) => [
                key,
                [],
              ])
            )
          : {},
    }));
  }

  parsed.summary =
    sanitizeNarrative(parsed.summary, true) +
    " Mevzuata uygunluk, hukuki geçerlilik ve yaptırım sonuçları mevcut hukuk kaynaklarıyla kesin olarak doğrulanamamıştır.";
}
    if (parsed.compliance_status) {
      parsed.compliance_status.details =
        sanitizeNarrative(
          parsed.compliance_status.details,
          false
        );

      if (verifiedReferenceCount === 0) {
        // Mevcut arayüz üç değer beklediği için geçici olarak
        // kısmen_uyumlu kullanılıyor; açıklama kesin karar olmadığını söyler.
        parsed.compliance_status.overall =
          "kısmen_uyumlu";

        parsed.compliance_status.details =
          "Veritabanındaki mevcut hukuk kaynakları kesin bir uyumluluk değerlendirmesi yapmak için yeterli değildir. Belge metninde yer alan hükümler incelenmiştir; ancak mevzuata uygunluk sonucu kaynaklarla doğrulanamamıştır.";

        parsed.compliance_status.critical_issues = [];

        parsed.compliance_status.recommendations = [
          "Kesin uyumluluk değerlendirmesi için ilgili mevzuat ve resmî kararların Veritas hukuk veritabanına eklenmesi gerekir."
        ];
      }
    }

    // Kesin hukuki görüş de kaynak gerektirir.
    if (parsed.legal_opinion && verifiedReferenceCount === 0) {
      parsed.legal_opinion.validity =
        "Belgenin hukuki geçerliliği veritabanındaki mevcut kaynaklarla kesin olarak doğrulanamadı.";

      parsed.legal_opinion.enforceability =
        "Belgenin uygulanabilirliği ve yaptırım gücü veritabanındaki mevcut kaynaklarla kesin olarak doğrulanamadı.";
    }

    return JSON.stringify(parsed);
  } catch (error) {
    console.error(
      "[GROUNDING] Analiz doğrulama hatası:",
      error
    );

    return rawAnalysis;
  }
}
async function performLegalAnalysis(pdfText: string, targetLang: string, jurisdiction: SupportedJurisdiction, onFinish?: (text: string) => Promise<void>) {
  console.log('[performLegalAnalysis] ========================================');
  console.log('[performLegalAnalysis] FONKSİYON ÇAĞRILDI!');
  console.log('[performLegalAnalysis] PDF metin uzunluğu:', pdfText?.length || 0);
  console.log('[performLegalAnalysis] Target lang:', targetLang);
  console.log('[performLegalAnalysis] PDF metin ilk 200 karakter:', pdfText?.substring(0, 200) || 'BOŞ');
  console.log('[performLegalAnalysis] ========================================');

  const legalContext = await retrieveLegalContext(pdfText, jurisdiction);
  console.log('[performLegalAnalysis] RAG kaynak uzunluğu:', legalContext.length);

  const jurisdictionInstructions =
    getJurisdictionAnalysisInstructions(jurisdiction);
  
  const analysisPrompt = `Sen bir yardımcı hukuk asistanısın ve verilen metne göre nesnel analizler yaparsın. Aşağıdaki hukuki metni derinlemesine ve kapsamlı bir şekilde analiz et. Analizini yaparken tüm yasal çerçeveleri, risk faktörlerini, uyum gerekliliklerini, potansiyel yasal sonuçları, yargı içtihatlarını ve akademik görüşleri göz önünde bulundur.

=== VERİTABANINDAN GETİRİLEN GÜNCEL HUKUKİ KAYNAKLAR ===

Aşağıdaki kaynaklar Supabase vektör veritabanından, yüklenen belgeyle anlamsal benzerliğe göre getirilmiştir. Analizinde öncelikle bu kaynakları kullan. Kaynaklarda bulunmayan kanun maddesi, karar, yönetmelik veya hüküm uydurma. Kaynak yetersizse bunu açıkça belirt.

${legalContext || "İlgili kaynak bulunamadı. Bu durumda analiz genel hukuk bilgisiyle yapılmalı ve kesin hukuki görüş gibi sunulmamalıdır."}

=== KAYNAK KULLANIM TALİMATI ===
- Yukarıdaki VERİTABANINDAN GETİRİLEN GÜNCEL HUKUKİ KAYNAKLAR analiz için birincil kaynaktır.
- Her hukuki iddianın, kanun maddesinin, kararın, yaptırımın ve hukuki sonucun sonunda mutlaka ilgili kaynak numarasını yaz: [KAYNAK 1], [KAYNAK 2] gibi.
- Aynı cümle birden fazla kaynağa dayanıyorsa tüm kaynakları yaz: [KAYNAK 1] [KAYNAK 3].
- Kaynaklarda bulunmayan spesifik madde, karar numarası, para cezası tutarı, içtihat veya resmi kaynak yazma.
- Kaynaklarda destek bulunmuyorsa açıkça "Veritabanında doğrulanamadı" yaz.
- Modelin genel hukuk bilgisini yalnızca açıklayıcı arka plan için kullan; doğrulanmamış spesifik hukuki iddia üretme.
- "references", "affected_articles", "case_law_references", "legal_basis", "potential_consequences" ve "compliance_status.details" alanlarında kaynak numarası bulunması zorunludur.
- Hiçbir uygun kaynak yoksa ilgili alanı boş bırak veya "Veritabanında doğrulanamadı" yaz.
- Kaynak numarası olmadan karar numarası, madde numarası veya yaptırım tutarı verme.
- Analiz hukuki tavsiye değildir; kaynak destekli ön incelemedir.

=== SEÇİLİ HUKUK SİSTEMİ VE YARGI ALANI TALİMATLARI ===

Seçilen hukuk sistemi: ${jurisdiction}

${jurisdictionInstructions}

=== ANALİZ METODOLOJİSİ VE DERİNLİK GEREKSİNİMLERİ ===

Analizini şu metodoloji ile yap:

1. METİN ANALİZİ:
   - Belgenin türünü, amacını, taraflarını ve hukuki niteliğini tespit et
   - Sözleşme türü, tek taraflı hukuki işlem, çok taraflı anlaşma, genel işlem koşulları, yönetmelik, politika vb. belirle
   - Belgedeki tüm hukuki kavramları, terimleri ve teknik ifadeleri analiz et
   - Belgedeki muğlak, eksik veya riskli ifadeleri tespit et

2. YASAL UYUMLULUK ANALİZİ:
   - Her yasal düzenleme açısından uyumluluk durumunu değerlendir
   - Zorunlu hükümler, yasaklar, izinler ve koşullu izinleri belirle
   - Eksik yükümlülükleri, ihlal risklerini ve yaptırımları tespit et
   - Çapraz referanslar yap (bir düzenlemedeki hükmün diğer düzenlemelerle ilişkisi)

3. RİSK ANALİZİ:
   - Her riski şiddet (yüksek/orta/düşük), olasılık ve etki açısından değerlendir
   - Riskin hukuki, mali, operasyonel ve itibar boyutlarını analiz et
   - Riskin gerçekleşmesi durumunda ortaya çıkabilecek tazminat talepleri, idari para cezaları, yasal yaptırımlar, sözleşme feshi, yasaklama gibi sonuçları belirt
   - Riskin aciliyetini ve zamanlamasını değerlendir

4. EYLEM PLANI:
   - Her eylemi öncelik, uygulanabilirlik, maliyet ve zamanlama açısından değerlendir
   - Eylemin yasal dayanağını, uygulama adımlarını ve sorumlu tarafları belirt
   - Eylemin tamamlanmaması durumunda ortaya çıkabilecek sonuçları açıkla

Yanıtın MUTLAKA şu JSON yapısında olmalı (başka hiçbir metin ekleme, sadece geçerli JSON):
{
  "summary": "Belgenin kapsamlı ve detaylı özeti ve genel hukuki değerlendirmesi. En az 500-700 kelime olmalı. Belgenin türü, tarafları, temel hukuki konuları, risk alanları, uyum durumu, önemli yasal referanslar ve genel değerlendirme hakkında kapsamlı bilgi içermeli. Belgenin hukuki geçerliliği, yürürlüğü ve uygulanabilirliği hakkında görüş belirtilmeli.",
  "document_type": "Belgenin hukuki türü (sözleşme, genel işlem koşulları, politika, yönetmelik, tek taraflı işlem vb.)",
  "parties": ["Belgedeki tarafların listesi ve rolleri"],
  "applicable_laws": ["Belgeye uygulanabilir yasal düzenlemelerin listesi"],
  "risk_cards": [
    {
      "title": "Risk başlığı (spesifik, açıklayıcı ve teknik)",
      "severity": "yüksek|orta|düşük",
      "probability": "yüksek|orta|düşük",
      "impact": "yüksek|önemli|orta|düşük",
      "description": "Riskin detaylı ve kapsamlı açıklaması. Riskin nedenleri, kökeni, hukuki dayanakları, potansiyel sonuçları, etkilenen taraflar, zamanlama ve aciliyet durumu içermeli. En az 200-300 kelime olmalı.",
      "affected_articles": {
        "BGB": ["Spesifik BGB madde numarası, alt madde ve detaylı açıklama (örn: BGB § 280 I - Schadensersatz wegen Pflichtverletzung: Borçlunun sözleşmeden doğan yükümlülüğünü ihlal etmesi durumunda alacaklının tazminat talep edebilme hakkı)"],
        "UCC": ["Spesifik UCC bölüm/madde referansları ve detaylı açıklama (örn: UCC Article 2-207 - Additional Terms in Acceptance: Kabul beyanındaki ek şartların sözleşmeye dahil olma koşulları)"],
        "KVKK": ["Spesifik KVKK madde numaraları, hükümler ve detaylı açıklama (örn: KVKK m.5 - Kişisel verilerin işlenme şartları: Açık rıza, kanuni zorunluluk, sözleşmenin kurulması/ifası gibi yasal dayanaklar)"],
        "GDPR": ["Spesifik GDPR madde numaraları, gereklilikler ve detaylı açıklama (örn: GDPR Art. 6(1)(a) - Consent as legal basis: Veri sahibinin açık ve bilgilendirilmiş rızası)"],
        "CISG": ["Spesifik CISG maddeleri ve açıklamaları (varsa)"],
        "TBK": ["Spesifik TBK maddeleri ve açıklamaları (varsa)"],
        "TTK": ["Spesifik TTK maddeleri ve açıklamaları (varsa)"],
        "Other": ["Diğer ilgili yasal düzenlemeler, direktifler, yönetmelikler ve açıklamaları (varsa)"]
      },
      "potential_consequences": "Bu riskin gerçekleşmesi durumunda ortaya çıkabilecek hukuki, mali, operasyonel, itibar ve stratejik sonuçlar. Tazminat miktarları, idari para cezaları, yasal yaptırımlar, sözleşme feshi, yasaklama, lisans iptali gibi spesifik sonuçları belirt. En az 150 kelime.",
      "mitigation_suggestions": "Riskin azaltılması, önlenmesi veya yönetilmesi için detaylı, uygulanabilir ve ölçülebilir öneriler. Önerilerin uygulanma adımları, maliyeti, zamanlaması ve beklenen etkisi belirtilmeli. En az 100 kelime.",
      "case_law_references": ["İlgili yargı kararları, içtihatlar ve akademik görüşler (varsa)"],
      "urgency": "acil|önemli|normal|düşük",
      "timeline": "Riskin gerçekleşme zamanlaması ve aciliyet durumu"
    }
  ],
 "references": {
  "BGB": [
    "Yalnızca VERİTABANINDAN GETİRİLEN GÜNCEL HUKUKİ KAYNAKLAR içinde açıkça bulunan BGB hükümlerini yaz. Her kaydın sonunda mutlaka [KAYNAK X] bulunmalı. Kaynakta açıkça yer almıyorsa bu diziyi boş bırak."
  ],
  "UCC": [
    "Yalnızca getirilen kaynaklarda açıkça bulunan UCC hükümlerini yaz. Her kaydın sonunda mutlaka [KAYNAK X] bulunmalı. Kaynakta yoksa bu diziyi boş bırak."
  ],
  "KVKK": [
    "Yalnızca getirilen kaynaklarda açıkça bulunan KVKK maddelerini veya KVKK Kurulu kararlarını yaz. Her kaydın sonunda mutlaka [KAYNAK X] bulunmalı. Modelin genel bilgisinden KVKK madde numarası ekleme. Kaynaklarda doğrulanamıyorsa bu diziyi boş bırak."
  ],
  "GDPR": [
    "Yalnızca getirilen kaynaklarda açıkça bulunan GDPR maddelerini, kararlarını veya yönergelerini yaz. Her kaydın sonunda mutlaka [KAYNAK X] bulunmalı. Kaynakta yoksa bu diziyi boş bırak."
  ],
  "CISG": [
    "Yalnızca getirilen kaynaklarda açıkça bulunan CISG maddelerini yaz ve sonunda [KAYNAK X] göster. Kaynakta yoksa boş bırak."
  ],
  "TBK": [
    "Yalnızca getirilen kaynaklarda açıkça bulunan TBK maddelerini veya Yargıtay içtihatlarını yaz. Her kaydın sonunda mutlaka [KAYNAK X] bulunmalı. Kaynakta yoksa boş bırak."
  ],
  "TTK": [
    "Yalnızca getirilen kaynaklarda açıkça bulunan TTK maddelerini veya Yargıtay içtihatlarını yaz. Her kaydın sonunda mutlaka [KAYNAK X] bulunmalı. Kaynakta yoksa boş bırak."
  ],
  "Other": [
    "Yalnızca getirilen kaynaklarda açıkça bulunan diğer düzenlemeleri yaz. Her kaydın sonunda mutlaka [KAYNAK X] bulunmalı. Kaynakta yoksa boş bırak."
  ]
},
  "action_plan": [
    {
      "priority": "yüksek|orta|düşük",
      "action": "Yapılması gereken eylem (spesifik, uygulanabilir, ölçülebilir ve detaylı). Eylemin adımları, gereksinimleri ve beklenen sonuçları belirtilmeli.",
      "legal_basis": "Hangi yasal düzenleme, spesifik madde ve hükmü bu eylemi gerektiriyor. Madde numarası, başlık ve ilgili hüküm detaylı belirtilmeli.",
      "deadline_note": "Zamanlama notu, aciliyet durumu, önerilen tamamlanma süresi ve gecikme durumunda ortaya çıkabilecek sonuçlar (varsa)",
      "responsible_party": "Bu eylemin sorumlusu olması gereken taraf, birim veya kişi. Sorumluluk alanı ve yetkileri belirtilmeli (varsa)",
      "implementation_steps": ["Eylemin uygulanması için gereken adımların listesi"],
      "estimated_cost": "Eylemin tahmini maliyeti veya kaynak gereksinimi (varsa)",
      "expected_outcome": "Eylemin tamamlanması durumunda beklenen sonuç ve fayda"
    }
  ],
  "compliance_status": {
    "overall": "uyumlu|kısmen_uyumlu|uyumsuz",
    "details": "Genel uyum durumunun detaylı, kapsamlı açıklaması. Her yasal düzenleme açısından uyumluluk seviyesi, eksiklikler, ihlaller ve iyileştirme alanları belirtilmeli. En az 200 kelime.",
    "critical_issues": ["Yüksek öncelikli uyum sorunlarının detaylı listesi. Her sorun için açıklama, etki ve aciliyet belirtilmeli."],
    "recommendations": ["Genel öneriler, iyileştirme alanları ve en iyi uygulamalar. Her öneri için açıklama ve beklenen fayda belirtilmeli."],
    "compliance_score": {
      "BGB": "uyumlu|kısmen_uyumlu|uyumsuz",
      "UCC": "uyumlu|kısmen_uyumlu|uyumsuz",
      "KVKK": "uyumlu|kısmen_uyumlu|uyumsuz",
      "GDPR": "uyumlu|kısmen_uyumlu|uyumsuz",
      "Overall": "uyumlu|kısmen_uyumlu|uyumsuz"
    }
  },
  "legal_opinion": {
    "validity": "Belgenin hukuki geçerliliği ve yürürlüğü hakkında görüş",
    "enforceability": "Belgenin uygulanabilirliği ve yaptırım gücü hakkında görüş",
    "recommendations": "Belgenin iyileştirilmesi veya yeniden düzenlenmesi için öneriler",
    "alternative_approaches": "Alternatif hukuki yaklaşımlar veya sözleşme yapıları (varsa)"
  }
}

ÖNEMLİ TALİMATLAR VE GEREKSİNİMLER:
- Analizini ${targetLang} dilinde yap.
- Yukarıdaki VERİTABANINDAN GETİRİLEN GÜNCEL HUKUKİ KAYNAKLAR bölümü analiz için birincil kaynaktır.
- Her spesifik kanun maddesi, karar numarası, yaptırım tutarı, içtihat veya hukuki sonuç yalnızca getirilen kaynaklarda açıkça yer alıyorsa yazılabilir.
- Her doğrulanmış hukuki iddianın sonunda mutlaka ilgili kaynak numarasını belirt: [KAYNAK 1], [KAYNAK 2] gibi.
- Kaynak numarası gösterilemiyorsa spesifik madde, karar, ceza tutarı veya içtihat yazma.
- Kaynaklarda doğrulanamayan bilgiler için "Veritabanında doğrulanamadı" yaz.
- Modelin genel hukuk bilgisini yalnızca genel açıklama ve bağlam için kullan; spesifik hukuki referans üretmek için kullanma.
- Tüm risk kartlarında, referanslarda ve eylem planında yalnızca doğrulanmış yasal düzenlemeleri kullan.
- Risk değerlendirmelerini objektif, kapsamlı ve detaylı yap.
- Eylem planındaki önerileri uygulanabilir, spesifik, ölçülebilir ve adım adım formüle et.
- Uygun kaynak bulunmayan array alanlarını boş dizi [] olarak bırak.
- Kaynakta bulunmayan alanları doldurmak için örnek veya tahmin üretme.
- Yanıtını yalnızca geçerli JSON formatında döndür; ek açıklama, önsöz, sonuç metni veya markdown ekleme.
- JSON formatında hata olmamasına dikkat et.
- Tüm string değerlerde özel karakterleri düzgün escape et.
- Analiz derinliğini artır; ancak doğrulanmamış ayrıntı ekleme.

Analiz edilecek metin:
PLACEHOLDER_PDF_TEXT`;

  // PDF metnini temizle ve kontrol et
  const cleanedPdfText = pdfText.trim();
  if (!cleanedPdfText || cleanedPdfText.length < 10) {
    console.error('[performLegalAnalysis] PDF metni çok kısa veya boş:', cleanedPdfText.length);
    throw new Error('PDF metni çok kısa veya boş');
  }
  
  // PDF metnini kısalt (OpenAI token limiti için) - Güvenlik taramasını azaltmak için
  const maxPdfLength = 8000; // 12000'den 8000'e düşürüldü
  const truncatedPdfText = cleanedPdfText.length > maxPdfLength 
    ? cleanedPdfText.substring(0, maxPdfLength) + '\n\n[... Metin kısaltıldı, tam analiz için tam metni gönderin ...]'
    : cleanedPdfText;
  
  // Prompt'u güncelle - PDF metnini kısaltılmış versiyonla değiştir
  const finalAnalysisPrompt = analysisPrompt.replace('PLACEHOLDER_PDF_TEXT', truncatedPdfText);
  console.log("[RAG DEBUG] finalAnalysisPrompt ilk 3000:", finalAnalysisPrompt.substring(0, 3000));
console.log("[RAG DEBUG] kaynak bölümü var mı:", finalAnalysisPrompt.includes("VERİTABANINDAN GETİRİLEN GÜNCEL HUKUKİ KAYNAKLAR"));
  // Prompt uzunluğunu kontrol et
  const promptLength = finalAnalysisPrompt.length;
  console.log('[performLegalAnalysis] Prompt uzunluğu:', promptLength, 'PDF metin uzunluğu:', cleanedPdfText.length, 'Kısaltılmış PDF uzunluğu:', truncatedPdfText.length);
  
  // Compare mode'daki gibi direkt JSON döndür (streaming olmadan)
  try {
    console.log('[performLegalAnalysis] Eski OpenAI SDK ile analiz başlatılıyor (Compare mode gibi)...');
    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini", // Güvenlik/politika takılmasını önlemek için mini model kullanılıyor
      messages: [
        {
          role: "system",
          content: `Sen bir yardımcı hukuk asistanısın ve verilen metne göre nesnel analizler yaparsın. Analizini sadece ${targetLang} dilinde yap. Seçilen yargı alanı (jurisdiction): ${jurisdiction}. ${jurisdictionInstructions} Başka bir yargı alanına sessizce geçme. Spesifik kanun maddeleri, kararlar, cezalar, süreler ve hukuki sonuçlar yalnızca getirilen doğrulanmış kaynaklarla desteklenebilir. targetLang yalnızca ÇIKTI DİLİNİ belirler; yargı alanını asla belirlemez. Öncelikle kullanıcı promptunda verilen VERİTABANINDAN GETİRİLEN GÜNCEL HUKUKİ KAYNAKLAR bölümüne dayan. Kaynaklarda bulunmayan kanun maddesi, karar numarası veya resmi kaynak uydurma. Kaynak yetersizse bunu açıkça belirt. Analiz avukat incelemesinin yerine geçmez; kaynak destekli ön incelemedir.`
        },
        { role: "user", content: finalAnalysisPrompt }
      ],
      temperature: 0.2,
      // stream: false - Compare mode gibi direkt JSON döndür
    });
    
    console.log('[performLegalAnalysis] OpenAI yanıtı başarıyla alındı');
    
    const rawAnalysisResult =
    response.choices[0]?.message?.content || "Analysis complete";
  
    const analysisResult = sanitizeGroundedAnalysis(
      rawAnalysisResult,
      legalContext,
      pdfText
    );
    
    console.log('[performLegalAnalysis] YANIT DETAYLI:', {
      yanitUzunlugu: analysisResult.length,
      ilk200Karakter: analysisResult.substring(0, 200),
      son200Karakter: analysisResult.substring(Math.max(0, analysisResult.length - 200)),
      tamYanit: analysisResult
    });
    
    // onFinish callback'ini çağır
    if (onFinish && analysisResult) {
      console.log('[performLegalAnalysis] onFinish çağrılıyor, text uzunluğu:', analysisResult.length);
      await onFinish(analysisResult);
    }
    
    // Compare mode gibi direkt JSON döndür
    return NextResponse.json({ 
      reply: analysisResult,
      analysis: analysisResult
    });
  } catch (error: any) {
    console.error('[performLegalAnalysis] OpenAI hatası:', {
      error: error,
      message: error?.message,
      stack: error?.stack
    });
    throw error;
  }
}

export async function POST(req: Request) {
  console.log('========================================');
  console.log('[API] POST /api/analyze çağrıldı - ROUTE ÇALIŞIYOR!');
  console.log('[API] Request method:', req.method);
  console.log('[API] Request URL:', req.url);
  console.log('[API] Request headers:', Object.fromEntries(req.headers.entries()));
  console.log('========================================');
  
  try {
    console.log('[API] Request body parse ediliyor...');
    const { pdfText, pdfBase64, targetLang, userSelectedCountry, userEmail, userId, fileName } = await req.json();
    console.log('[API] Request body parse edildi!');
    console.log('[API] Request body alındı:', {
      hasPdfText: !!pdfText,
      hasPdfBase64: !!pdfBase64,
      targetLang,
      userEmail,
      userId,
      fileName
    });

    // Eğer pdfBase64 geliyorsa, önce PDF'i parse et
    let finalPdfText = pdfText;
    if (pdfBase64 && !pdfText) {
      try {
        const buffer = Buffer.from(pdfBase64, 'base64');
        const pdfParser = new PDFParser(null, true);
        
        // Promise wrapper for pdf2json (event-based API)
        const extractedText = await new Promise<string>((resolve, reject) => {
          pdfParser.on("pdfParser_dataError", (errData: any) => {
            reject(new Error(errData.parserError || 'PDF parse hatası'));
          });
          
          pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            try {
              // Extract text from all pages
              const textParts: string[] = [];
              if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
                pdfData.Pages.forEach((page: any) => {
                  if (page.Texts && Array.isArray(page.Texts)) {
                    page.Texts.forEach((textObj: any) => {
                      if (textObj.R && Array.isArray(textObj.R)) {
                        textObj.R.forEach((r: any) => {
                          if (r.T) {
                            // Decode URI-encoded text
                            textParts.push(decodeURIComponent(r.T));
                          }
                        });
                      }
                    });
                  }
                });
              }
              resolve(textParts.join(' '));
            } catch (extractError: any) {
              reject(new Error(`Text extraction hatası: ${extractError.message}`));
            }
          });
          
          pdfParser.parseBuffer(buffer);
        });
        
        finalPdfText = extractedText;
      } catch (parseError: any) {
        console.error("PDF parse hatası:", parseError);
        return NextResponse.json({ reply: `PDF parse hatası: ${parseError.message}. Lütfen PDF metnini direkt olarak gönderin.` }, { status: 400 });
      }
    }
    
    if (!finalPdfText) {
      return NextResponse.json({ reply: "PDF metni bulunamadı!" }, { status: 400 });
    }

    const supportedJurisdictions: SupportedJurisdiction[] = ["TR", "US", "UK", "DE"];

    let resolvedJurisdiction: SupportedJurisdiction;

    if (
      userSelectedCountry &&
      supportedJurisdictions.includes(userSelectedCountry as SupportedJurisdiction)
    ) {
      resolvedJurisdiction = userSelectedCountry as SupportedJurisdiction;
    } else {
      const detection = await detectJurisdiction(finalPdfText, { useVectorConfirmation: false });
      const primary = detection.primary_country;

      if (
        primary === "TR" ||
        primary === "US" ||
        primary === "UK" ||
        primary === "DE"
      ) {
        resolvedJurisdiction = primary;
      } else {
        return NextResponse.json(
          { reply: "Jurisdiction could not be reliably determined." },
          { status: 422 }
        );
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ reply: "API Key eksik!" }, { status: 500 });
    }
    
    // ADMIN BYPASS: Belirli email için tüm kontrolleri atla
    const adminEmail = process.env.ADMIN_EMAIL || '';
    const isAdmin = userEmail && adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase();
    
    const userKey = getUserKey(req);
    
    // Helper function to save analysis and send notifications
    const saveAnalysisAndNotify = async (analysisResult: string, fileName: string = 'document.pdf', userIdParam?: string) => {
      // Use userIdParam if provided, otherwise fall back to userId from request
      const finalUserId = userIdParam || userId;
      
      try {
        // Parse analysis result to check for critical risks
        let parsedResult: any = null;
        try {
          parsedResult = typeof analysisResult === 'string' ? JSON.parse(analysisResult) : analysisResult;
        } catch (e) {
          // If not JSON, try to extract JSON from string
          const jsonStart = analysisResult.indexOf('{');
          const jsonEnd = analysisResult.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            parsedResult = JSON.parse(analysisResult.substring(jsonStart, jsonEnd));
          }
        }

        // Check for critical risks
        const hasCriticalRisk = parsedResult?.risk_cards?.some((card: any) => 
          (card.severity?.toLowerCase().indexOf('yüksek') !== -1 || 
           card.severity?.toLowerCase().indexOf('high') !== -1 ||
           card.severity?.toLowerCase().indexOf('kritik') !== -1 ||
           card.severity?.toLowerCase().indexOf('critical') !== -1) &&
          (card.impact?.toLowerCase().indexOf('kritik') !== -1 ||
           card.impact?.toLowerCase().indexOf('critical') !== -1)
        );

        // Save to database if finalUserId exists (UUID from auth.users)
        if (finalUserId) {
          try {
            // Parse analysis result to extract summary
            let analysisSummary = '';
            try {
              const parsed = typeof analysisResult === 'string' ? JSON.parse(analysisResult) : analysisResult;
              analysisSummary = parsed?.summary || parsed?.document_type || analysisResult.substring(0, 200) + '...';
            } catch (e) {
              analysisSummary = typeof analysisResult === 'string' ? analysisResult.substring(0, 200) + '...' : 'Analysis completed';
            }
            
            // Extract risk score if available
            let riskScore: number | null = null;
            try {
              const parsed = typeof analysisResult === 'string' ? JSON.parse(analysisResult) : analysisResult;
              if (parsed?.risk_cards && Array.isArray(parsed.risk_cards)) {
                const highRiskCount = parsed.risk_cards.filter((card: any) => 
                  card.severity?.toLowerCase().includes('yüksek') || 
                  card.severity?.toLowerCase().includes('high')
                ).length;
                riskScore = parsed.risk_cards.length > 0 ? (highRiskCount / parsed.risk_cards.length) * 100 : null;
              }
            } catch (e) {
              // Risk score extraction failed, continue without it
            }
            
            const { error: dbError, data: insertedData } = await supabase.from('analyses').insert({
              user_id: finalUserId, // UUID from auth.users
              file_name: fileName || 'document.pdf',
              analysis_result: typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult),
              analysis_summary: analysisSummary,
              risk_score: riskScore,
              created_at: new Date().toISOString()
            }).select();
            
            if (dbError) {
              console.error('[saveAnalysisAndNotify] Database save error:', dbError);
            } else {
              console.log('[saveAnalysisAndNotify] Analysis saved successfully:', {
                userId: finalUserId,
                fileName: fileName || 'document.pdf',
                analysisId: insertedData?.[0]?.id,
                resultLength: typeof analysisResult === 'string' ? analysisResult.length : JSON.stringify(analysisResult).length
              });
            }
          } catch (dbError) {
            console.error('[saveAnalysisAndNotify] Database save error (catch):', dbError);
            // Continue even if DB save fails
          }
        } else {
          console.warn('[saveAnalysisAndNotify] userId not provided, skipping database save', { userId, userIdParam, finalUserId });
        }

        // Calculate risk score and summary
        const riskCount = parsedResult?.risk_cards?.length || 0;
        const highRiskCount = parsedResult?.risk_cards?.filter((card: any) => 
          card.severity?.toLowerCase().indexOf('yüksek') !== -1 || 
          card.severity?.toLowerCase().indexOf('high') !== -1 ||
          card.severity?.toLowerCase().indexOf('kritik') !== -1 ||
          card.severity?.toLowerCase().indexOf('critical') !== -1
        ).length || 0;
        
        const complianceScore = parsedResult?.compliance_status?.overall || 'Bilinmiyor';
        const documentType = parsedResult?.document_type || 'Belirtilmemiş';
        const summaryPreview = parsedResult?.summary ? 
          (parsedResult.summary.length > 150 ? parsedResult.summary.substring(0, 150) + '...' : parsedResult.summary) : 
          'Özet mevcut değil';

        // Send Telegram notification for critical analyses
        if (hasCriticalRisk) {
          await sendTelegramNotification(
            `🚨 <b>KRİTİK ANALİZ TAMAMLANDI</b>\n\n` +
            `📧 Kullanıcı: ${userEmail || 'Anonim'}\n` +
            `📄 Dosya: ${fileName}\n` +
            `📋 Belge Türü: ${documentType}\n` +
            `⚠️ <b>Risk Skoru:</b> ${highRiskCount}/${riskCount} Yüksek Risk\n` +
            `📊 <b>Uyumluluk:</b> ${complianceScore}\n` +
            `🔍 <b>Özet:</b> ${summaryPreview}\n\n` +
            `⚠️ Yüksek riskli hukuki sorunlar tespit edildi!\n` +
            `🔍 Detaylı rapor hazırlandı.`,
            true
          );
        } else {
          // Regular analysis notification
          await sendTelegramNotification(
            `📊 <b>YENİ ANALİZ TAMAMLANDI</b>\n\n` +
            `📧 Kullanıcı: ${userEmail || 'Anonim'}\n` +
            `📄 Dosya: ${fileName}\n` +
            `📋 Belge Türü: ${documentType}\n` +
            `📊 <b>Risk Skoru:</b> ${riskCount} Risk Tespit Edildi (${highRiskCount} Yüksek)\n` +
            `✅ <b>Uyumluluk:</b> ${complianceScore}\n` +
            `🔍 <b>Özet:</b> ${summaryPreview}\n\n` +
            `✅ Analiz başarıyla tamamlandı.`,
            false
          );
        }
      } catch (error) {
        console.error('Save/Notify error:', error);
        // Don't fail the request if save/notify fails
      }
    };
    
    // Admin ise direkt analiz yap, kontrolleri atla
    if (isAdmin) {
      console.log('[API] Admin kullanıcı - kontroller atlanıyor');
      const result = performLegalAnalysis(
        finalPdfText, 
        targetLang || 'tr',
        resolvedJurisdiction,
        async (text) => {
          await saveAnalysisAndNotify(text, fileName || 'admin-document.pdf', userId);
        }
      );
      // performLegalAnalysis artık direkt Response döndürüyor
      return result;
    }
    
    // TEST MODU: Geçici olarak kredi kontrolünü esnet - detaylı loglama ile
    console.log('[API] Kredi kontrolü başlatılıyor...', { userKey, userEmail });
    
    try {
      // 1. KREDİ KONTROLÜ
      const { data: creditRow, error: creditError } = await supabase
        .from("user_credits")
        .select("credit")
        .eq("user_key", userKey)
        .maybeSingle();
      
      console.log('[API] Kredi kontrolü sonucu:', { 
        creditRow, 
        creditError: creditError?.message,
        hasCredit: creditRow && creditRow.credit > 0 
      });
      
      // 2. İlk ücretsiz hakkı kontrolü
      const { data: usedDisks, error: rightsError } = await supabase
        .from("user_analysis_rights")
        .select("id")
        .eq("user_key", userKey)
        .maybeSingle();
      
      console.log('[API] Ücretsiz hak kontrolü sonucu:', { 
        usedDisks, 
        rightsError: rightsError?.message,
        hasUsedFree: !!usedDisks 
      });
      
      // Tablo yoksa veya hata varsa, analizi yine de yap (TEST MODU)
      if (creditError || rightsError) {
        console.warn('[API] Kredi/rights tablolarına erişim hatası - TEST MODU: Analiz yapılıyor', {
          creditError: creditError?.message,
          rightsError: rightsError?.message
        });
        // Hata olsa bile analizi yap - streaming
        const result = performLegalAnalysis(
          finalPdfText, 
          targetLang || 'tr',
          resolvedJurisdiction,
          async (text) => {
            await saveAnalysisAndNotify(text, fileName || 'document.pdf', userId);
          }
        );
        // performLegalAnalysis artık direkt Response döndürüyor
        return result;
      }
      
      if (creditRow && creditRow.credit > 0) {
        // Kredisi olanlar için analiz - streaming
        console.log('[API] Kullanıcının kredisi var, analiz yapılıyor');
        const result = performLegalAnalysis(
          finalPdfText, 
          targetLang || 'tr',
          resolvedJurisdiction,
          async (text) => {
            // Kredi bir azaltılır
            await supabase.from("user_credits")
              .update({ credit: creditRow.credit - 1 })
              .eq("user_key", userKey);
            await saveAnalysisAndNotify(text, fileName || 'document.pdf', userId);
          }
        );
        // performLegalAnalysis artık direkt Response döndürüyor
        return result;
      } else if (!usedDisks) {
        // İlk analiz ücretsiz - streaming
        console.log('[API] İlk ücretsiz analiz, analiz yapılıyor');
        const result = performLegalAnalysis(
          finalPdfText, 
          targetLang || 'tr',
          resolvedJurisdiction,
          async (text) => {
            await supabase.from("user_analysis_rights").insert({ user_key: userKey });
            await saveAnalysisAndNotify(text, fileName || 'document.pdf', userId);
          }
        );
        // performLegalAnalysis artık direkt Response döndürüyor
        return result;
      } else {
        // TEST MODU: Hakkı yoksa bile analizi yap (geçici olarak) - streaming
        console.warn('[API] Kullanıcının hakkı yok ama TEST MODU aktif - analiz yapılıyor', {
          userKey,
          userEmail,
          creditRow,
          usedDisks
        });
        console.log('[API] performLegalAnalysis çağrılmadan önce - finalPdfText uzunluğu:', finalPdfText?.length || 0);
        console.log('[API] performLegalAnalysis çağrılmadan önce - finalPdfText ilk 200 karakter:', finalPdfText?.substring(0, 200) || 'BOŞ');
        console.log('[API] performLegalAnalysis çağrılmadan önce - targetLang:', targetLang || 'tr');
        const result = performLegalAnalysis(
          finalPdfText, 
          targetLang || 'tr',
          resolvedJurisdiction,
          async (text) => {
            await saveAnalysisAndNotify(text, fileName || 'document.pdf', userId);
          }
        );
        console.log('[API] performLegalAnalysis çağrıldı, result alındı');
        // performLegalAnalysis artık direkt Response döndürüyor
        return result;
      }
    } catch (checkError: any) {
      // Kontrol sırasında hata olursa, analizi yine de yap (TEST MODU) - streaming
      console.error('[API] Kredi kontrolü sırasında hata - TEST MODU: Analiz yapılıyor', checkError);
      const result = performLegalAnalysis(
        finalPdfText, 
        targetLang || 'tr',
        resolvedJurisdiction,
        async (text) => {
          await saveAnalysisAndNotify(text, fileName || 'document.pdf', userId);
        }
      );
      // performLegalAnalysis artık direkt Response döndürüyor
      return result;
    }
  } catch (error: any) {
    console.error("OpenAI/Supabase Hatası:", error);
    return NextResponse.json({ reply: `Sistem hatası: ${error.message}` }, { status: 500 });
  }
}
