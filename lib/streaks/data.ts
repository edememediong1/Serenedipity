import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionProfile } from "@/lib/auth/session";
import { dayKey } from "@/lib/review/stats";
import type { Database } from "@/lib/supabase/database.types";
import { buildActivity, shiftDay, summarizeStreak, type DayActivity, type StreakEvent } from "./engine";

export type { StreakEvent };

const RANGE_DAYS = 371; // a year of history for "best", plus the 26-week grid

/** Per-day activity for one person over the last year, in their time zone. */
export async function loadActivity(supabase: SupabaseClient<Database>, userId: string, tz: string | null) {
  const today = dayKey(new Date(), tz);
  const since = new Date(`${shiftDay(today, -RANGE_DAYS)}T00:00:00Z`).toISOString();
  const [{ data: blocks }, { data: attendance }] = await Promise.all([
    supabase
      .from("focus_blocks")
      .select("started_at, focused_seconds, completed")
      .eq("user_id", userId)
      .gte("started_at", since),
    supabase
      .from("room_attendance")
      .select("joined_at, last_seen_at")
      .eq("user_id", userId)
      .gte("joined_at", since),
  ]);
  const activity = buildActivity(blocks ?? [], attendance ?? [], (iso) => dayKey(iso, tz));
  return { today, activity };
}

export type StreakData = ReturnType<typeof summarizeStreak> & {
  today: string;
  restPerWeek: number;
  /** Serializable per-day activity for the grid. */
  days: Record<string, DayActivity>;
};

/** The signed-in person's streak and activity, ready for the UI. */
export async function getStreak(): Promise<StreakData> {
  const { user, profile, supabase } = await getSessionProfile();
  const { today, activity } = await loadActivity(supabase, user.id, profile.timezone);
  const restPerWeek = profile.streak_rest_days;
  return {
    ...summarizeStreak(activity, today, restPerWeek),
    today,
    restPerWeek,
    days: Object.fromEntries(activity),
  };
}

/**
 * Call right after recording activity. Returns an event when that activity was the first to count
 * today (so the app can celebrate once per day), otherwise null.
 */
export async function streakEventAfterActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  tz: string | null,
  restPerWeek: number,
): Promise<StreakEvent> {
  const { today, activity } = await loadActivity(supabase, userId, tz);
  const todayActivity = activity.get(today);
  if (!todayActivity) return null;
  const counted = todayActivity.blocks + todayActivity.roomSessions;
  if (counted !== 1) return null;
  const s = summarizeStreak(activity, today, restPerWeek);
  return { extended: true, current: s.current, best: s.best };
}
