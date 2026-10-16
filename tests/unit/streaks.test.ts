import { describe, expect, it } from "vitest";
import {
  activityLevel,
  buildActivity,
  gridWeeks,
  shiftDay,
  summarizeStreak,
  weekStart,
  type DayActivity,
} from "@/lib/streaks/engine";

const ON: DayActivity = { blocks: 1, minutes: 25, roomSessions: 0 };
const days = (...keys: string[]) => new Map(keys.map((k) => [k, ON]));
// 2026-10-16 is a Friday; that week runs Mon 10-12 to Sun 10-18.
const TODAY = "2026-10-16";

describe("streak engine", () => {
  it("counts consecutive active days and doesn't break on a still-open today", () => {
    const s = summarizeStreak(days("2026-10-13", "2026-10-14", "2026-10-15"), TODAY, 0);
    expect(s).toMatchObject({ current: 3, activeToday: false, best: 3 });
    expect(summarizeStreak(days("2026-10-14", "2026-10-15", TODAY), TODAY, 0).current).toBe(3);
  });

  it("strict mode (0 rest days) breaks on any missed day", () => {
    const s = summarizeStreak(days("2026-10-12", "2026-10-13", "2026-10-15"), TODAY, 0);
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });

  it("gentle mode forgives up to two missed days a week", () => {
    const s = summarizeStreak(days("2026-10-12", "2026-10-14", "2026-10-16"), TODAY, 2);
    expect(s.current).toBe(3);
    expect(s.week.map((d) => d.state)).toEqual([
      "active",
      "rest",
      "active",
      "rest",
      "active",
      "future",
      "future",
    ]);
    expect(s.restDaysLeftThisWeek).toBe(0);
    // A third missed day in the same week ends it.
    const broken = summarizeStreak(days("2026-10-12", "2026-10-16"), TODAY, 2);
    expect(broken.current).toBe(1);
  });

  it("rest allowance resets each week, and days before a streak don't use it", () => {
    // Fri 10-09 active, Sat/Sun rest (previous week), Mon 10-12 active...
    const s = summarizeStreak(days("2026-10-09", "2026-10-12", "2026-10-13"), "2026-10-13", 2);
    expect(s.current).toBe(3);
    expect(summarizeStreak(new Map(), TODAY, 2)).toMatchObject({ current: 0, best: 0, atRisk: false });
  });

  it("flags a streak that needs today", () => {
    const s = summarizeStreak(days("2026-10-12", "2026-10-15"), TODAY, 2);
    expect(s).toMatchObject({ current: 2, restDaysLeftThisWeek: 0, atRisk: true });
  });

  it("buckets blocks and room sessions by local day", () => {
    const map = buildActivity(
      [
        { started_at: "2026-10-16T08:00:00Z", focused_seconds: 1500, completed: true },
        { started_at: "2026-10-16T09:00:00Z", focused_seconds: 300, completed: false },
      ],
      [
        { joined_at: "2026-10-15T10:00:00Z", last_seen_at: "2026-10-15T10:30:00Z" },
        { joined_at: "2026-10-14T10:00:00Z", last_seen_at: "2026-10-14T10:05:00Z" },
      ],
      (iso) => iso.slice(0, 10),
    );
    expect(map.get("2026-10-16")).toEqual({ blocks: 1, minutes: 30, roomSessions: 0 });
    expect(map.get("2026-10-15")).toEqual({ blocks: 0, minutes: 30, roomSessions: 1 });
    // Five minutes in a room isn't a session.
    expect(map.get("2026-10-14")).toEqual({ blocks: 0, minutes: 5, roomSessions: 0 });
    expect(summarizeStreak(map, TODAY, 0).current).toBe(2);
  });

  it("levels and grid layout", () => {
    expect(activityLevel(undefined)).toBe(0);
    expect(activityLevel({ blocks: 1, minutes: 10, roomSessions: 0 })).toBe(1);
    expect(activityLevel({ blocks: 3, minutes: 130, roomSessions: 1 })).toBe(4);
    const grid = gridWeeks(TODAY, 26);
    expect(grid).toHaveLength(26);
    expect(grid[25][0]).toBe(weekStart(TODAY));
    expect(grid[25][4]).toBe(TODAY);
    expect(grid[0][0]).toBe(shiftDay(weekStart(TODAY), -175));
  });
});
