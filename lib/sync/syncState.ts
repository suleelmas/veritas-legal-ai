import type { SupabaseClient } from "@supabase/supabase-js";

export async function updateSyncState(
  supabase: SupabaseClient,
  source: string,
  options?: {
    lastSeenDate?: string;
    lastSeenId?: string;
    lastError?: string | null;
  }
) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("sync_state")
    .upsert({
      source,
      last_success_at: options?.lastError ? null : now,
      last_seen_date: options?.lastSeenDate ?? null,
      last_seen_id: options?.lastSeenId ?? null,
      last_error: options?.lastError ?? null,
      updated_at: now,
    });

  if (error) {
    console.error(`[SYNC STATE] ${source} update failed:`, error);
  } else {
    console.log(`[SYNC STATE] ${source} updated.`);
  }
}