import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type AppSettings = {
  /** Check-ins per day on the free plan; null = unlimited. */
  freeDailyCheckins: number | null;
  /** Check-ins per day on Pro; null = unlimited. */
  premiumDailyCheckins: number | null;
  lunaEnabled: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  freeDailyCheckins: 1,
  premiumDailyCheckins: null,
  lunaEnabled: true,
};

const asLimit = (v: unknown, fallback: number | null) =>
  v === null || v === "unlimited"
    ? null
    : typeof v === "number" && Number.isFinite(v) && v >= 0
      ? Math.floor(v)
      : fallback;

export async function getAppSettings(supabase: SupabaseClient<Database>): Promise<AppSettings> {
  const { data } = await supabase.from("app_settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key, r.value as unknown]));
  return {
    freeDailyCheckins: map.has("free_daily_checkins")
      ? asLimit(map.get("free_daily_checkins"), DEFAULT_SETTINGS.freeDailyCheckins)
      : DEFAULT_SETTINGS.freeDailyCheckins,
    premiumDailyCheckins: map.has("premium_daily_checkins")
      ? asLimit(map.get("premium_daily_checkins"), DEFAULT_SETTINGS.premiumDailyCheckins)
      : DEFAULT_SETTINGS.premiumDailyCheckins,
    lunaEnabled: map.has("luna_enabled") ? map.get("luna_enabled") !== false : true,
  };
}

/** The daily check-in allowance for a user; null = unlimited. Admins are never limited. */
export function dailyCheckinLimit(settings: AppSettings, plan: string, admin: boolean): number | null {
  if (admin) return null;
  return plan === "premium" ? settings.premiumDailyCheckins : settings.freeDailyCheckins;
}
