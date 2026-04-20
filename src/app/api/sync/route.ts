import { NextResponse } from "next/server";
import { runSync } from "@/lib/engine/run-sync-core";

export async function POST() {
  try {
    const result = await runSync();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sync error]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
