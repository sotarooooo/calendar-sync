import { describe, it, expect, vi } from "vitest";
import {
  timeOverlaps,
  subtractOverlaps,
  SyncEngine,
  type RuntimeRule,
  type SyncRuleConfig,
} from "@/lib/engine/SyncEngine";
import type { CalendarEvent, CalendarProvider } from "@/lib/providers/CalendarProvider";
import type { GoogleCalendarProvider } from "@/lib/providers/GoogleCalendarProvider";

function makeEvent(overrides: Partial<CalendarEvent> & { start: Date; end: Date }): CalendarEvent {
  return {
    id: "evt-1",
    title: "Test Event",
    isAllDay: false,
    ...overrides,
  };
}

// --- timeOverlaps ---

describe("timeOverlaps", () => {
  it("detects partial overlap", () => {
    const a = makeEvent({ start: new Date("2026-05-05T09:00"), end: new Date("2026-05-05T11:00") });
    const b = makeEvent({ start: new Date("2026-05-05T10:00"), end: new Date("2026-05-05T12:00") });
    expect(timeOverlaps(a, b)).toBe(true);
  });

  it("returns false for non-overlapping events", () => {
    const a = makeEvent({ start: new Date("2026-05-05T09:00"), end: new Date("2026-05-05T10:00") });
    const b = makeEvent({ start: new Date("2026-05-05T11:00"), end: new Date("2026-05-05T12:00") });
    expect(timeOverlaps(a, b)).toBe(false);
  });

  it("returns false when events share only an endpoint", () => {
    const a = makeEvent({ start: new Date("2026-05-05T09:00"), end: new Date("2026-05-05T10:00") });
    const b = makeEvent({ start: new Date("2026-05-05T10:00"), end: new Date("2026-05-05T11:00") });
    expect(timeOverlaps(a, b)).toBe(false);
  });

  it("detects when one event fully contains the other", () => {
    const outer = makeEvent({ start: new Date("2026-05-05T08:00"), end: new Date("2026-05-05T18:00") });
    const inner = makeEvent({ start: new Date("2026-05-05T10:00"), end: new Date("2026-05-05T12:00") });
    expect(timeOverlaps(outer, inner)).toBe(true);
    expect(timeOverlaps(inner, outer)).toBe(true);
  });
});

// --- subtractOverlaps ---

describe("subtractOverlaps", () => {
  it("returns two slots when overlap is in the middle", () => {
    const target = makeEvent({ start: new Date("2026-05-05T09:00"), end: new Date("2026-05-05T17:00") });
    const overlap = makeEvent({ start: new Date("2026-05-05T12:00"), end: new Date("2026-05-05T13:00") });
    const slots = subtractOverlaps(target, [overlap]);
    expect(slots).toHaveLength(2);
    expect(slots[0].start).toEqual(new Date("2026-05-05T09:00"));
    expect(slots[0].end).toEqual(new Date("2026-05-05T12:00"));
    expect(slots[1].start).toEqual(new Date("2026-05-05T13:00"));
    expect(slots[1].end).toEqual(new Date("2026-05-05T17:00"));
  });

  it("returns one slot at end when overlap covers the start", () => {
    const target = makeEvent({ start: new Date("2026-05-05T09:00"), end: new Date("2026-05-05T17:00") });
    const overlap = makeEvent({ start: new Date("2026-05-05T08:00"), end: new Date("2026-05-05T12:00") });
    const slots = subtractOverlaps(target, [overlap]);
    expect(slots).toHaveLength(1);
    expect(slots[0].start).toEqual(new Date("2026-05-05T12:00"));
    expect(slots[0].end).toEqual(new Date("2026-05-05T17:00"));
  });

  it("returns one slot at start when overlap covers the end", () => {
    const target = makeEvent({ start: new Date("2026-05-05T09:00"), end: new Date("2026-05-05T17:00") });
    const overlap = makeEvent({ start: new Date("2026-05-05T14:00"), end: new Date("2026-05-05T18:00") });
    const slots = subtractOverlaps(target, [overlap]);
    expect(slots).toHaveLength(1);
    expect(slots[0].start).toEqual(new Date("2026-05-05T09:00"));
    expect(slots[0].end).toEqual(new Date("2026-05-05T14:00"));
  });

  it("returns empty array for full overlap", () => {
    const target = makeEvent({ start: new Date("2026-05-05T10:00"), end: new Date("2026-05-05T12:00") });
    const overlap = makeEvent({ start: new Date("2026-05-05T09:00"), end: new Date("2026-05-05T13:00") });
    const slots = subtractOverlaps(target, [overlap]);
    expect(slots).toHaveLength(0);
  });

  it("returns entire target when no overlaps", () => {
    const target = makeEvent({ start: new Date("2026-05-05T09:00"), end: new Date("2026-05-05T17:00") });
    const overlap = makeEvent({ start: new Date("2026-05-05T18:00"), end: new Date("2026-05-05T19:00") });
    const slots = subtractOverlaps(target, [overlap]);
    expect(slots).toHaveLength(1);
    expect(slots[0].start).toEqual(new Date("2026-05-05T09:00"));
    expect(slots[0].end).toEqual(new Date("2026-05-05T17:00"));
  });

  it("merges adjacent overlapping sources", () => {
    const target = makeEvent({ start: new Date("2026-05-05T09:00"), end: new Date("2026-05-05T17:00") });
    const o1 = makeEvent({ start: new Date("2026-05-05T11:00"), end: new Date("2026-05-05T13:00") });
    const o2 = makeEvent({ start: new Date("2026-05-05T12:00"), end: new Date("2026-05-05T15:00") });
    const slots = subtractOverlaps(target, [o1, o2]);
    expect(slots).toHaveLength(2);
    expect(slots[0].end).toEqual(new Date("2026-05-05T11:00"));
    expect(slots[1].start).toEqual(new Date("2026-05-05T15:00"));
  });
});

// --- SyncEngine.run() ---

function createMockSource(events: CalendarEvent[]): CalendarProvider {
  return {
    name: "MockSource",
    getEvents: vi.fn().mockResolvedValue(events),
    deleteEvent: vi.fn(),
  };
}

function createMockTarget(events: CalendarEvent[]) {
  return {
    name: "MockTarget",
    getEvents: vi.fn().mockResolvedValue(events),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    updateEvent: vi.fn().mockResolvedValue(undefined),
    createEvent: vi.fn().mockResolvedValue(undefined),
    isOwnEvent: vi.fn().mockReturnValue(true),
  } as unknown as GoogleCalendarProvider;
}

function makeRule(
  source: CalendarProvider,
  target: ReturnType<typeof createMockTarget>,
  action: "delete_overlap" | "copy" = "delete_overlap",
): RuntimeRule {
  return {
    config: {
      id: "rule-1",
      sourceName: "timetree:1",
      targetName: "google_calendar:1",
      action,
      lookAheadDays: 30,
      enabled: true,
    },
    source,
    target: target as unknown as GoogleCalendarProvider,
  };
}

describe("SyncEngine.run() - delete_overlap", () => {
  it("deletes target event fully overlapped by source", async () => {
    const sourceEvent = makeEvent({
      id: "src-1",
      start: new Date("2026-05-10T09:00"),
      end: new Date("2026-05-10T12:00"),
    });
    const targetEvent = makeEvent({
      id: "tgt-1",
      start: new Date("2026-05-10T10:00"),
      end: new Date("2026-05-10T11:00"),
      creatorEmail: "owner@test.com",
    });

    const target = createMockTarget([targetEvent]);
    const engine = new SyncEngine([makeRule(createMockSource([sourceEvent]), target)]);
    const logs = await engine.run();

    expect(target.deleteEvent).toHaveBeenCalledWith("tgt-1");
    expect(logs.some((l) => l.action === "deleted")).toBe(true);
  });

  it("trims target event partially overlapped by source", async () => {
    const sourceEvent = makeEvent({
      id: "src-1",
      start: new Date("2026-05-10T09:00"),
      end: new Date("2026-05-10T11:00"),
    });
    const targetEvent = makeEvent({
      id: "tgt-1",
      start: new Date("2026-05-10T10:00"),
      end: new Date("2026-05-10T14:00"),
      creatorEmail: "owner@test.com",
    });

    const target = createMockTarget([targetEvent]);
    const engine = new SyncEngine([makeRule(createMockSource([sourceEvent]), target)]);
    const logs = await engine.run();

    expect(target.updateEvent).toHaveBeenCalledWith("tgt-1", expect.objectContaining({
      start: new Date("2026-05-10T11:00"),
      end: new Date("2026-05-10T14:00"),
    }));
    expect(logs.some((l) => l.action === "trimmed")).toBe(true);
  });

  it("skips all-day events", async () => {
    const sourceEvent = makeEvent({
      id: "src-1",
      start: new Date("2026-05-10T00:00"),
      end: new Date("2026-05-11T00:00"),
    });
    const targetEvent = makeEvent({
      id: "tgt-1",
      start: new Date("2026-05-10T00:00"),
      end: new Date("2026-05-11T00:00"),
      isAllDay: true,
    });

    const target = createMockTarget([targetEvent]);
    const engine = new SyncEngine([makeRule(createMockSource([sourceEvent]), target)]);
    const logs = await engine.run();

    expect(target.deleteEvent).not.toHaveBeenCalled();
    expect(target.updateEvent).not.toHaveBeenCalled();
    expect(logs).toHaveLength(0);
  });

  it("does nothing when events do not overlap", async () => {
    const sourceEvent = makeEvent({
      id: "src-1",
      start: new Date("2026-05-10T09:00"),
      end: new Date("2026-05-10T10:00"),
    });
    const targetEvent = makeEvent({
      id: "tgt-1",
      start: new Date("2026-05-10T14:00"),
      end: new Date("2026-05-10T16:00"),
    });

    const target = createMockTarget([targetEvent]);
    const engine = new SyncEngine([makeRule(createMockSource([sourceEvent]), target)]);
    const logs = await engine.run();

    expect(target.deleteEvent).not.toHaveBeenCalled();
    expect(target.updateEvent).not.toHaveBeenCalled();
    expect(logs).toHaveLength(0);
  });
});

describe("SyncEngine.run() - copy", () => {
  it("copies source event not present in target", async () => {
    const sourceEvent = makeEvent({
      id: "src-1",
      title: "Meeting",
      start: new Date("2026-05-10T09:00"),
      end: new Date("2026-05-10T10:00"),
    });

    const target = createMockTarget([]);
    const engine = new SyncEngine([makeRule(createMockSource([sourceEvent]), target, "copy")]);
    const logs = await engine.run();

    expect(target.createEvent).toHaveBeenCalledWith(expect.objectContaining({ title: "Meeting" }));
    expect(logs.some((l) => l.action === "copied")).toBe(true);
  });

  it("skips copy when duplicate exists in target", async () => {
    const sourceEvent = makeEvent({
      id: "src-1",
      title: "Meeting",
      start: new Date("2026-05-10T09:00"),
      end: new Date("2026-05-10T10:00"),
    });
    const targetEvent = makeEvent({
      id: "tgt-1",
      title: "Meeting",
      start: new Date("2026-05-10T09:00"),
      end: new Date("2026-05-10T10:00"),
    });

    const target = createMockTarget([targetEvent]);
    const engine = new SyncEngine([makeRule(createMockSource([sourceEvent]), target, "copy")]);
    const logs = await engine.run();

    expect(target.createEvent).not.toHaveBeenCalled();
    expect(logs).toHaveLength(0);
  });
});
