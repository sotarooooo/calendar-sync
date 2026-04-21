import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { TimeTreeProvider } from "@/lib/providers/TimeTreeProvider";
import { GoogleCalendarProvider } from "@/lib/providers/GoogleCalendarProvider";
import { SyncEngine, type RuntimeRule } from "@/lib/engine/SyncEngine";
import type { SyncRuleRow } from "@/lib/supabase";

function env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env: ${key}`);
  return val;
}

function buildProvider(name: string) {
  if (name === "timetree") {
    return new TimeTreeProvider(
      env("TIMETREE_EMAIL"),
      env("TIMETREE_PASSWORD"),
      process.env["TIMETREE_CALENDAR_ID"] ? Number(process.env["TIMETREE_CALENDAR_ID"]) : undefined,
    );
  }
  if (name === "google_calendar") {
    return new GoogleCalendarProvider({
      clientId: env("GOOGLE_CLIENT_ID"),
      clientSecret: env("GOOGLE_CLIENT_SECRET"),
      refreshToken: env("GOOGLE_REFRESH_TOKEN"),
      calendarId: process.env["GOOGLE_CALENDAR_ID"] ?? "primary",
      ownerEmail: env("GOOGLE_OWNER_EMAIL"),
    });
  }
  throw new Error(`Unknown provider: ${name}`);
}

export async function POST() {
  try {
    const { data: rules, error } = await getSupabase()
      .from("sync_rules")
      .select("*")
      .eq("enabled", true);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: "No enabled rules", logs: [] });
    }

    const runtimeRules: RuntimeRule[] = (rules as SyncRuleRow[]).map((r) => ({
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
      await getSupabase().from("sync_logs").insert(
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

    return NextResponse.json({
      message: `Sync complete. ${logs.length} actions taken.`,
      logs,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sync error]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
