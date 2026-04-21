import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SyncRuleRow = {
  id: string;
  source_provider: string;
  target_provider: string;
  action: "delete_overlap" | "copy";
  look_ahead_days: number;
  enabled: boolean;
  created_at: string;
};

export type SyncLogRow = {
  id: string;
  rule_id: string;
  action: string;
  event_title: string;
  event_start: string;
  event_end: string;
  status: "success" | "error";
  message: string;
  created_at: string;
};

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_KEY"] ?? process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  }

  _client = createClient(url, key);
  return _client;
}
