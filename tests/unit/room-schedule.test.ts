import { describe, expect, it } from "vitest";
import {
  describeSchedule,
  nextStart,
  previousStart,
  roomPhase,
  trackPosition,
  type RoomTiming,
} from "@/lib/rooms/schedule";

const MIN = 60_000;
const hourly: RoomTiming = {
  schedule: "hourly",
  starts_at: "2026-10-16T09:00:00Z",
  session_minutes: 55,
  focus_minutes: 25,
  break_minutes: 5,
};
const at = (iso: string) => Date.parse(iso);

describe("room schedule", () => {
  it("finds occurrences for hourly rooms", () => {
    expect(previousStart(hourly, at("2026-10-16T11:20:00Z"))).toBe(at("2026-10-16T11:00:00Z"));
    expect(nextStart(hourly, at("2026-10-16T11:20:00Z"))).toBe(at("2026-10-16T12:00:00Z"));
    expect(previousStart(hourly, at("2026-10-16T08:00:00Z"))).toBeNull();
    expect(nextStart(hourly, at("2026-10-16T08:00:00Z"))).toBe(at("2026-10-16T09:00:00Z"));
  });

  it("computes the shared phase everyone sees", () => {
    const p = roomPhase(hourly, at("2026-10-16T11:10:00Z"));
    expect(p).toMatchObject({ live: true, phase: "focus", lap: 1, laps: 2, remaining: 15 * MIN });
    const b = roomPhase(hourly, at("2026-10-16T11:27:00Z"));
    expect(b).toMatchObject({ live: true, phase: "break", lap: 1, remaining: 3 * MIN });
    const lap2 = roomPhase(hourly, at("2026-10-16T11:31:00Z"));
    expect(lap2).toMatchObject({ phase: "focus", lap: 2, remaining: 24 * MIN });
    // The last cycle's break is clipped by the session end (55 minutes).
    const last = roomPhase(hourly, at("2026-10-16T11:56:00Z"));
    expect(last.live).toBe(false);
  });

  it("skips weekends for weekday rooms", () => {
    const weekdays: RoomTiming = {
      ...hourly,
      schedule: "weekdays",
      starts_at: "2026-10-12T09:00:00Z",
      session_minutes: 60,
    };
    // Fri 2026-10-16 → next is Mon 2026-10-19
    expect(nextStart(weekdays, at("2026-10-16T12:00:00Z"))).toBe(at("2026-10-19T09:00:00Z"));
    expect(roomPhase(weekdays, at("2026-10-17T09:10:00Z")).live).toBe(false); // Saturday
  });

  it("keeps everyone on the same point of the track", () => {
    expect(trackPosition(at("2026-10-16T11:00:00Z"), at("2026-10-16T11:04:00Z"), 180)).toBe(60);
  });

  it("describes schedules", () => {
    expect(describeSchedule(hourly)).toBe("Every hour on the hour");
    expect(describeSchedule({ ...hourly, schedule: "daily" }, "UTC")).toBe("Every day at 9:00 AM");
  });
});
