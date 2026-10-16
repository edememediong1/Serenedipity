import { describe, expect, it } from "vitest";
import { greeting, partOfDay } from "@/lib/greeting";

describe("greeting", () => {
  const at = (iso: string) => new Date(iso);
  it("uses the user's time zone", () => {
    expect(partOfDay(at("2026-10-16T13:00:00Z"), "America/New_York")).toBe("morning");
    expect(partOfDay(at("2026-10-16T13:00:00Z"), "Europe/London")).toBe("afternoon");
    expect(partOfDay(at("2026-10-16T13:00:00Z"), "Asia/Tokyo")).toBe("evening");
  });
  it("falls back to UTC for unknown zones and adds the name", () => {
    expect(partOfDay(at("2026-10-16T08:00:00Z"), "Not/AZone")).toBe("morning");
    expect(greeting(at("2026-10-16T08:00:00Z"), null, "Ada")).toBe("Good morning, Ada");
  });
});
