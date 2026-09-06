import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchYargitayKararlari } from "@/lib/fetchYargitayKararlari";
import { upsertDocument } from "@/lib/upsertDocument";
import { updateSyncState } from "./syncState";

export async function syncYargitay(supabase: SupabaseClient) {
  try {
    const decisions = await fetchYargitayKararlari();
    let newCount = 0;

    for (const decision of decisions) {
      const content = `${decision.title}${decision.content ? "\n" + decision.content : ""}`;
      const normalizedContent = content.toLowerCase();

      const isInvalidPage =
        content.length < 500 ||
        normalizedContent.includes("yargıtay karar arama") ||
        normalizedContent.includes("emsal karar arama") ||
        normalizedContent.includes("dosya sorgu") ||
        normalizedContent.includes("birim seçilmediğinde tüm birimlerde arama yapılır");
      
      if (isInvalidPage) {
        console.warn(
          "[YARGITAY SYNC] Geçersiz sayfa atlandı:",
          decision.title
        );
        continue;
      }
      const { data: existing } = await supabase
        .from("documents")
        .select("id")
        .eq("content", content)
        .eq("metadata->>source", "yargitay")
        .maybeSingle();

      if (!existing) {
        await upsertDocument(
          content,
          {
            source: "yargitay",
            country: "TR",
            date: decision.date || new Date().toISOString().split("T")[0],
            updated: new Date().toISOString(),
            type: "karar",
          },
          supabase
        );

        newCount++;
      }
    }

    await updateSyncState(supabase, "yargitay", {
      lastSeenDate: decisions[0]?.date || new Date().toISOString().split("T")[0],
      lastError: null,
    });

    return {
      success: true,
      source: "yargitay",
      new: newCount,
      updated: 0,
    };
  } catch (error: any) {
    await updateSyncState(supabase, "yargitay", {
      lastError: error.message,
    });

    return {
      success: false,
      source: "yargitay",
      new: 0,
      updated: 0,
      error: error.message,
    };
  }
}