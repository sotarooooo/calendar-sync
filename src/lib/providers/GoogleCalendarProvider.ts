import { google, type calendar_v3 } from "googleapis";
import type { CalendarProvider, CalendarEvent } from "@/lib/providers/CalendarProvider";

export class GoogleCalendarProvider implements CalendarProvider {
  readonly name = "GoogleCalendar";
  private calendar: calendar_v3.Calendar;
  private readonly calendarId: string;
  private readonly ownerEmail: string;

  constructor(credentials: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    calendarId?: string;
    ownerEmail: string;
  }) {
    const auth = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
    );
    auth.setCredentials({ refresh_token: credentials.refreshToken });

    this.calendar = google.calendar({ version: "v3", auth });
    this.calendarId = credentials.calendarId ?? "primary";
    this.ownerEmail = credentials.ownerEmail;
  }

  async getEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    return this._fetchEventsFromCalendar(this.calendarId, from, to);
  }

  async getAllEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    const res = await this.calendar.calendarList.list();
    const calendars = res.data.items ?? [];
    
    const allEvents: CalendarEvent[] = [];
    await Promise.all(
      calendars.map(async (cal) => {
        if (!cal.id) return;
        try {
          const events = await this._fetchEventsFromCalendar(cal.id, from, to);
          // 所属するカレンダーの名前を持たせる
          events.forEach(e => e.calendarName = cal.summary ?? "Unknown");
          allEvents.push(...events);
        } catch (e) {
          // 権限がないカレンダーなどは無視
          console.error(`Failed to fetch from Google Calendar: ${cal.id}`);
        }
      })
    );
    return allEvents;
  }

  async getAllCalendars() {
    const res = await this.calendar.calendarList.list();
    return (res.data.items ?? []).map(cal => ({
      id: cal.id,
      name: cal.summary,
      color: cal.backgroundColor
    }));
  }

  private async _fetchEventsFromCalendar(calendarId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    let pageToken: string | undefined;

    do {
      const res = await this.calendar.events.list({
        calendarId,
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 250,
        pageToken,
      });

      for (const item of res.data.items ?? []) {
        if (!item.id || !item.start) continue;

        // ご自身（GOOGLE_OWNER_EMAIL）以外の予定を抽出対象から完全に除外する
        if (item.creator?.email && item.creator.email !== this.ownerEmail) continue;

        const isAllDay = !!item.start.date;
        const start = new Date(item.start.dateTime ?? item.start.date!);
        const end = new Date(
          item.end?.dateTime ?? item.end?.date ?? item.start.dateTime ?? item.start.date!,
        );

        events.push({
          id: item.id,
          title: item.summary ?? "(無題)",
          start,
          end,
          creatorEmail: item.creator?.email,
          isAllDay,
          raw: item,
        });
      }

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    return events;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId: this.calendarId,
      eventId,
    });
  }

  async updateEvent(eventId: string, patch: {
    start: Date;
    end: Date;
    isAllDay: boolean;
  }): Promise<void> {
    const body: calendar_v3.Schema$Event = {};
    if (patch.isAllDay) {
      body.start = { date: patch.start.toISOString().split("T")[0] };
      body.end = { date: patch.end.toISOString().split("T")[0] };
    } else {
      body.start = { dateTime: patch.start.toISOString(), timeZone: "Asia/Tokyo" };
      body.end = { dateTime: patch.end.toISOString(), timeZone: "Asia/Tokyo" };
    }
    await this.calendar.events.patch({
      calendarId: this.calendarId,
      eventId,
      requestBody: body,
    });
  }

  async createEvent(event: {
    title: string;
    start: Date;
    end: Date;
    isAllDay: boolean;
  }): Promise<void> {
    const body: calendar_v3.Schema$Event = {
      summary: event.title,
    };

    if (event.isAllDay) {
      body.start = { date: event.start.toISOString().split("T")[0] };
      body.end = { date: event.end.toISOString().split("T")[0] };
    } else {
      body.start = { dateTime: event.start.toISOString(), timeZone: "Asia/Tokyo" };
      body.end = { dateTime: event.end.toISOString(), timeZone: "Asia/Tokyo" };
    }

    await this.calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: body,
    });
  }

  isOwnEvent(event: CalendarEvent): boolean {
    return event.creatorEmail === this.ownerEmail;
  }
}
