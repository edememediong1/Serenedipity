import { describe, expect, it } from "vitest";
import { dailyCheckinLimit, getAppSettings } from "@/lib/settings";

const fake = (rows: { key: string; value: unknown }[]) =>
  ({ from: () => ({ select: async () => ({ data: rows }) }) }) as never;

describe("app settings", () => {
  it("parses limits, including unlimited", async () => {
    const s = await getAppSettings(
      fake([
        { key: "free_daily_checkins", value: 3 },
        { key: "premium_daily_checkins", value: "unlimited" },
        { key: "luna_enabled", value: false },
        { key: "free_daily_room_creates", value: 5 },
        { key: "free_daily_room_joins", value: "unlimited" },
      ]),
    );
    expect(s).toEqual({
      freeDailyCheckins: 3,
      premiumDailyCheckins: null,
      lunaEnabled: false,
      freeDailyRoomCreates: 5,
      freeDailyRoomJoins: null,
    });
  });
  it("falls back to defaults", async () => {
    expect(await getAppSettings(fake([]))).toEqual({
      freeDailyCheckins: 1,
      premiumDailyCheckins: null,
      lunaEnabled: true,
      freeDailyRoomCreates: 2,
      freeDailyRoomJoins: 10,
    });
  });
  it("never limits admins", () => {
    const s = {
      freeDailyCheckins: 1,
      premiumDailyCheckins: 5,
      lunaEnabled: true,
      freeDailyRoomCreates: 2,
      freeDailyRoomJoins: 10,
    };
    expect(dailyCheckinLimit(s, "free", true)).toBeNull();
    expect(dailyCheckinLimit(s, "free", false)).toBe(1);
    expect(dailyCheckinLimit(s, "premium", false)).toBe(5);
  });
});
