import type { CalendarProvider, CalendarEvent } from "@/lib/providers/CalendarProvider";
import { randomUUID } from "crypto";
import { createRequire } from "module";

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
  recurrences?: string[];
}

interface TimeTreeCalendarMeta {
  id: number;
  name: string;
  color: number;
}


const isServerless = !!process.env["VERCEL"];

function readSessionFile(): string | null {
  if (isServerless) return null;
  try {
    const fs = require("fs");
    const path = require("path");
    return fs.readFileSync(path.join(process.cwd(), ".timetree_session"), "utf-8").trim() || null;
  } catch {
    return null;
  }
}

function writeSessionFile(sessionId: string): void {
  if (isServerless) return;
  try {
    const fs = require("fs");
    const path = require("path");
    fs.writeFileSync(path.join(process.cwd(), ".timetree_session"), sessionId, "utf-8");
  } catch {
    // ignore write errors
  }
}

function deleteSessionFile(): void {
  if (isServerless) return;
  try {
    const fs = require("fs");
    const path = require("path");
    const p = path.join(process.cwd(), ".timetree_session");
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    // ignore
  }
}

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
    if (!this.sessionId) {
      this.sessionId = readSessionFile();
      if (!this.sessionId) {
        await this.login();
        if (this.sessionId) {
          writeSessionFile(this.sessionId);
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
      deleteSessionFile();
      await this.login();
      if (this.sessionId) {
        writeSessionFile(this.sessionId);
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

  private async fetchSyncEvents(calendarId: number): Promise<TimeTreeRawEvent[]> {
    const data = await this.apiGet<{ events: TimeTreeRawEvent[]; chunk: boolean; since: number }>(
      `/calendar/${calendarId}/events/sync`,
    );
    const events = [...data.events];
    let { chunk, since } = data;
    while (chunk) {
      const next = await this.apiGet<{ events: TimeTreeRawEvent[]; chunk: boolean; since: number }>(
        `/calendar/${calendarId}/events/sync?since=${since}`,
      );
      events.push(...next.events);
      chunk = next.chunk;
      since = next.since;
    }
    return events;
  }

  private async fetchRecurringEvents(calendarId: number, from: Date, to: Date): Promise<TimeTreeRawEvent[]> {
    const seen = new Set<string>();
    const recurring: TimeTreeRawEvent[] = [];

    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);

    while (cursor <= endMonth) {
      const data = await this.apiGet<{ events: TimeTreeRawEvent[] }>(
        `/calendar/${calendarId}/events?year=${cursor.getFullYear()}&month=${cursor.getMonth() + 1}`,
      );
      for (const ev of data.events) {
        if (ev.recurrences && ev.recurrences.length > 0 && !seen.has(ev.uuid)) {
          seen.add(ev.uuid);
          recurring.push(ev);
        }
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return this.expandRecurringEvents(recurring, from, to);
  }

  private async fetchAllEvents(calendarId: number, from: Date, to: Date): Promise<TimeTreeRawEvent[]> {
    const [syncEvents, recurringEvents] = await Promise.all([
      this.fetchSyncEvents(calendarId),
      this.fetchRecurringEvents(calendarId, from, to),
    ]);

    const seen = new Set(syncEvents.map((ev) => ev.uuid));
    const combined = [...syncEvents];
    for (const ev of recurringEvents) {
      if (!seen.has(ev.uuid)) {
        combined.push(ev);
      }
    }
    return combined;
  }

  private async expandRecurringEvents(events: TimeTreeRawEvent[], from: Date, to: Date): Promise<TimeTreeRawEvent[]> {
    const _require = createRequire(import.meta.url);
    const { RRule } = _require("rrule");
    const result: TimeTreeRawEvent[] = [];

    for (const ev of events) {
      if (!ev.recurrences || ev.recurrences.length === 0) {
        result.push(ev);
        continue;
      }

      const duration = ev.end_at - ev.start_at;
      const dtstart = new Date(ev.start_at);

      for (const rruleStr of ev.recurrences) {
        try {
          const rule = RRule.fromString(`${rruleStr}\nDTSTART:${dtstart.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`);
          const occurrences = rule.between(from, to, true);
          for (const occ of occurrences) {
            result.push({
              ...ev,
              uuid: `${ev.uuid}_${occ.getTime()}`,
              start_at: occ.getTime(),
              end_at: occ.getTime() + duration,
              recurrences: [],
            });
          }
        } catch {
          result.push(ev);
        }
      }
    }

    return result;
  }

  async getEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    const calendars = await this.getCalendars();
    if (!this.calendarId) {
      if (calendars.length === 0) throw new Error("No TimeTree calendars found");
      this.calendarId = calendars[0].id;
      console.log(`[TimeTree] Using calendar: "${calendars[0].name}" (id: ${this.calendarId})`);
    }
    const currentCal = calendars.find(c => c.id === this.calendarId) || calendars[0];

    const rawEvents = await this.fetchAllEvents(this.calendarId, from, to);
    const fromMs = from.getTime();
    const toMs = to.getTime();

    return rawEvents
      .filter((ev) => {
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
          const rawEvents = await this.fetchAllEvents(cal.id, from, to);
          const mapped = rawEvents
            .filter((ev) => {
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
