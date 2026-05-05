import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  try {
    const keyJson = process.env["GOOGLE_SERVICE_ACCOUNT_KEY"]!;
    const key = JSON.parse(keyJson);
    const auth = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    const calendar = google.calendar({ version: "v3", auth });
    const calendarId = process.env["GOOGLE_CALENDAR_ID"] || process.env["GOOGLE_OWNER_EMAIL"]!;
    const res = await calendar.calendars.get({ calendarId });

    return NextResponse.json([{
      id: res.data.id,
      name: res.data.summary,
    }]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Google Calendars Error]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
