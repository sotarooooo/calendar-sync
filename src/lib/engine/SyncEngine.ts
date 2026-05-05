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

export function timeOverlaps(a: CalendarEvent, b: CalendarEvent): boolean {
  return a.start < b.end && a.end > b.start;
}

export function subtractOverlaps(
  target: CalendarEvent,
  overlaps: CalendarEvent[],
): { start: Date; end: Date }[] {
  const sorted = [...overlaps].sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: { start: Date; end: Date }[] = [];
  for (const o of sorted) {
    const clippedStart = o.start < target.start ? target.start : o.start;
    const clippedEnd = o.end > target.end ? target.end : o.end;
    if (clippedStart >= clippedEnd) continue;

    if (merged.length > 0 && clippedStart <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end =
        clippedEnd > merged[merged.length - 1].end ? clippedEnd : merged[merged.length - 1].end;
    } else {
      merged.push({ start: clippedStart, end: clippedEnd });
    }
  }

  const slots: { start: Date; end: Date }[] = [];
  let cursor = target.start;
  for (const m of merged) {
    if (cursor < m.start) {
      slots.push({ start: cursor, end: m.start });
    }
    cursor = m.end;
  }
  if (cursor < target.end) {
    slots.push({ start: cursor, end: target.end });
  }

  return slots;
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
          if (targetEvent.isAllDay) continue;

          const overlaps = sourceEvents.filter((src) => timeOverlaps(src, targetEvent));
          if (overlaps.length === 0) continue;

          const freeSlots = subtractOverlaps(targetEvent, overlaps);

          try {
            if (freeSlots.length === 0) {
              await rule.target.deleteEvent(targetEvent.id);
              logs.push({
                ruleId: rule.config.id,
                action: "deleted",
                eventTitle: targetEvent.title,
                eventStart: targetEvent.start.toISOString(),
                eventEnd: targetEvent.end.toISOString(),
                status: "success",
                message: `Fully overlaps with ${rule.config.sourceName} event(s)`,
                timestamp: new Date().toISOString(),
              });
            } else if (
              freeSlots.length === 1 &&
              freeSlots[0].start.getTime() === targetEvent.start.getTime() &&
              freeSlots[0].end.getTime() === targetEvent.end.getTime()
            ) {
              continue;
            } else {
              await rule.target.updateEvent(targetEvent.id, {
                start: freeSlots[0].start,
                end: freeSlots[0].end,
                isAllDay: false,
              });
              logs.push({
                ruleId: rule.config.id,
                action: "trimmed",
                eventTitle: targetEvent.title,
                eventStart: freeSlots[0].start.toISOString(),
                eventEnd: freeSlots[0].end.toISOString(),
                status: "success",
                message: `Trimmed to non-overlapping portion`,
                timestamp: new Date().toISOString(),
              });

              for (let i = 1; i < freeSlots.length; i++) {
                await rule.target.createEvent({
                  title: targetEvent.title,
                  start: freeSlots[i].start,
                  end: freeSlots[i].end,
                  isAllDay: false,
                });
                logs.push({
                  ruleId: rule.config.id,
                  action: "split_created",
                  eventTitle: targetEvent.title,
                  eventStart: freeSlots[i].start.toISOString(),
                  eventEnd: freeSlots[i].end.toISOString(),
                  status: "success",
                  message: `Split fragment created`,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          } catch (e) {
            logs.push({
              ruleId: rule.config.id,
              action: "trim_failed",
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
