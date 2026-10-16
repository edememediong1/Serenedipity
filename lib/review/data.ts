import "server-only";
import { getSessionProfile } from "@/lib/auth/session";
import { addDays, dayKey, type BlockRow, type TaskRow } from "./stats";

/** Blocks and tasks for the 7 days ending `endDate` (user's time zone), plus one day of padding each side. */
export async function loadReviewRange(endDate: string, days = 7) {
  const { user, profile, supabase } = await getSessionProfile();
  const tz = profile.timezone;
  const from = new Date(`${addDays(endDate, -(days + 1))}T00:00:00Z`).toISOString();
  const to = new Date(`${addDays(endDate, 2)}T00:00:00Z`).toISOString();

  const [{ data: blocks }, { data: tasks }, { data: checkins }] = await Promise.all([
    supabase
      .from("focus_blocks")
      .select("started_at, focused_seconds, completed, outcome, task_title, technique, planned_minutes")
      .eq("user_id", user.id)
      .gte("started_at", from)
      .lt("started_at", to)
      .order("started_at"),
    supabase
      .from("tasks")
      .select("id, title, status, estimate_minutes, created_at, completed_at")
      .eq("user_id", user.id)
      .gte("created_at", from)
      .lt("created_at", to)
      .order("position"),
    supabase
      .from("checkins")
      .select("created_at, mood_summary")
      .eq("user_id", user.id)
      .gte("created_at", from)
      .lt("created_at", to)
      .order("created_at"),
  ]);

  return {
    tz,
    plan: profile.plan,
    blocks: (blocks ?? []) as BlockRow[],
    tasks: (tasks ?? []) as TaskRow[],
    moods: (checkins ?? [])
      .filter((c) => c.mood_summary)
      .map((c) => ({ date: dayKey(c.created_at, tz), mood: c.mood_summary as string })),
  };
}

/** Unfinished tasks from before today (last 7 days), for "Did you finish this?" nudges. */
export async function loadUnfinished(limit = 3) {
  const { user, profile, supabase } = await getSessionProfile();
  const today = dayKey(new Date(), profile.timezone);
  const since = new Date(`${addDays(today, -7)}T00:00:00Z`).toISOString();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, created_at")
    .eq("user_id", user.id)
    .eq("status", "todo")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []).filter((t) => dayKey(t.created_at, profile.timezone) < today).slice(0, limit);
}
