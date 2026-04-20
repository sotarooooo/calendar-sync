import { google, type calendar_v3 } from "googleapis";
import type { CalendarProvider, CalendarEvent } from "./CalendarProvider.js";

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
    const events: CalendarEvent[] = [];
    let pageToken: string | undefined;

    do {
      const res = await this.calendar.events.list({
        calendarId: this.calendarId,
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

  isOwnEvent(event: CalendarEvent): boolean {
    return event.creatorEmail === this.ownerEmail;
  }
}
