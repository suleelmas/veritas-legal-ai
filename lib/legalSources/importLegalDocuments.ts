import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LegalSourceAdapter,
  LegalSourceDocument,
} from "./types";

import { upsertDocument } from "@/lib/upsertDocument";

function isUsefulDocument(doc: LegalSourceDocument): boolean {
  if (!doc.content || doc.content.trim().length < 80) {
    return false;
  }

  if (!doc.source || !doc.sourceUrl) {
    return false;
  }

  return true;
}

export async function importLegalDocuments(
  supabase: SupabaseClient,
  adapter: LegalSourceAdapter
) {
  const documents = await adapter.fetchDocuments();

  const validDocuments = documents.filter(isUsefulDocument);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  const errors: Array<{
    title: string;
    error: string;
  }> = [];

  for (const doc of validDocuments) {
    try {
      const { data: existing, error: lookupError } =
        await supabase
          .from("documents")
          .select("id")
          .eq("content", doc.content)
          .eq("metadata->>source", doc.source)
          .maybeSingle();

      if (lookupError) {
        throw lookupError;
      }

      if (existing) {
        skipped++;
        continue;
      }

      await upsertDocument(
        doc.content,
        {
          source: doc.source,
          source_name: doc.sourceName,
          source_url: doc.sourceUrl,
          country: doc.country,
          jurisdiction: doc.jurisdiction,
          language: doc.language,
          type: doc.type,
          law_number: doc.lawNumber ?? null,
          law_name: doc.lawName ?? null,
          article_number: doc.articleNumber ?? null,
          title: doc.title,
          official: doc.official,
          retrieved_at: doc.retrievedAt,
          updated: new Date().toISOString(),
          embedding_model: "text-embedding-3-small",
        },
        supabase
      );

      inserted++;
    } catch (error: any) {
      failed++;

      errors.push({
        title: doc.title,
        error: error?.message || "Unknown import error",
      });
    }
  }

  return {
    source: adapter.id,
    discovered: documents.length,
    valid: validDocuments.length,
    inserted,
    skipped,
    failed,
    errors,
  };
}