import type { CalendarProvider, CalendarEvent } from "@/lib/providers/CalendarProvider";
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
  author_id: number;
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

import * as fs from "fs";
import * as path from "path";

const getSessionFilePath = () => path.join(process.cwd(), ".timetree_session");

export class TimeTreeProvider implements CalendarProvider {
  readonly name = "TimeTree";
  private sessionId: string | null = null;
  private readonly email: string;
  private readonly password: string;
  private calendarId: number | null;
  private readonly authorId?: number;

  constructor(email: string, password: string, calendarId?: number, authorId?: number) {
    this.email = email;
    this.password = password;
    this.calendarId = calendarId ?? null;
    this.authorId = authorId;
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
    const sessionFile = getSessionFilePath();
    if (!this.sessionId) {
      if (fs.existsSync(sessionFile)) {
        try {
          this.sessionId = fs.readFileSync(sessionFile, "utf-8").trim();
        } catch (e) {
          // ignore read error
        }
      }
      
      if (!this.sessionId) {
        await this.login();
        if (this.sessionId) {
          fs.writeFileSync(sessionFile, this.sessionId, "utf-8");
        }
      }
    }
  }

  private async apiGet<T>(pathUrl: string): Promise<T> {
    await this.ensureSession();

    const res = await fetch(`${API_BASE}${pathUrl}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Timetreea": USER_AGENT,
        Cookie: `_session_id=${this.sessionId}`,
      },
    });

    if (res.status === 401) {
      this.sessionId = null;
      const sessionFile = getSessionFilePath();
      if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
      }
      await this.login();
      if (this.sessionId) {
        fs.writeFileSync(sessionFile, this.sessionId, "utf-8");
      }
      return this.apiGet(pathUrl);
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
    const calendars = await this.getCalendars();
    if (!this.calendarId) {
      if (calendars.length === 0) throw new Error("No TimeTree calendars found");
      this.calendarId = calendars[0].id;
      console.log(`[TimeTree] Using calendar: "${calendars[0].name}" (id: ${this.calendarId})`);
    }
    const currentCal = calendars.find(c => c.id === this.calendarId) || calendars[0];

    const rawEvents = await this.fetchAllEvents(this.calendarId);
    const fromMs = from.getTime();
    const toMs = to.getTime();

    return rawEvents
      .filter((ev) => {
        if (ev.category === 2) return false;
        if (this.authorId !== undefined && ev.author_id !== this.authorId) return false;
        return ev.start_at < toMs && ev.end_at > fromMs;
      })
      .map((ev) => ({
        id: ev.uuid,
        title: ev.title,
        start: new Date(ev.start_at),
        end: new Date(ev.end_at),
        isAllDay: ev.all_day,
        calendarName: currentCal.name,
        raw: ev,
      }));
  }

  async getAllEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    const calendars = await this.getCalendars();
    const fromMs = from.getTime();
    const toMs = to.getTime();

    const allEvents: CalendarEvent[] = [];

    await Promise.all(
      calendars.map(async (cal) => {
        try {
          const rawEvents = await this.fetchAllEvents(cal.id);
          const mapped = rawEvents
            .filter((ev) => {
              if (ev.category === 2) return false;
              if (this.authorId !== undefined && ev.author_id !== this.authorId) return false;
              return ev.start_at < toMs && ev.end_at > fromMs;
            })
            .map((ev) => ({
              id: `${cal.id}-${ev.uuid}`,
              title: ev.title,
              start: new Date(ev.start_at),
              end: new Date(ev.end_at),
              isAllDay: ev.all_day,
              calendarName: cal.name,
              raw: ev,
            }));
          allEvents.push(...mapped);
        } catch (e) {
          console.error(`Failed to fetch TimeTree calendar ${cal.id}:`, e);
        }
      })
    );

    return allEvents;
  }

  async deleteEvent(_eventId: string): Promise<void> {
    throw new Error("TimeTree delete not implemented (source-only provider)");
  }
}
