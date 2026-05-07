import { NextResponse } from "next/server";
import { TimeTreeProvider } from "@/lib/providers/TimeTreeProvider";
import { GoogleCalendarProvider } from "@/lib/providers/GoogleCalendarProvider";

function env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env: ${key}`);
  return val;
}

export type FrontendEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  provider: "timetree" | "google_calendar";
  calendarName?: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    if (!startStr || !endStr) {
      return NextResponse.json(
        { error: "Query parameters 'start' and 'end' are required." },
        { status: 400 }
      );
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    // プロバイダの初期化
    const timetree = new TimeTreeProvider(
      env("TIMETREE_EMAIL"),
      env("TIMETREE_PASSWORD"),
      process.env["TIMETREE_CALENDAR_ID"] ? Number(process.env["TIMETREE_CALENDAR_ID"]) : undefined,
      process.env["TIMETREE_AUTHOR_ID"] ? Number(process.env["TIMETREE_AUTHOR_ID"]) : undefined
    );

    const gcal = new GoogleCalendarProvider({
      serviceAccountKey: env("GOOGLE_SERVICE_ACCOUNT_KEY"),
      calendarId: process.env["GOOGLE_CALENDAR_ID"],
      ownerEmail: env("GOOGLE_OWNER_EMAIL"),
    });

    // 並行取得
    const [ttEvents, gcEvents] = await Promise.all([
      timetree.getAllEvents(start, end).then((events) => {
        console.log(`[Events API] TimeTree: ${events.length} events`);
        return events;
      }).catch((err) => {
        console.error("TimeTree fetch error:", err);
        return [];
      }),
      gcal.getAllEvents(start, end).catch((err) => {
        console.error("Google Calendar fetch error:", err);
        return [];
      }),
    ]);

    const result: FrontendEvent[] = [];

    for (const ev of ttEvents) {
      result.push({
        id: `tt-${ev.id}`,
        title: ev.title,
        start: ev.start.toISOString(),
        end: ev.end.toISOString(),
        isAllDay: ev.isAllDay,
        provider: "timetree",
        calendarName: ev.calendarName,
      });
    }

    for (const ev of gcEvents) {
      result.push({
        id: `gc-${ev.id}`,
        title: ev.title,
        start: ev.start.toISOString(),
        end: ev.end.toISOString(),
        isAllDay: ev.isAllDay,
        provider: "google_calendar",
        calendarName: ev.calendarName,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Events API Error]", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
