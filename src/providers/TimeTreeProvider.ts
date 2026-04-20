import type { CalendarProvider, CalendarEvent } from "./CalendarProvider.js";

interface TimeTreeEvent {
  id: string;
  attributes: {
    title: string;
    start_at: string;
    end_at: string;
    all_day: boolean;
  };
}

interface TimeTreeResponse {
  data: TimeTreeEvent[];
}

export class TimeTreeProvider implements CalendarProvider {
  readonly name = "TimeTree";
  private readonly apiToken: string;
  private readonly calendarId: string;

  constructor(apiToken: string, calendarId: string) {
    this.apiToken = apiToken;
    this.calendarId = calendarId;
  }

  async getEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      timezone: "Asia/Tokyo",
      days: String(Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))),
    });

    const url = `https://timetreeapis.com/calendars/${this.calendarId}/upcoming_events?${params}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.timetree.v1+json",
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`TimeTree API error: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as TimeTreeResponse;

    return json.data
      .map((ev) => ({
        id: ev.id,
        title: ev.attributes.title,
        start: new Date(ev.attributes.start_at),
        end: new Date(ev.attributes.end_at),
        isAllDay: ev.attributes.all_day,
        raw: ev,
      }))
      .filter((ev) => ev.start >= from && ev.start <= to);
  }

  async deleteEvent(eventId: string): Promise<void> {
    const res = await fetch(`https://timetreeapis.com/calendars/${this.calendarId}/events/${eventId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.timetree.v1+json",
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`TimeTree delete error: ${res.status}`);
    }
  }
}
