import "server-only";

import type {
  LegalSourceAdapter,
  LegalSourceDocument,
} from "./types";

export const KVKK_SOURCE_KEY = "kvkk_kanun";

export const KVKK_PARSER_VERSION = "uyap-v1";

export const KVKK_OFFICIAL_URL =
  "https://mevzuat.adalet.gov.tr/mevzuat/104383";

const FETCH_TIMEOUT_MS = 30_000;

const EXPECTED_ARTICLES = Array.from(
  { length: 33 },
  (_, index) => String(index + 1)
);

const EXPECTED_TEMPORARY_ARTICLES = [
  "1",
  "2",
  "3",
];

type ParsedSection = {
  kind: "article" | "temporary";
  number: string;
  content: string;
};

export type KvkkSourceBundle = {
  documents: LegalSourceDocument[];
  canonicalText: string;
  validationDetails: Record<string, unknown>;
};

function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(
  value: string
): string {
  const namedEntities: Record<
    string,
    string
  > = {
    nbsp: " ",
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    ndash: "–",
    mdash: "—",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”",
    hellip: "…",
  };

  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (fullMatch, entity: string) => {
      if (entity.startsWith("#x")) {
        const codePoint = Number.parseInt(
          entity.slice(2),
          16
        );

        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : fullMatch;
      }

      if (entity.startsWith("#")) {
        const codePoint = Number.parseInt(
          entity.slice(1),
          10
        );

        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : fullMatch;
      }

      return (
        namedEntities[
          entity.toLowerCase()
        ] ?? fullMatch
      );
    }
  );
}

function htmlToText(html: string): string {
  let value = html;

  value = value.replace(
    /<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi,
    ""
  );

  value = value.replace(
    /<br\s*\/?>/gi,
    "\n"
  );

  value = value.replace(
    /<\/(p|div|section|article|header|footer|main|tr|li|h1|h2|h3|h4|h5|h6)>/gi,
    "\n"
  );

  value = value.replace(
    /<(li|tr|h1|h2|h3|h4|h5|h6)[^>]*>/gi,
    "\n"
  );

  value = value.replace(
    /<\/?(td|th)[^>]*>/gi,
    " "
  );

  value = value.replace(
    /<[^>]+>/g,
    " "
  );

  value = decodeHtmlEntities(value);

  return normalizeText(value);
}

async function fetchOfficialKvkkText(): Promise<string> {
  const sourceUrl =
    new URL(KVKK_OFFICIAL_URL);

  if (
    sourceUrl.hostname !==
    "mevzuat.adalet.gov.tr"
  ) {
    throw new Error(
      "KVKK kaynağı izin verilen resmî alan adında değil."
    );
  }

  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      KVKK_OFFICIAL_URL,
      {
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept:
            "text/html,application/xhtml+xml",
          "Accept-Language":
            "tr-TR,tr;q=0.9",
          "User-Agent":
            "VeritasLegalAI/1.0 (+https://veritasq.ai)",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `UYAP Mevzuat HTTP ${response.status} döndürdü.`
      );
    }

    const finalUrl = new URL(
      response.url ||
        KVKK_OFFICIAL_URL
    );

    if (
      finalUrl.hostname !==
      "mevzuat.adalet.gov.tr"
    ) {
      throw new Error(
        "UYAP isteği izin verilmeyen bir alan adına yönlendirildi."
      );
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes("text/html")
    ) {
      throw new Error(
        `UYAP beklenmeyen içerik tipi döndürdü: ${contentType}`
      );
    }

    const html =
      await response.text();

    if (html.length < 5000) {
      throw new Error(
        "UYAP yanıtı beklenenden kısa. İçe aktarma durduruldu."
      );
    }

    const text =
      htmlToText(html);

    if (text.length < 10000) {
      throw new Error(
        "UYAP sayfasından yeterli mevzuat metni çıkarılamadı."
      );
    }

    return text;
  } catch (error: any) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        "UYAP Mevzuat isteği 30 saniyede tamamlanamadı."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSectionHeading(
  section: string
): string {
  return normalizeText(section)
    .replace(
      /^GEÇİCİ\s+MADDE\s+(\d+)\s*[-–—]\s*/iu,
      "GEÇİCİ MADDE $1- "
    )
    .replace(
      /^MADDE\s+(\d+)\s*[-–—]\s*/iu,
      "MADDE $1- "
    );
}

function parseLawSections(
  text: string
): ParsedSection[] {
  const markerRegex =
    /^[ \t]*(GEÇİCİ[ \t]+MADDE|MADDE)[ \t]+(\d+)[ \t]*[-–—][ \t]*/gimu;

  const matches =
    Array.from(
      text.matchAll(markerRegex)
    );

  if (matches.length < 30) {
    throw new Error(
      `KVKK madde işaretleri eksik. Bulunan işaret sayısı: ${matches.length}`
    );
  }

  const bestSections =
    new Map<
      string,
      ParsedSection
    >();

  for (
    let index = 0;
    index < matches.length;
    index++
  ) {
    const match =
      matches[index];

    const start =
      match.index;

    if (start === undefined) {
      continue;
    }

    const end =
      matches[index + 1]?.index ??
      text.length;

    const rawSection =
      text.slice(start, end);

    const content =
      normalizeSectionHeading(
        rawSection
      );

    const rawKind =
      match[1]
        .toLocaleUpperCase("tr-TR");

    const kind:
      | "article"
      | "temporary" =
      rawKind.startsWith(
        "GEÇİCİ"
      )
        ? "temporary"
        : "article";

    const number = match[2];

    const key =
      `${kind}:${number}`;

    const candidate: ParsedSection =
      {
        kind,
        number,
        content,
      };

    const existing =
      bestSections.get(key);

    if (
      !existing ||
      candidate.content.length >
        existing.content.length
    ) {
      bestSections.set(
        key,
        candidate
      );
    }
  }

  return Array.from(
    bestSections.values()
  );
}

function getSection(
  sections: ParsedSection[],
  kind: ParsedSection["kind"],
  number: string
): ParsedSection {
  const section =
    sections.find(
      (item) =>
        item.kind === kind &&
        item.number === number
    );

  if (!section) {
    throw new Error(
      `${
        kind === "temporary"
          ? "Geçici madde"
          : "Madde"
      } ${number} bulunamadı.`
    );
  }

  return section;
}

function validateKvkkSource(
  sourceText: string,
  sections: ParsedSection[]
): Record<string, unknown> {
  const lowerText =
    sourceText.toLocaleLowerCase(
      "tr-TR"
    );

  const wrongDocument =
    lowerText.includes(
      "doğru bilinen yanlışlar"
    );

  const titleOk =
    lowerText.includes(
      "kişisel verilerin korunması kanunu"
    );

  const lawNumberOk =
    lowerText.includes("6698");

  const missingArticles =
    EXPECTED_ARTICLES.filter(
      (number) =>
        !sections.some(
          (section) =>
            section.kind ===
              "article" &&
            section.number === number
        )
    );

  const missingTemporaryArticles =
    EXPECTED_TEMPORARY_ARTICLES.filter(
      (number) =>
        !sections.some(
          (section) =>
            section.kind ===
              "temporary" &&
            section.number === number
        )
    );

  const article6 =
    getSection(
      sections,
      "article",
      "6"
    ).content;

  const article9 =
    getSection(
      sections,
      "article",
      "9"
    ).content;

  const article18 =
    getSection(
      sections,
      "article",
      "18"
    ).content;

  const article27 =
    getSection(
      sections,
      "article",
      "27"
    ).content;

  const temporary3 =
    getSection(
      sections,
      "temporary",
      "3"
    ).content;

  const currentArticle6Ok =
    article6.includes(
      "İstihdam, iş sağlığı ve güvenliği"
    );

  const currentArticle9Ok =
    article9
      .toLocaleLowerCase("tr-TR")
      .includes(
        "yeterlilik kararı"
      );

  const currentArticle18Ok =
    article18.includes(
      "9 uncu maddenin beşinci fıkrasında"
    ) &&
    article18
      .toLocaleLowerCase("tr-TR")
      .includes(
        "idare mahkemelerinde dava açılabilir"
      );

  const amendment2017Ok =
    article27.includes(
      "hâkimler ve savcılar ise kendilerinin muvafakati"
    );

  const temporary3Ok =
    temporary3.includes(
      "1/9/2024"
    );

  const validationDetails = {
    source:
      "T.C. Adalet Bakanlığı UYAP Mevzuat",
    law_number: "6698",
    title_ok: titleOk,
    law_number_ok:
      lawNumberOk,
    wrong_document:
      wrongDocument,
    regular_articles:
      EXPECTED_ARTICLES.length -
      missingArticles.length,
    temporary_articles:
      EXPECTED_TEMPORARY_ARTICLES.length -
      missingTemporaryArticles.length,
    missing_articles:
      missingArticles,
    missing_temporary_articles:
      missingTemporaryArticles,
    amendment_2017_present:
      amendment2017Ok,
    amendment_2024_article_6_present:
      currentArticle6Ok,
    amendment_2024_article_9_present:
      currentArticle9Ok,
    amendment_2024_article_18_present:
      currentArticle18Ok,
    amendment_2024_temporary_3_present:
      temporary3Ok,
  };

  const isValid =
    titleOk &&
    lawNumberOk &&
    !wrongDocument &&
    missingArticles.length === 0 &&
    missingTemporaryArticles.length ===
      0 &&
    currentArticle6Ok &&
    currentArticle9Ok &&
    currentArticle18Ok &&
    amendment2017Ok &&
    temporary3Ok;

  if (!isValid) {
    console.error(
      "[KVKK] Kaynak doğrulaması başarısız:",
      validationDetails
    );

    throw new Error(
      "UYAP'tan alınan 6698 sayılı Kanun metni güvenli doğrulamadan geçemedi. Veritabanı değiştirilmedi."
    );
  }

  return validationDetails;
}

function sortSections(
  sections: ParsedSection[]
): ParsedSection[] {
  const regular =
    sections
      .filter(
        (section) =>
          section.kind ===
          "article" &&
          EXPECTED_ARTICLES.includes(
            section.number
          )
      )
      .sort(
        (a, b) =>
          Number(a.number) -
          Number(b.number)
      );

  const temporary =
    sections
      .filter(
        (section) =>
          section.kind ===
          "temporary" &&
          EXPECTED_TEMPORARY_ARTICLES.includes(
            section.number
          )
      )
      .sort(
        (a, b) =>
          Number(a.number) -
          Number(b.number)
      );

  return [
    ...regular,
    ...temporary,
  ];
}

export async function buildKvkkSourceBundle(): Promise<KvkkSourceBundle> {
  console.log(
    "[KVKK] UYAP Mevzuat güncel kanun metni indiriliyor..."
  );

  const sourceText =
    await fetchOfficialKvkkText();

  const parsedSections =
    parseLawSections(
      sourceText
    );

  const validationDetails =
    validateKvkkSource(
      sourceText,
      parsedSections
    );

  const sections =
    sortSections(
      parsedSections
    );

  const retrievedAt =
    new Date().toISOString();

  const documents:
    LegalSourceDocument[] =
    sections.map(
      (section) => {
        const isTemporary =
          section.kind ===
          "temporary";

        return {
          source:
            KVKK_SOURCE_KEY,

          sourceName:
            "T.C. Adalet Bakanlığı UYAP Mevzuat",

          sourceUrl:
            KVKK_OFFICIAL_URL,

          country: "TR",

          jurisdiction:
            "Türkiye",

          language: "tr",

          type:
            "legislation",

          lawNumber:
            "6698",

          lawName:
            "Kişisel Verilerin Korunması Kanunu",

          articleNumber:
            isTemporary
              ? `GEÇİCİ ${section.number}`
              : section.number,

          title:
            isTemporary
              ? `6698 sayılı Kişisel Verilerin Korunması Kanunu - Geçici Madde ${section.number}`
              : `6698 sayılı Kişisel Verilerin Korunması Kanunu - Madde ${section.number}`,

          content:
            section.content,

          official: true,

          retrievedAt,
        };
      }
    );

  const canonicalText =
    documents
      .map(
        (document) =>
          document.content
      )
      .join("\n\n");

  console.log(
    `[KVKK] Doğrulama başarılı. ${documents.length} madde/geçici madde hazırlandı.`
  );

  return {
    documents,
    canonicalText,
    validationDetails,
  };
}

export const kvkkAdapter =
  {
    id: KVKK_SOURCE_KEY,

    async fetchDocuments() {
      const bundle =
        await buildKvkkSourceBundle();

      return bundle.documents;
    },
  } satisfies LegalSourceAdapter;