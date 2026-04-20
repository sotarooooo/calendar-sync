import type { CalendarProvider, CalendarEvent } from "./CalendarProvider.js";
import { randomUUID } from "crypto";

const API_BASE = "https://timetreeapp.com/api/v1";
const USER_AGENT = "web/2.1.0/en";

interface TimeTreeRawEvent {
  uuid: string;
  title: string;
  start_at: number;
  end_at: number;
  all_day: boolean;
  type: number;
  category: number;
}

interface TimeTreeCalendarMeta {
  id: number;
  name: string;
  color: number;
}

interface EventSyncResponse {
  events: TimeTreeRawEvent[];
  chunk: boolean;
  since: number;
}

export class TimeTreeProvider implements CalendarProvider {
  readonly name = "TimeTree";
  private sessionId: string | null = null;
  private readonly email: string;
  private readonly password: string;
  private calendarId: number | null;

  constructor(email: string, password: string, calendarId?: number) {
    this.email = email;
    this.password = password;
    this.calendarId = calendarId ?? null;
  }

  private async login(): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/email/signin`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Timetreea": USER_AGENT,
      },
      body: JSON.stringify({
        uid: this.email,
        password: this.password,
        uuid: randomUUID().replace(/-/g, ""),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`TimeTree login failed (${res.status}): ${body}`);
    }

    const cookies = res.headers.getSetCookie?.() ?? [];
    for (const cookie of cookies) {
      const match = cookie.match(/_session_id=([^;]+)/);
      if (match) {
        this.sessionId = match[1];
        return;
      }
    }

    const setCookie = res.headers.get("set-cookie") ?? "";
    const match = setCookie.match(/_session_id=([^;]+)/);
    if (match) {
      this.sessionId = match[1];
      return;
    }

    throw new Error("TimeTree login succeeded but no session cookie returned");
  }

  private async ensureSession(): Promise<void> {
    if (!this.sessionId) {
      await this.login();
    }
  }

  private async apiGet<T>(path: string): Promise<T> {
    await this.ensureSession();

    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Timetreea": USER_AGENT,
        Cookie: `_session_id=${this.sessionId}`,
      },
    });

    if (res.status === 401) {
      this.sessionId = null;
      await this.login();
      return this.apiGet(path);
    }

    if (!res.ok) {
      throw new Error(`TimeTree API error (${res.status}): ${await res.text()}`);
    }

    return res.json() as Promise<T>;
  }

  async getCalendars(): Promise<TimeTreeCalendarMeta[]> {
    const data = await this.apiGet<{ calendars: TimeTreeCalendarMeta[] }>("/calendars?since=0");
    return data.calendars;
  }

  private async fetchAllEvents(calendarId: number): Promise<TimeTreeRawEvent[]> {
    const data = await this.apiGet<EventSyncResponse>(`/calendar/${calendarId}/events/sync`);
    const events = [...data.events];

    let { chunk, since } = data;
    while (chunk) {
      const next = await this.apiGet<EventSyncResponse>(
        `/calendar/${calendarId}/events/sync?since=${since}`,
      );
      events.push(...next.events);
      chunk = next.chunk;
      since = next.since;
    }

    return events;
  }

  async getEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    if (!this.calendarId) {
      const calendars = await this.getCalendars();
      if (calendars.length === 0) throw new Error("No TimeTree calendars found");
      this.calendarId = calendars[0].id;
      console.log(`[TimeTree] Using calendar: "${calendars[0].name}" (id: ${this.calendarId})`);
    }

    const rawEvents = await this.fetchAllEvents(this.calendarId);
    const fromMs = from.getTime();
    const toMs = to.getTime();

    return rawEvents
      .filter((ev) => {
        if (ev.category === 2) return false;
        const startMs = ev.start_at * 1000;
        const endMs = ev.end_at * 1000;
        return startMs < toMs && endMs > fromMs;
      })
      .map((ev) => ({
        id: ev.uuid,
        title: ev.title,
        start: new Date(ev.start_at * 1000),
        end: new Date(ev.end_at * 1000),
        isAllDay: ev.all_day,
        raw: ev,
      }));
  }

  async deleteEvent(_eventId: string): Promise<void> {
    throw new Error("TimeTree delete not implemented (source-only provider)");
  }
}
