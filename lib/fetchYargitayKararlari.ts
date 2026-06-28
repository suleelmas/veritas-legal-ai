type YargitayDecision = {
  title: string;
  content: string;
  date?: string;
};

function cleanText(input: string = "") {
  return input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url: string, body: any) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/json;charset=UTF-8",
      "Origin": "https://karararama.yargitay.gov.tr",
      "Referer": "https://karararama.yargitay.gov.tr/",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Yargıtay API failed ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function normalizeListResponse(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.records)) return json.records;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.data?.data)) return json.data.data;
  return [];
}

function pickDecisionId(item: any): string | null {
  return (
    item?.id ||
    item?.kararId ||
    item?.documentId ||
    item?.docId ||
    item?.uuid ||
    item?.esasNo ||
    null
  )?.toString() || null;
}

function buildTitle(item: any) {
  const daire = item?.daire || item?.birimAdi || item?.birim || "Yargıtay";
  const esas = item?.esasNo || item?.esas || "";
  const karar = item?.kararNo || item?.karar || "";
  const tarih = item?.kararTarihi || item?.tarih || item?.date || "";

  return cleanText(`${daire} ${esas ? `${esas} E.` : ""} ${karar ? `${karar} K.` : ""} ${tarih}`) || "Yargıtay Kararı";
}

function pickDate(item: any) {
  return item?.kararTarihi || item?.tarih || item?.date || new Date().toISOString().split("T")[0];
}

async function fetchDecisionDetail(id: string, fallbackItem: any) {
  const detailEndpoints = [
    "https://karararama.yargitay.gov.tr/aramadetay",
    "https://karararama.yargitay.gov.tr/getDokuman",
    "https://karararama.yargitay.gov.tr/kararDetay",
  ];

  for (const endpoint of detailEndpoints) {
    try {
      const detailJson = await fetchJson(endpoint, { id });
      const raw =
        detailJson?.data?.metin ||
        detailJson?.data?.content ||
        detailJson?.data?.dokuman ||
        detailJson?.metin ||
        detailJson?.content ||
        detailJson?.dokuman ||
        detailJson?.html ||
        "";

      const text = cleanText(raw);

      if (text.length > 500 && !text.toLowerCase().includes("yargıtay karar arama ara detaylı arama")) {
        return text;
      }
    } catch {
      // Bir endpoint çalışmazsa diğerini dene.
    }
  }

  const fallbackText = cleanText(
    fallbackItem?.metin ||
    fallbackItem?.content ||
    fallbackItem?.ozet ||
    fallbackItem?.summary ||
    fallbackItem?.kararMetni ||
    ""
  );

  return fallbackText;
}

export async function fetchYargitayKararlari(): Promise<YargitayDecision[]> {
  try {
    const searchEndpoints = [
      "https://karararama.yargitay.gov.tr/arama",
      "https://karararama.yargitay.gov.tr/aramaDetay",
      "https://karararama.yargitay.gov.tr/search",
    ];

    const searchBodies = [
      {
        aranan: "gizlilik kişisel veri",
        pageSize: 10,
        pageNumber: 1,
      },
      {
        data: {
          aranan: "gizlilik kişisel veri",
        },
        pageSize: 10,
        pageNumber: 1,
      },
      {
        arananKelime: "gizlilik kişisel veri",
        pageSize: 10,
        pageNumber: 1,
      },
    ];

    let list: any[] = [];

    for (const endpoint of searchEndpoints) {
      for (const body of searchBodies) {
        try {
          const json = await fetchJson(endpoint, body);
          list = normalizeListResponse(json);

          if (list.length > 0) {
            console.log(`[YARGITAY DEBUG] Found ${list.length} records from ${endpoint}`);
            break;
          }
        } catch (err: any) {
          console.warn(`[YARGITAY DEBUG] ${endpoint} failed:`, err.message);
        }
      }

      if (list.length > 0) break;
    }

    if (list.length === 0) {
      console.warn("[YARGITAY DEBUG] No Yargıtay decisions found from API.");
      return [];
    }

    const decisions: YargitayDecision[] = [];

    for (const item of list.slice(0, 10)) {
      const id = pickDecisionId(item);
      const title = buildTitle(item);
      let content = "";

      if (id) {
        content = await fetchDecisionDetail(id, item);
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      if (!content || content.length < 500) {
        content = cleanText(JSON.stringify(item));
      }

      if (
        content.length > 500 &&
        !content.toLowerCase().includes("yargıtay karar arama ara detaylı arama")
      ) {
        decisions.push({
          title,
          content,
          date: pickDate(item),
        });
      }
    }

    console.log(`[YARGITAY DEBUG] Returning ${decisions.length} real decisions`);
    return decisions;
  } catch (err) {
    console.error("Yargıtay kararları çekme hatası:", err);
    return [];
  }
}