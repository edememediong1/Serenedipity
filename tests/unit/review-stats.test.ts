import { describe, expect, it } from "vitest";
import {
  addDays,
  dayKey,
  reviewWeek,
  streak,
  summarizeDay,
  type BlockRow,
  type TaskRow,
} from "@/lib/review/stats";

const block = (iso: string, minutes = 25, extra: Partial<BlockRow> = {}): BlockRow => ({
  started_at: iso,
  focused_seconds: minutes * 60,
  completed: true,
  outcome: "done",
  task_title: null,
  technique: "pomodoro",
  planned_minutes: 25,
  ...extra,
});
const task = (iso: string, status: string): TaskRow => ({
  id: iso + status,
  title: "t",
  status,
  estimate_minutes: 25,
  created_at: iso,
  completed_at: null,
});

describe("review stats", () => {
  it("buckets by the user's day", () => {
    expect(dayKey("2026-10-16T03:00:00Z", "America/New_York")).toBe("2026-10-15");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
  });

  it("summarises a day with achievement rate", () => {
    const d = summarizeDay(
      "2026-10-15",
      [
        block("2026-10-15T14:00:00Z"),
        block("2026-10-15T15:00:00Z", 10, { completed: false, outcome: "skipped" }),
      ],
      [
        task("2026-10-15T13:00:00Z", "done"),
        task("2026-10-15T13:00:00Z", "todo"),
        task("2026-10-14T13:00:00Z", "done"),
      ],
      "UTC",
    );
    expect(d).toMatchObject({ focusMinutes: 35, laps: 1, planned: 2, done: 1, achievement: 50 });
  });

  it("counts streaks back from today (or yesterday)", () => {
    const blocks = [
      block("2026-10-13T10:00:00Z"),
      block("2026-10-14T10:00:00Z"),
      block("2026-10-15T10:00:00Z"),
    ];
    expect(streak(blocks, "2026-10-15", "UTC")).toBe(3);
    expect(streak(blocks, "2026-10-16", "UTC")).toBe(3); // today not started yet
    expect(streak(blocks, "2026-10-18", "UTC")).toBe(0);
  });

  it("builds a week with went-well and to-improve insights", () => {
    const blocks = [
      ...["10", "11", "12", "13", "14"].map((d) => block(`2026-10-${d}T09:00:00Z`, 50)),
      block("2026-10-15T09:00:00Z", 20, { outcome: "stuck", completed: false }),
      block("2026-10-15T10:00:00Z", 20, { outcome: "stuck", completed: false }),
    ];
    const tasks = ["10", "11", "12", "13"].flatMap((d) => [task(`2026-10-${d}T08:00:00Z`, "done")]);
    const w = reviewWeek("2026-10-16", blocks, tasks, "UTC");
    expect(w.days).toHaveLength(7);
    expect(w.activeDays).toBe(5);
    expect(w.achievement).toBe(100);
    expect(w.bestPeriod).toBe("morning");
    expect(w.wentWell.join(" ")).toContain("5 of 7 days");
    expect(w.toImprove.join(" ")).toContain("stuck 2 times");
  });

  it("encourages a first lap on an empty week", () => {
    const w = reviewWeek("2026-10-16", [], [], "UTC");
    expect(w.wentWell).toEqual([]);
    expect(w.toImprove[0]).toContain("one 25-minute lap");
  });
});
