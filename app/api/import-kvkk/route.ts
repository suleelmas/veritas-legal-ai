import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { upsertDocument } from "@/lib/upsertDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const KVKK_OFFICIAL_URL =
  "https://www.kvkk.gov.tr/Icerik/2097/Kanun-doc";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code))
    );
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoArticles(text: string): Array<{
  articleNumber: string;
  content: string;
}> {
  const normalized = normalizeText(text);

  /*
   * MADDE 1, Madde 1, MADDE 6/A gibi biçimleri yakalar.
   */
  const articleRegex =
    /(?:^|\n)\s*(MADDE|Madde)\s+(\d+(?:\/[A-ZÇĞİÖŞÜ])?)\s*[-–—:]?/g;

  const matches = Array.from(normalized.matchAll(articleRegex));

  const articles: Array<{
    articleNumber: string;
    content: string;
  }> = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    const start = current.index ?? 0;
    const end = next?.index ?? normalized.length;

    const articleNumber = current[2];
    const content = normalized.slice(start, end).trim();

    if (content.length >= 80) {
      articles.push({
        articleNumber,
        content,
      });
    }
  }

  return articles;
}

function looksLikeRealKvkkLaw(text: string): boolean {
  const normalized = text.toLocaleLowerCase("tr-TR");

  const hasTitle =
    normalized.includes(
      "kişisel verilerin korunması kanunu"
    );

  const hasLawNumber =
    normalized.includes("6698");

  const hasExpectedArticles =
    /madde\s+1\b/i.test(text) &&
    /madde\s+4\b/i.test(text) &&
    /madde\s+5\b/i.test(text) &&
    /madde\s+12\b/i.test(text);

  const wrongPublication =
    normalized.includes("doğru bilinen yanlışlar");

  return (
    hasTitle &&
    hasLawNumber &&
    hasExpectedArticles &&
    !wrongPublication
  );
}

async function importKvkk(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    console.log(
      "[KVKK IMPORT] Resmî Mevzuat Bilgi Sistemi sayfası indiriliyor..."
    );

    const response = await fetch(KVKK_OFFICIAL_URL, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; VeritasLegalAI/1.0; +https://veritasq.ai)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Mevzuat Bilgi Sistemi HTTP ${response.status} döndürdü.`
      );
    }

    const html = await response.text();
    const text = htmlToText(html);

    console.log(
      "[KVKK IMPORT] Çıkarılan metin uzunluğu:",
      text.length
    );

    /*
     * EN ÖNEMLİ KORUMA:
     * Gerçek kanun olduğundan emin değilsek DB'ye hiçbir şey yazma.
     */
    if (!looksLikeRealKvkkLaw(text)) {
      console.error(
        "[KVKK IMPORT] Kaynak gerçek 6698 kanun metni doğrulamasından geçemedi."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "İndirilen içerik gerçek 6698 sayılı Kanun metni olarak doğrulanamadı. Veritabanına hiçbir kayıt eklenmedi.",
          sourceUrl: KVKK_OFFICIAL_URL,
          textLength: text.length,
          preview: text.slice(0, 1000),
        },
        { status: 422 }
      );
    }

    const articles = splitIntoArticles(text);

    console.log(
      "[KVKK IMPORT] Bulunan madde sayısı:",
      articles.length
    );

    /*
     * 6698 sayılı Kanun çok sayıda maddeden oluşuyor.
     * Çok az madde bulunursa parser başarısız sayılır.
     */
    if (articles.length < 15) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Madde ayrıştırma başarısız görünüyor. Yalnızca ${articles.length} madde bulundu. Veritabanına hiçbir şey yazılmadı.`,
          detectedArticles: articles.map(
            (a) => a.articleNumber
          ),
        },
        { status: 422 }
      );
    }

    const supabase = await createClient();

    /*
     * Önce mevcut kvkk_kanun kayıtlarını temizliyoruz.
     * Bu noktaya ancak gerçek kanun doğrulandıktan sonra gelinir.
     */
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("metadata->>source", "kvkk_kanun");

    if (deleteError) {
      throw new Error(
        `Eski KVKK kayıtları temizlenemedi: ${deleteError.message}`
      );
    }

    let inserted = 0;
    let failed = 0;

    const errors: Array<{
      articleNumber: string;
      error: string;
    }> = [];

    for (const article of articles) {
      const content =
        `6698 SAYILI KİŞİSEL VERİLERİN KORUNMASI KANUNU\n` +
        `MADDE ${article.articleNumber}\n\n` +
        article.content;

      try {
        await upsertDocument(
          content,
          {
            source: "kvkk_kanun",
            source_name:
              "T.C. Mevzuat Bilgi Sistemi",
            source_url: KVKK_OFFICIAL_URL,

            country: "TR",
            jurisdiction: "TR",
            language: "tr",

            type: "legislation",

            law_number: "6698",
            law_name:
              "Kişisel Verilerin Korunması Kanunu",

            article_number:
              article.articleNumber,

            official: true,

            retrieved_at:
              new Date().toISOString(),

            updated:
              new Date().toISOString(),

            embedding_model:
              "text-embedding-3-small",
          },
          supabase
        );

        inserted++;

        console.log(
          `[KVKK IMPORT] MADDE ${article.articleNumber} kaydedildi.`
        );
      } catch (error: any) {
        failed++;

        errors.push({
          articleNumber:
            article.articleNumber,
          error:
            error?.message ||
            "Bilinmeyen hata",
        });

        console.error(
          `[KVKK IMPORT] MADDE ${article.articleNumber} hata:`,
          error
        );
      }
    }

    return NextResponse.json({
      success: failed === 0,

      source: "kvkk_kanun",

      officialSource:
        KVKK_OFFICIAL_URL,

      detectedArticles:
        articles.map(
          (article) =>
            article.articleNumber
        ),

      totalArticles:
        articles.length,

      inserted,

      failed,

      errors,

      timestamp:
        new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(
      "[KVKK IMPORT] Genel hata:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "KVKK import başarısız.",
        timestamp:
          new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return importKvkk(req);
}

export async function POST(req: Request) {
  return importKvkk(req);
}