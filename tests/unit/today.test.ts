import { describe, expect, it } from "vitest";
import { startOfToday } from "@/lib/focus/today";

describe("startOfToday", () => {
  it("uses the user's time zone", () => {
    const now = new Date("2026-10-16T03:30:00Z"); // 11:30 PM on Oct 15 in New York
    expect(startOfToday("America/New_York", now)).toBe("2026-10-15T04:00:00.000Z");
    expect(startOfToday("UTC", now)).toBe("2026-10-16T00:00:00.000Z");
  });
  it("falls back to UTC for unknown zones", () => {
    expect(startOfToday("Not/AZone", new Date("2026-10-16T10:00:00Z"))).toBe("2026-10-16T00:00:00.000Z");
  });
});
