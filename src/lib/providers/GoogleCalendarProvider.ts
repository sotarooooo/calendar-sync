import { google, type calendar_v3 } from "googleapis";
import type { CalendarProvider, CalendarEvent } from "@/lib/providers/CalendarProvider";

export class GoogleCalendarProvider implements CalendarProvider {
  readonly name = "GoogleCalendar";
  private calendar: calendar_v3.Calendar;
  private readonly calendarId: string;
  private readonly ownerEmail: string;

  constructor(credentials: {
    serviceAccountKey: string;
    calendarId?: string;
    ownerEmail: string;
  }) {
    const key = JSON.parse(credentials.serviceAccountKey);
    const auth = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    this.calendar = google.calendar({ version: "v3", auth });
    const cid = credentials.calendarId;
    this.calendarId = (!cid || cid === "primary") ? credentials.ownerEmail : cid;
    this.ownerEmail = credentials.ownerEmail;
  }

  getCalendarId(): string {
    return this.calendarId;
  }

  async getEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    return this._fetchEventsFromCalendar(this.calendarId, from, to);
  }

  async getAllEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    return this._fetchEventsFromCalendar(this.calendarId, from, to);
  }

  async getAllCalendars() {
    const res = await this.calendar.calendars.get({ calendarId: this.calendarId });
    return [{
      id: res.data.id,
      name: res.data.summary,
      color: undefined,
    }];
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
