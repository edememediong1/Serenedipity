/**
 * Review analytics: pure functions over a user's focus blocks and tasks, bucketed by day in the
 * user's own time zone. No network or database access here, so it's easy to test.
 */

export type BlockRow = {
  started_at: string;
  focused_seconds: number;
  completed: boolean;
  outcome: string | null;
  task_title: string | null;
  technique: string | null;
  planned_minutes: number;
};

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  estimate_minutes: number;
  created_at: string;
  completed_at: string | null;
};

/** "YYYY-MM-DD" for an instant in a time zone. */
export function dayKey(iso: string | Date, tz: string | null) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function hourIn(iso: string, tz: string | null) {
  try {
    return Number(
      new Intl.DateTimeFormat("en-US", { timeZone: tz || "UTC", hour: "numeric", hourCycle: "h23" }).format(
        new Date(iso),
      ),
    );
  } catch {
    return new Date(iso).getUTCHours();
  }
}

/** Adds days to a "YYYY-MM-DD" key (calendar arithmetic, no time zones involved). */
export function addDays(key: string, n: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type DaySummary = {
  date: string;
  focusMinutes: number;
  laps: number;
  planned: number;
  done: number;
  skipped: number;
  /** done / planned, 0-100; null when nothing was planned. */
  achievement: number | null;
};

export function summarizeDay(
  date: string,
  blocks: BlockRow[],
  tasks: TaskRow[],
  tz: string | null,
): DaySummary {
  const dayBlocks = blocks.filter((b) => dayKey(b.started_at, tz) === date);
  const dayTasks = tasks.filter((t) => dayKey(t.created_at, tz) === date);
  const done = dayTasks.filter((t) => t.status === "done").length;
  return {
    date,
    focusMinutes: Math.round(dayBlocks.reduce((s, b) => s + b.focused_seconds, 0) / 60),
    laps: dayBlocks.filter((b) => b.completed).length,
    planned: dayTasks.length,
    done,
    skipped: dayTasks.filter((t) => t.status === "skipped").length,
    achievement: dayTasks.length ? Math.round((done / dayTasks.length) * 100) : null,
  };
}

/** Consecutive days with at least one completed lap, counting back from `today` (today may be empty yet). */
export function streak(blocks: BlockRow[], today: string, tz: string | null) {
  const active = new Set(blocks.filter((b) => b.completed).map((b) => dayKey(b.started_at, tz)));
  let day = active.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (active.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export type WeekReview = {
  days: DaySummary[];
  focusMinutes: number;
  laps: number;
  planned: number;
  done: number;
  achievement: number | null;
  activeDays: number;
  bestDay: DaySummary | null;
  bestPeriod: "morning" | "afternoon" | "evening" | null;
  wentWell: string[];
  toImprove: string[];
};

const PERIOD_LABEL = { morning: "mornings", afternoon: "afternoons", evening: "evenings" } as const;

/** Seven days ending on `endDate`, plus plain-language insights (no outcome claims, just what happened). */
export function reviewWeek(
  endDate: string,
  blocks: BlockRow[],
  tasks: TaskRow[],
  tz: string | null,
): WeekReview {
  const keys = Array.from({ length: 7 }, (_, i) => addDays(endDate, i - 6));
  const days = keys.map((k) => summarizeDay(k, blocks, tasks, tz));
  const inWeek = blocks.filter((b) => keys.includes(dayKey(b.started_at, tz)));
  const focusMinutes = days.reduce((s, d) => s + d.focusMinutes, 0);
  const laps = days.reduce((s, d) => s + d.laps, 0);
  const planned = days.reduce((s, d) => s + d.planned, 0);
  const done = days.reduce((s, d) => s + d.done, 0);
  const activeDays = days.filter((d) => d.laps > 0).length;
  const bestDay = [...days].sort((a, b) => b.focusMinutes - a.focusMinutes)[0];

  const periods = { morning: 0, afternoon: 0, evening: 0 };
  for (const b of inWeek) {
    const h = hourIn(b.started_at, tz);
    const p = h >= 5 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : "evening";
    periods[p] += b.focused_seconds;
  }
  const topPeriod = (Object.entries(periods) as [keyof typeof periods, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const bestPeriod = topPeriod && topPeriod[1] > 0 ? topPeriod[0] : null;

  const skippedBlocks = inWeek.filter((b) => b.outcome === "skipped" || b.outcome === "reset").length;
  const stuckBlocks = inWeek.filter((b) => b.outcome === "stuck").length;
  const moreTime = inWeek.filter((b) => b.outcome === "more_time").length;
  const achievement = planned ? Math.round((done / planned) * 100) : null;

  const wentWell: string[] = [];
  const toImprove: string[] = [];
  if (activeDays >= 5) wentWell.push(`You showed up on ${activeDays} of 7 days.`);
  else if (activeDays >= 3) wentWell.push(`You focused on ${activeDays} days this week.`);
  if (achievement !== null && achievement >= 70)
    wentWell.push(`You finished ${achievement}% of what you planned.`);
  if (bestPeriod && laps >= 2)
    wentWell.push(`Your ${PERIOD_LABEL[bestPeriod]} were your strongest focus time.`);
  if (bestDay && bestDay.focusMinutes >= 30)
    wentWell.push(
      `${weekday(bestDay.date)} was your biggest day, with ${bestDay.focusMinutes} focused minutes.`,
    );
  if (laps >= 10) wentWell.push(`${laps} laps completed. That's real momentum.`);

  if (laps === 0) toImprove.push("Start small: one 25-minute lap is enough to get going.");
  else if (activeDays <= 2)
    toImprove.push("Try a short lap on more days; little and often is easier to keep up.");
  if (achievement !== null && achievement < 50 && planned >= 3)
    toImprove.push(
      `Only ${achievement}% of planned tasks got done. Plans with fewer, smaller tasks may fit better.`,
    );
  if (moreTime >= 2)
    toImprove.push(`${moreTime} blocks needed more time. Try giving tasks a little longer up front.`);
  if (stuckBlocks >= 2)
    toImprove.push(`You got stuck ${stuckBlocks} times. Ask Luna to split tough tasks before you start.`);
  if (skippedBlocks >= 3)
    toImprove.push(
      `${skippedBlocks} blocks were skipped or reset. A shorter technique might suit those days.`,
    );
  const gap = longestGap(days);
  if (laps > 0 && gap >= 3)
    toImprove.push(`There was a ${gap}-day gap without focus. A tiny lap keeps the thread.`);

  return {
    days,
    focusMinutes,
    laps,
    planned,
    done,
    achievement,
    activeDays,
    bestDay: bestDay && bestDay.focusMinutes > 0 ? bestDay : null,
    bestPeriod,
    wentWell: wentWell.slice(0, 4),
    toImprove: toImprove.slice(0, 4),
  };
}

function longestGap(days: DaySummary[]) {
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = d.laps === 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function weekday(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

export function shortDay(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

export function longDate(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
