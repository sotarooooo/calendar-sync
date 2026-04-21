import type { CalendarProvider, CalendarEvent } from "@/lib/providers/CalendarProvider";
import type { GoogleCalendarProvider } from "@/lib/providers/GoogleCalendarProvider";

export type SyncAction = "delete_overlap" | "copy";

export interface SyncRuleConfig {
  id: string;
  sourceName: string;
  targetName: string;
  action: SyncAction;
  lookAheadDays: number;
  enabled: boolean;
}

export interface RuntimeRule {
  config: SyncRuleConfig;
  source: CalendarProvider;
  target: GoogleCalendarProvider;
}

export interface SyncLogEntry {
  ruleId: string;
  action: string;
  eventTitle: string;
  eventStart: string;
  eventEnd: string;
  status: "success" | "error";
  message: string;
  timestamp: string;
}

function timeOverlaps(a: CalendarEvent, b: CalendarEvent): boolean {
  return a.start < b.end && a.end > b.start;
}

export class SyncEngine {
  private rules: RuntimeRule[];

  constructor(rules: RuntimeRule[]) {
    this.rules = rules.filter((r) => r.config.enabled);
  }

  async run(): Promise<SyncLogEntry[]> {
    const logs: SyncLogEntry[] = [];

    for (const rule of this.rules) {
      const now = new Date();
      const until = new Date(now.getTime() + rule.config.lookAheadDays * 24 * 60 * 60 * 1000);

      const [sourceEvents, targetEvents] = await Promise.all([
        rule.source.getEvents(now, until),
        rule.target.getEvents(now, until),
      ]);

      console.log(
        `[sync] ${rule.config.sourceName} → ${rule.config.targetName} (${rule.config.action}): ` +
        `${sourceEvents.length} source, ${targetEvents.length} target`,
      );

      if (rule.config.action === "delete_overlap") {
        const ownTargetEvents = targetEvents.filter((ev) => rule.target.isOwnEvent(ev));

        for (const targetEvent of ownTargetEvents) {
          const overlapping = sourceEvents.some((src) => timeOverlaps(src, targetEvent));
          if (!overlapping) continue;

          try {
            await rule.target.deleteEvent(targetEvent.id);
            logs.push({
              ruleId: rule.config.id,
              action: "deleted",
              eventTitle: targetEvent.title,
              eventStart: targetEvent.start.toISOString(),
              eventEnd: targetEvent.end.toISOString(),
              status: "success",
              message: `Overlaps with ${rule.config.sourceName} event`,
              timestamp: new Date().toISOString(),
            });
          } catch (e) {
            logs.push({
              ruleId: rule.config.id,
              action: "delete_failed",
              eventTitle: targetEvent.title,
              eventStart: targetEvent.start.toISOString(),
              eventEnd: targetEvent.end.toISOString(),
              status: "error",
              message: e instanceof Error ? e.message : String(e),
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      if (rule.config.action === "copy") {
        for (const srcEvent of sourceEvents) {
          const alreadyExists = targetEvents.some(
            (t) => t.title === srcEvent.title && timeOverlaps(t, srcEvent),
          );
          if (alreadyExists) continue;

          try {
            await rule.target.createEvent({
              title: srcEvent.title,
              start: srcEvent.start,
              end: srcEvent.end,
              isAllDay: srcEvent.isAllDay,
            });
            logs.push({
              ruleId: rule.config.id,
              action: "copied",
              eventTitle: srcEvent.title,
              eventStart: srcEvent.start.toISOString(),
              eventEnd: srcEvent.end.toISOString(),
              status: "success",
              message: `Copied from ${rule.config.sourceName}`,
              timestamp: new Date().toISOString(),
            });
          } catch (e) {
            logs.push({
              ruleId: rule.config.id,
              action: "copy_failed",
              eventTitle: srcEvent.title,
              eventStart: srcEvent.start.toISOString(),
              eventEnd: srcEvent.end.toISOString(),
              status: "error",
              message: e instanceof Error ? e.message : String(e),
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    return logs;
  }
}
