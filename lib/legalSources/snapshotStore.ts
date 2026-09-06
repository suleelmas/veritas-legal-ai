import "server-only";

import { createHash } from "node:crypto";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type SnapshotValidationStatus =
  | "pending"
  | "valid"
  | "invalid";

export type SaveLegalSourceSnapshotInput = {
  sourceKey: string;
  sourceName: string;

  country: string;
  jurisdiction: string;

  lawNumber?: string | null;
  lawName?: string | null;

  officialUrl: string;

  canonicalText: string;

  parserVersion?: string;

  validationStatus: SnapshotValidationStatus;

  validationDetails?: Record<string, unknown>;
};

function normalizeCanonicalText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createContentHash(text: string): string {
  return createHash("sha256")
    .update(text, "utf8")
    .digest("hex");
}

export async function saveLegalSourceSnapshot(
  input: SaveLegalSourceSnapshotInput
) {
  const canonicalText = normalizeCanonicalText(
    input.canonicalText
  );

  if (canonicalText.length < 100) {
    throw new Error(
      "Legal source snapshot is too short to be stored."
    );
  }

  const contentHash =
    createContentHash(canonicalText);

  const now = new Date().toISOString();

  const { data: existing, error: existingError } =
    await supabaseAdmin
      .from("legal_source_snapshots")
      .select("*")
      .eq("source_key", input.sourceKey)
      .eq("content_hash", contentHash)
      .maybeSingle();

  if (existingError) {
    throw new Error(
      `Snapshot lookup failed: ${existingError.message}`
    );
  }

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("legal_source_snapshots")
      .update({
        source_name: input.sourceName,
        country: input.country,
        jurisdiction: input.jurisdiction,
        law_number: input.lawNumber ?? null,
        law_name: input.lawName ?? null,
        official_url: input.officialUrl,
        parser_version:
          input.parserVersion ?? "1",
        validation_status:
          input.validationStatus,
        validation_details:
          input.validationDetails ?? {},
        fetched_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        `Snapshot update failed: ${error.message}`
      );
    }

    return {
      snapshot: data,
      created: false,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("legal_source_snapshots")
    .insert({
      source_key: input.sourceKey,
      source_name: input.sourceName,

      country: input.country,
      jurisdiction: input.jurisdiction,

      law_number: input.lawNumber ?? null,
      law_name: input.lawName ?? null,

      official_url: input.officialUrl,

      content_hash: contentHash,
      canonical_text: canonicalText,

      parser_version:
        input.parserVersion ?? "1",

      validation_status:
        input.validationStatus,

      validation_details:
        input.validationDetails ?? {},

      fetched_at: now,

      is_active: false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Snapshot insert failed: ${error.message}`
    );
  }

  return {
    snapshot: data,
    created: true,
  };
}

export async function activateLegalSourceSnapshot(
  snapshotId: string
) {
  const { data, error } = await supabaseAdmin.rpc(
    "activate_legal_source_snapshot",
    {
      p_snapshot_id: snapshotId,
    }
  );

  if (error) {
    throw new Error(
      `Snapshot activation failed: ${error.message}`
    );
  }

  return data;
}

export async function getActiveLegalSourceSnapshot(
  sourceKey: string
) {
  const { data, error } = await supabaseAdmin
    .from("legal_source_snapshots")
    .select("*")
    .eq("source_key", sourceKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Active snapshot lookup failed: ${error.message}`
    );
  }

  return data;
}