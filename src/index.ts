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
    requireEnv("TIMETREE_API_TOKEN"),
    requireEnv("TIMETREE_CALENDAR_ID"),
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
      source: timetree,
      target: gcal,
      lookAheadDays: 14,
    },
  ]);

  console.log(`[${new Date().toLocaleString("ja-JP")}] Starting sync...`);
  const result = await engine.run();

  console.log(
    `[done] Deleted: ${result.deleted.length}, Errors: ${result.errors.length}`,
  );

  if (result.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
