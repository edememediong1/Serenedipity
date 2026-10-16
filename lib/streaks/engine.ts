/**
 * Streaks and the activity grid. Pure functions over per-day activity (in the person's time zone),
 * so the rules are easy to read and test (tests/unit/streaks.test.ts).
 *
 * The rules are deliberately gentle: a day counts if you finished a focus block or spent at least
 * ten minutes in a room session; each week (Monday to Sunday) forgives up to `restPerWeek` missed
 * days inside a streak, and today never breaks a streak until it's over.
 */

export type DayActivity = { blocks: number; minutes: number; roomSessions: number };
export type ActivityMap = ReadonlyMap<string, DayActivity>;

/** Minimum time in a room session for it to count as activity. */
export const ROOM_SESSION_MIN_SECONDS = 10 * 60;

export const EMPTY_DAY: DayActivity = { blocks: 0, minutes: 0, roomSessions: 0 };

export function isActiveDay(d: DayActivity | undefined) {
  return !!d && (d.blocks > 0 || d.roomSessions > 0);
}

/** Calendar arithmetic on "YYYY-MM-DD" keys (UTC-based, so no DST surprises). */
export function shiftDay(key: string, days: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekday(key: string) {
  // 0 = Monday ... 6 = Sunday
  return (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function weekStart(key: string) {
  return shiftDay(key, -weekday(key));
}

export type DayState = "active" | "rest" | "missed" | "today" | "future";

export type StreakSummary = {
  /** Active days in the current streak (rest days hold it together but don't add to it). */
  current: number;
  best: number;
  activeToday: boolean;
  restDaysLeftThisWeek: number;
  /** Monday to Sunday of the current week. */
  week: { date: string; state: DayState }[];
  /** True when the streak survives today only if you're active (no rest days left this week). */
  atRisk: boolean;
};

/**
 * Walks forward from `from` to `today`, keeping a running streak. A missed day (other than today)
 * uses one of the week's rest days if the streak is alive and any are left; otherwise it ends it.
 */
export function summarizeStreak(
  activity: ActivityMap,
  today: string,
  restPerWeek: number,
  from = shiftDay(today, -370),
): StreakSummary {
  let chain = 0;
  let best = 0;
  let restUsed = new Map<string, number>();
  const restDays = new Set<string>();
  let pendingRests: string[] = [];

  for (let day = from; day <= today; day = shiftDay(day, 1)) {
    if (isActiveDay(activity.get(day))) {
      chain++;
      best = Math.max(best, chain);
      for (const r of pendingRests) restDays.add(r);
      pendingRests = [];
      continue;
    }
    if (day === today || chain === 0) continue;
    const week = weekStart(day);
    const used = restUsed.get(week) ?? 0;
    if (used < restPerWeek) {
      restUsed.set(week, used + 1);
      pendingRests.push(day);
    } else {
      chain = 0;
      restUsed = new Map();
      pendingRests = [];
    }
  }
  // Rest days after the last active day still hold the current streak open.
  for (const r of pendingRests) restDays.add(r);

  const activeToday = isActiveDay(activity.get(today));
  const thisWeek = weekStart(today);
  const restDaysLeftThisWeek = Math.max(0, restPerWeek - (restUsed.get(thisWeek) ?? 0));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDay(thisWeek, i);
    let state: DayState;
    if (date > today) state = "future";
    else if (isActiveDay(activity.get(date))) state = "active";
    else if (date === today) state = "today";
    else state = restDays.has(date) ? "rest" : "missed";
    return { date, state };
  });

  return {
    current: chain,
    best,
    activeToday,
    restDaysLeftThisWeek,
    week,
    atRisk: chain > 0 && !activeToday && restDaysLeftThisWeek === 0,
  };
}

/** Grid intensity from 0 (nothing) to 4 (two hours or more). */
export function activityLevel(d: DayActivity | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!d || (!isActiveDay(d) && d.minutes === 0)) return 0;
  if (d.minutes >= 120) return 4;
  if (d.minutes >= 60) return 3;
  if (d.minutes >= 25) return 2;
  return 1;
}

/** Whole weeks (Monday-first columns) ending with the current week, oldest first. */
export function gridWeeks(today: string, weeks: number) {
  const start = shiftDay(weekStart(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => shiftDay(start, w * 7 + d)),
  );
}

/** Builds per-day activity from raw rows, bucketing by the person's local day. */
export function buildActivity(
  blocks: { started_at: string; focused_seconds: number; completed: boolean }[],
  attendance: { joined_at: string; last_seen_at: string }[],
  toDay: (iso: string) => string,
): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>();
  const get = (k: string) => {
    let d = map.get(k);
    if (!d) map.set(k, (d = { ...EMPTY_DAY }));
    return d;
  };
  for (const b of blocks) {
    const d = get(toDay(b.started_at));
    if (b.completed) d.blocks++;
    d.minutes += b.focused_seconds / 60;
  }
  for (const a of attendance) {
    const seconds = Math.max(0, (Date.parse(a.last_seen_at) - Date.parse(a.joined_at)) / 1000);
    const d = get(toDay(a.joined_at));
    d.minutes += seconds / 60;
    if (seconds >= ROOM_SESSION_MIN_SECONDS) d.roomSessions++;
  }
  for (const d of map.values()) d.minutes = Math.round(d.minutes);
  return map;
}

/** Sent to the client when an action made today the first active day (celebrate once per day). */
export type StreakEvent = { extended: true; current: number; best: number } | null;
