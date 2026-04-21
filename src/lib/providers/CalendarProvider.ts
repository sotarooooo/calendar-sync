export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  creatorEmail?: string;
  isAllDay: boolean;
  raw?: unknown;
}

export interface CalendarProvider {
  readonly name: string;

  getEvents(from: Date, to: Date): Promise<CalendarEvent[]>;

  deleteEvent(eventId: string): Promise<void>;
}
