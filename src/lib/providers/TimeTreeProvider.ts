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
  recurrences?: string[];
}

interface TimeTreeCalendarMeta {
  id: number;
  name: string;
  color: number;
}


const DAY_MAP: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const MS_PER_DAY = 86400000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

function parseRRuleParts(rruleStr: string): Record<string, string> {
  const str = rruleStr.replace(/^RRULE:/, "");
  const parts: Record<string, string> = {};
  for (const pair of str.split(";")) {
    const [k, v] = pair.split("=");
    if (k && v) parts[k] = v;
  }
  return parts;
}

function expandRRule(rruleStr: string, dtstart: Date, from: Date, to: Date): Date[] {
  const parts = parseRRuleParts(rruleStr);
  const freq = parts["FREQ"];
  if (!freq) return [];

  const interval = parts["INTERVAL"] ? parseInt(parts["INTERVAL"]) : 1;
  const until = parts["UNTIL"] ? parseRRuleDate(parts["UNTIL"]) : null;
  const count = parts["COUNT"] ? parseInt(parts["COUNT"]) : null;
  const effectiveEnd = until && until < to ? until : to;

  const results: Date[] = [];

  const h = dtstart.getUTCHours();
  const m = dtstart.getUTCMinutes();
  const s = dtstart.getUTCSeconds();
  const ms = dtstart.getUTCMilliseconds();

  if (freq === "DAILY") {
    const startMs = dtstart.getTime();
    const stepMs = interval * MS_PER_DAY;
    let cursor: number;
    if (count) {
      cursor = startMs;
    } else {
      const skip = Math.max(0, Math.floor((from.getTime() - startMs) / stepMs));
      cursor = startMs + skip * stepMs;
    }
    let total = count ? Math.floor((cursor - startMs) / stepMs) : 0;
    while (cursor <= effectiveEnd.getTime()) {
      if (cursor >= from.getTime()) results.push(new Date(cursor));
      total++;
      if (count && total >= count) break;
      cursor += stepMs;
    }
  } else if (freq === "WEEKLY") {
    const byDay = parts["BYDAY"]?.split(",").map(d => DAY_MAP[d]).filter(d => d !== undefined) ?? [dtstart.getUTCDay()];
    const startSunday = dtstart.getTime() - dtstart.getUTCDay() * MS_PER_DAY;
    const stepMs = interval * MS_PER_WEEK;
    let weekStart: number;
    if (count) {
      weekStart = startSunday;
    } else {
      const skip = Math.max(0, Math.floor((from.getTime() - startSunday - 7 * MS_PER_DAY) / stepMs));
      weekStart = startSunday + skip * stepMs;
    }
    let total = count ? Math.floor((weekStart - startSunday) / stepMs) * byDay.length : 0;
    while (weekStart <= effectiveEnd.getTime() + MS_PER_WEEK) {
      for (const day of byDay) {
        const d = new Date(weekStart + day * MS_PER_DAY);
        d.setUTCHours(h, m, s, ms);
        const t = d.getTime();
        if (t >= dtstart.getTime() && t >= from.getTime() && t <= effectiveEnd.getTime()) {
          results.push(d);
        }
        total++;
        if (count && total >= count) break;
      }
      if (count && total >= count) break;
      weekStart += stepMs;
    }
  } else if (freq === "MONTHLY") {
    const dayOfMonth = parts["BYMONTHDAY"] ? parseInt(parts["BYMONTHDAY"]) : dtstart.getUTCDate();
    let year: number, month: number;
    if (count) {
      year = dtstart.getUTCFullYear();
      month = dtstart.getUTCMonth();
    } else {
      const diffMonths = (from.getUTCFullYear() - dtstart.getUTCFullYear()) * 12 + (from.getUTCMonth() - dtstart.getUTCMonth());
      const skip = Math.max(0, Math.floor(diffMonths / interval) - 1) * interval;
      year = dtstart.getUTCFullYear();
      month = dtstart.getUTCMonth() + skip;
    }
    let total = 0;
    while (true) {
      const d = new Date(Date.UTC(year, month, dayOfMonth, h, m, s, ms));
      if (d > effectiveEnd) break;
      if (d >= from) results.push(d);
      total++;
      if (count && total >= count) break;
      month += interval;
    }
  } else if (freq === "YEARLY") {
    let year: number;
    if (count) {
      year = dtstart.getUTCFullYear();
    } else {
      const skip = Math.max(0, Math.floor((from.getUTCFullYear() - dtstart.getUTCFullYear()) / interval) - 1) * interval;
      year = dtstart.getUTCFullYear() + skip;
    }
    let total = 0;
    while (true) {
      const d = new Date(Date.UTC(year, dtstart.getUTCMonth(), dtstart.getUTCDate(), h, m, s, ms));
      if (d > effectiveEnd) break;
      if (d >= from) results.push(d);
      total++;
      if (count && total >= count) break;
      year += interval;
    }
  }

  return results;
}

function parseRRuleDate(s: string): Date {
  const clean = s.replace(/[Z]/g, "");
  if (clean.length >= 15) {
    return new Date(Date.UTC(
      parseInt(clean.slice(0, 4)), parseInt(clean.slice(4, 6)) - 1, parseInt(clean.slice(6, 8)),
      parseInt(clean.slice(9, 11)), parseInt(clean.slice(11, 13)), parseInt(clean.slice(13, 15)),
    ));
  }
  return new Date(Date.UTC(parseInt(clean.slice(0, 4)), parseInt(clean.slice(4, 6)) - 1, parseInt(clean.slice(6, 8))));
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
    const [syncEvents, monthlyRecurring] = await Promise.all([
      this.fetchSyncEvents(calendarId),
      this.fetchRecurringEvents(calendarId, from, to),
    ]);

    const regular: TimeTreeRawEvent[] = [];
    const recurringTemplates: TimeTreeRawEvent[] = [];
    for (const ev of syncEvents) {
      if (ev.recurrences && ev.recurrences.length > 0) {
        recurringTemplates.push(ev);
      } else {
        regular.push(ev);
      }
    }

    const expandedFromSync = this.expandRecurringEvents(recurringTemplates, from, to);

    const seen = new Set<string>();
    const combined: TimeTreeRawEvent[] = [];
    for (const ev of [...regular, ...expandedFromSync, ...monthlyRecurring]) {
      if (!seen.has(ev.uuid)) {
        seen.add(ev.uuid);
        combined.push(ev);
      }
    }
    return combined;
  }

  private expandRecurringEvents(events: TimeTreeRawEvent[], from: Date, to: Date): TimeTreeRawEvent[] {
    const result: TimeTreeRawEvent[] = [];

    for (const ev of events) {
      if (!ev.recurrences || ev.recurrences.length === 0) {
        result.push(ev);
        continue;
      }

      const rrules = ev.recurrences.filter(s => s.startsWith("RRULE:"));
      const exdates = new Set(
        ev.recurrences
          .filter(s => s.startsWith("EXDATE:"))
          .map(s => parseRRuleDate(s.replace(/^EXDATE:/, "")).getTime()),
      );

      if (rrules.length === 0) {
        result.push(ev);
        continue;
      }

      const duration = ev.end_at - ev.start_at;
      const dtstart = new Date(ev.start_at);

      for (const rruleStr of rrules) {
        try {
          const occurrences = expandRRule(rruleStr, dtstart, from, to);
          for (const occ of occurrences) {
            if (exdates.has(occ.getTime())) continue;
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
