import "dotenv/config";
import { TimeTreeProvider } from "./providers/TimeTreeProvider.js";
import { GoogleCalendarProvider } from "./providers/GoogleCalendarProvider.js";
import { SyncEngine } from "./engine/SyncEngine.js";

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing environment variable: ${key}`);
  return val;
}

async function main() {
  const timetree = new TimeTreeProvider(
    requireEnv("TIMETREE_EMAIL"),
    requireEnv("TIMETREE_PASSWORD"),
    process.env["TIMETREE_CALENDAR_ID"] ? Number(process.env["TIMETREE_CALENDAR_ID"]) : undefined,
    process.env["TIMETREE_AUTHOR_ID"] ? Number(process.env["TIMETREE_AUTHOR_ID"]) : undefined
  );

  const gcal = new GoogleCalendarProvider({
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    refreshToken: requireEnv("GOOGLE_REFRESH_TOKEN"),
    calendarId: process.env["GOOGLE_CALENDAR_ID"] ?? "primary",
    ownerEmail: requireEnv("GOOGLE_OWNER_EMAIL"),
  });

  const engine = new SyncEngine([
    {
      config: {
        id: "cli-default",
        sourceName: "timetree",
        targetName: "google_calendar",
        action: "delete_overlap",
        lookAheadDays: 14,
        enabled: true,
      },
      source: timetree,
      target: gcal,
    },
  ]);

  console.log(`[${new Date().toLocaleString("ja-JP")}] Starting sync...`);
  const logs = await engine.run();

  console.log(`[done] Actions: ${logs.length}`);
  for (const log of logs) {
    console.log(`  [${log.status}] ${log.action}: "${log.eventTitle}" - ${log.message}`);
  }

  if (logs.some((l) => l.status === "error")) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
