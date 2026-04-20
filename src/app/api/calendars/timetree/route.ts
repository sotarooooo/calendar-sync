import { NextResponse } from "next/server";
import { TimeTreeProvider } from "@/lib/providers/TimeTreeProvider";

export async function GET() {
  try {
    const tt = new TimeTreeProvider(
      process.env["TIMETREE_EMAIL"]!,
      process.env["TIMETREE_PASSWORD"]!,
      undefined,
      process.env["TIMETREE_AUTHOR_ID"] ? Number(process.env["TIMETREE_AUTHOR_ID"]) : undefined
    );

    const list = await tt.getCalendars();
    return NextResponse.json(list);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[TimeTree Calendars Error]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
