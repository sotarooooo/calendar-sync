import "dotenv/config";
import { runSync } from "./engine/run-sync-core.js";

async function main() {
  console.log(`[${new Date().toLocaleString("ja-JP")}] Starting sync...`);

  const { logs } = await runSync();

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
