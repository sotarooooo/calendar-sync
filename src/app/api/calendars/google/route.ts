import { NextResponse } from "next/server";
import { GoogleCalendarProvider } from "@/lib/providers/GoogleCalendarProvider";

export async function GET() {
  try {
    const gcal = new GoogleCalendarProvider({
      serviceAccountKey: process.env["GOOGLE_SERVICE_ACCOUNT_KEY"]!,
      calendarId: process.env["GOOGLE_CALENDAR_ID"],
      ownerEmail: process.env["GOOGLE_OWNER_EMAIL"]!,
    });

    const list = await gcal.getAllCalendars();
    return NextResponse.json(list);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Google Calendars Error]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
