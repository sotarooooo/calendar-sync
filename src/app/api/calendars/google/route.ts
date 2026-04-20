import { NextResponse } from "next/server";
import { GoogleCalendarProvider } from "@/lib/providers/GoogleCalendarProvider";

export async function GET() {
  try {
    const gcal = new GoogleCalendarProvider({
      clientId: process.env["GOOGLE_CLIENT_ID"]!,
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"]!,
      refreshToken: process.env["GOOGLE_REFRESH_TOKEN"]!,
      calendarId: process.env["GOOGLE_CALENDAR_ID"] ?? "primary",
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
