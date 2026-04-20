import type { CalendarProvider, CalendarEvent } from "../providers/CalendarProvider.js";
import type { GoogleCalendarProvider } from "../providers/GoogleCalendarProvider.js";

export interface SyncRule {
  source: CalendarProvider;
  target: GoogleCalendarProvider;
  lookAheadDays: number;
}

interface SyncResult {
  deleted: { event: CalendarEvent; reason: string }[];
  errors: { event: CalendarEvent; error: string }[];
}

function timeOverlaps(a: CalendarEvent, b: CalendarEvent): boolean {
  return a.start < b.end && a.end > b.start;
}

export class SyncEngine {
  private rules: SyncRule[];
  private processedPairs = new Set<string>();

  constructor(rules: SyncRule[]) {
    this.rules = rules;
  }

  async run(): Promise<SyncResult> {
    const result: SyncResult = { deleted: [], errors: [] };

    for (const rule of this.rules) {
      const now = new Date();
      const until = new Date(now.getTime() + rule.lookAheadDays * 24 * 60 * 60 * 1000);

      const [sourceEvents, targetEvents] = await Promise.all([
        rule.source.getEvents(now, until),
        rule.target.getEvents(now, until),
      ]);

      console.log(
        `[sync] ${rule.source.name} → ${rule.target.name}: ` +
        `${sourceEvents.length} source events, ${targetEvents.length} target events`,
      );

      const ownTargetEvents = targetEvents.filter((ev) => rule.target.isOwnEvent(ev));

      for (const targetEvent of ownTargetEvents) {
        const overlapping = sourceEvents.some((srcEvent) => timeOverlaps(srcEvent, targetEvent));

        if (!overlapping) continue;

        const pairKey = `${rule.source.name}:${rule.target.name}:${targetEvent.id}`;
        if (this.processedPairs.has(pairKey)) continue;
        this.processedPairs.add(pairKey);

        try {
          await rule.target.deleteEvent(targetEvent.id);
          result.deleted.push({
            event: targetEvent,
            reason: `Overlaps with ${rule.source.name} event`,
          });
          console.log(`[deleted] "${targetEvent.title}" (${targetEvent.start.toLocaleString()})`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          result.errors.push({ event: targetEvent, error: msg });
          console.error(`[error] Failed to delete "${targetEvent.title}": ${msg}`);
        }
      }
    }

    return result;
  }

  resetProcessed(): void {
    this.processedPairs.clear();
  }
}
