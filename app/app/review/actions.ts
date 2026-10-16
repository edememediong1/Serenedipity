"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { askLunaForReflection, LunaUnavailableError } from "@/lib/luna/client";
import type { Reflection } from "@/lib/luna/schema";
import { loadReviewRange } from "@/lib/review/data";
import { addDays, reviewWeek, streak } from "@/lib/review/stats";

/** Answers "Did you finish this?": done, carry it into today's plan, or let it go. */
export async function resolveTask(taskId: string, action: "done" | "carry" | "drop") {
  if (!z.uuid().safeParse(taskId).success) return { ok: false };
  const { user, supabase } = await getSessionProfile();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, estimate_minutes, music_category")
    .eq("id", taskId)
    .single();
  if (!task) return { ok: false };

  if (action === "done") {
    await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", taskId);
  } else if (action === "drop") {
    await supabase.from("tasks").update({ status: "skipped" }).eq("id", taskId);
  } else {
    // Carry over: add a copy to today's active plan (creating one if needed) and close the old one.
    let { data: plan } = await supabase
      .from("plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!plan) {
      ({ data: plan } = await supabase.from("plans").insert({ user_id: user.id }).select("id").single());
    }
    if (!plan) return { ok: false };
    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", plan.id);
    await supabase.from("tasks").insert({
      plan_id: plan.id,
      user_id: user.id,
      title: task.title,
      estimate_minutes: task.estimate_minutes,
      music_category: task.music_category,
      position: count ?? 0,
    });
    await supabase.from("tasks").update({ status: "skipped" }).eq("id", taskId);
  }
  revalidatePath("/app");
  revalidatePath("/app/review");
  return { ok: true };
}

export type ReflectionResult =
  { ok: true; reflection: Reflection } | { ok: false; code: "upgrade" | "error"; message: string };

/** Luna's reflection for the week ending `endDate`. Pro (and admins). Cached per week. */
export async function getWeeklyReflection(endDate: string, refresh = false): Promise<ReflectionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return { ok: false, code: "error", message: "Invalid week." };
  const { user, profile, supabase } = await getSessionProfile();
  if (profile.plan !== "premium" && !isAdmin(profile, user.email)) {
    return { ok: false, code: "upgrade", message: "Weekly reflections from Luna are part of Pro." };
  }
  const periodStart = addDays(endDate, -6);
  if (!refresh) {
    const { data } = await supabase
      .from("reflections")
      .select("content")
      .eq("user_id", user.id)
      .eq("period", "week")
      .eq("period_start", periodStart)
      .maybeSingle();
    if (data) return { ok: true, reflection: data.content as Reflection };
  }
  try {
    const range = await loadReviewRange(endDate);
    const week = reviewWeek(endDate, range.blocks, range.tasks, range.tz);
    const stats = {
      days: week.days.map((d) => ({
        date: d.date,
        focus_minutes: d.focusMinutes,
        laps: d.laps,
        tasks_planned: d.planned,
        tasks_done: d.done,
      })),
      totals: {
        focus_minutes: week.focusMinutes,
        laps: week.laps,
        achievement_percent: week.achievement,
        active_days: week.activeDays,
      },
      strongest_time_of_day: week.bestPeriod,
      streak_days: streak(range.blocks, endDate, range.tz),
      block_outcomes: range.blocks.reduce<Record<string, number>>((acc, b) => {
        if (b.outcome) acc[b.outcome] = (acc[b.outcome] ?? 0) + 1;
        return acc;
      }, {}),
      techniques: [...new Set(range.blocks.map((b) => b.technique).filter(Boolean))],
    };
    const reflection = await askLunaForReflection(JSON.stringify(stats));
    await supabase
      .from("reflections")
      .upsert(
        { user_id: user.id, period: "week", period_start: periodStart, content: reflection },
        { onConflict: "user_id,period,period_start" },
      );
    return { ok: true, reflection };
  } catch (error) {
    if (!(error instanceof LunaUnavailableError)) console.error("[review] reflection failed", error);
    return {
      ok: false,
      code: "error",
      message: "Luna couldn't write your reflection just now. Please try again.",
    };
  }
}
