import { describe, expect, it } from "vitest";
import {
  formatLocalTime,
  localDateKey,
  localHHMM,
  startOfLocalDay,
  zonedTimeToUtc,
  zoneOffsetMinutes,
} from "@/lib/time";

describe("time zones", () => {
  it("converts local wall-clock times to UTC", () => {
    expect(zonedTimeToUtc("2026-10-17", "14:30", "Africa/Lagos").toISOString()).toBe(
      "2026-10-17T13:30:00.000Z",
    );
    expect(zonedTimeToUtc("2026-10-17", "09:00", "America/New_York").toISOString()).toBe(
      "2026-10-17T13:00:00.000Z",
    );
    expect(zonedTimeToUtc("2026-01-17", "09:00", "America/New_York").toISOString()).toBe(
      "2026-01-17T14:00:00.000Z",
    );
    expect(zonedTimeToUtc("2026-10-17", "09:00", null).toISOString()).toBe("2026-10-17T09:00:00.000Z");
  });

  it("handles the day of a DST change", () => {
    // US clocks fall back on 2026-11-01 at 2:00.
    expect(zonedTimeToUtc("2026-11-01", "12:00", "America/New_York").toISOString()).toBe(
      "2026-11-01T17:00:00.000Z",
    );
    expect(zoneOffsetMinutes(Date.parse("2026-07-01T12:00:00Z"), "Europe/London")).toBe(60);
  });

  it("finds the start of the local day and formats times", () => {
    const at = Date.parse("2026-10-17T23:30:00Z"); // already the 18th in Lagos
    expect(localDateKey(at, "Africa/Lagos")).toBe("2026-10-18");
    expect(startOfLocalDay(at, "Africa/Lagos").toISOString()).toBe("2026-10-17T23:00:00.000Z");
    expect(formatLocalTime("2026-10-17T13:30:00Z", "Africa/Lagos")).toBe("2:30 PM");
    expect(localHHMM("2026-10-17T13:30:00Z", "Africa/Lagos")).toBe("14:30");
  });
});
