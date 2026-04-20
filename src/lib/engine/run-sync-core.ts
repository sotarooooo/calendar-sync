import { createClient } from "@supabase/supabase-js";
import { TimeTreeProvider } from "../providers/TimeTreeProvider.js";
import { GoogleCalendarProvider } from "../providers/GoogleCalendarProvider.js";
import { SyncEngine, type RuntimeRule, type SyncLogEntry } from "./SyncEngine.js";

function env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env: ${key}`);
  return val;
}

function buildProvider(name: string) {
  const [providerType, configId] = name.split(":");

  if (providerType === "timetree") {
    return new TimeTreeProvider(
      env("TIMETREE_EMAIL"),
      env("TIMETREE_PASSWORD"),
      configId ? Number(configId) : (process.env["TIMETREE_CALENDAR_ID"] ? Number(process.env["TIMETREE_CALENDAR_ID"]) : undefined),
      process.env["TIMETREE_AUTHOR_ID"] ? Number(process.env["TIMETREE_AUTHOR_ID"]) : undefined
    );
  }
  if (providerType === "google_calendar") {
    return new GoogleCalendarProvider({
      clientId: env("GOOGLE_CLIENT_ID"),
      clientSecret: env("GOOGLE_CLIENT_SECRET"),
      refreshToken: env("GOOGLE_REFRESH_TOKEN"),
      calendarId: configId || process.env["GOOGLE_CALENDAR_ID"] || "primary",
      ownerEmail: env("GOOGLE_OWNER_EMAIL"),
    });
  }
  throw new Error(`Unknown provider: ${name}`);
}

function getSupabaseClient() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = process.env["SUPABASE_SERVICE_KEY"] ?? env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, key);
}

export async function runSync(): Promise<{ logs: SyncLogEntry[]; message: string }> {
  const supabase = getSupabaseClient();

  const { data: rules, error } = await supabase
    .from("sync_rules")
    .select("*")
    .eq("enabled", true);

  if (error) throw new Error(`Failed to fetch rules: ${error.message}`);
  if (!rules || rules.length === 0) {
    return { logs: [], message: "No enabled rules" };
  }

  const runtimeRules: RuntimeRule[] = rules.map((r: any) => ({
    config: {
      id: r.id,
      sourceName: r.source_provider,
      targetName: r.target_provider,
      action: r.action,
      lookAheadDays: r.look_ahead_days,
      enabled: r.enabled,
    },
    source: buildProvider(r.source_provider),
    target: buildProvider(r.target_provider) as GoogleCalendarProvider,
  }));

  const engine = new SyncEngine(runtimeRules);
  const logs = await engine.run();

  if (logs.length > 0) {
    await supabase.from("sync_logs").insert(
      logs.map((l) => ({
        rule_id: l.ruleId,
        action: l.action,
        event_title: l.eventTitle,
        event_start: l.eventStart,
        event_end: l.eventEnd,
        status: l.status,
        message: l.message,
      })),
    );
  }

  return { logs, message: `Sync complete. ${logs.length} actions taken.` };
}
