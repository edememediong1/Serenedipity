"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { askLunaWhenStuck, LunaUnavailableError } from "@/lib/luna/client";
import { screenMessage } from "@/lib/luna/safety";
import type { StuckTurn } from "@/lib/luna/schema";

const StartSchema = z.object({
  taskId: z.uuid().nullable(),
  taskTitle: z.string().trim().max(200).nullable(),
  plannedMinutes: z.number().int().min(1).max(240),
});

/** Records the start of a focus block. Returns its id so the timer can finish it later. */
export async function startFocusBlock(
  input: z.input<typeof StartSchema>,
): Promise<{ id: string } | { error: string }> {
  const parsed = StartSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid block." };
  const { user, supabase } = await getSessionProfile();
  const { data, error } = await supabase
    .from("focus_blocks")
    .insert({
      user_id: user.id,
      task_id: parsed.data.taskId,
      task_title: parsed.data.taskTitle || null,
      planned_minutes: parsed.data.plannedMinutes,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[focus] start failed", error);
    return { error: "Couldn't save this block, but your timer is still running." };
  }
  return { id: data.id };
}

const FinishSchema = z.object({
  id: z.uuid(),
  focusedSeconds: z.number().int().min(0).max(14400),
  outcome: z.enum(["done", "more_time", "stuck", "skipped", "reset"]),
  completed: z.boolean(),
});

/** Closes a focus block; "done" also ticks off its task, and the plan when every task is done. */
export async function finishFocusBlock(input: z.input<typeof FinishSchema>) {
  const parsed = FinishSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid block." };
  const { supabase } = await getSessionProfile();
  const { data: block, error } = await supabase
    .from("focus_blocks")
    .update({
      ended_at: new Date().toISOString(),
      focused_seconds: parsed.data.focusedSeconds,
      outcome: parsed.data.outcome,
      completed: parsed.data.completed,
    })
    .eq("id", parsed.data.id)
    .select("task_id")
    .single();
  if (error) {
    console.error("[focus] finish failed", error);
    return { error: "Couldn't save this block." };
  }

  if (block?.task_id && parsed.data.outcome === "done") {
    const { data: task } = await supabase
      .from("tasks")
      .update({ status: "done" })
      .eq("id", block.task_id)
      .select("plan_id")
      .single();
    if (task) {
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("plan_id", task.plan_id)
        .eq("status", "todo");
      if ((count ?? 0) === 0)
        await supabase.from("plans").update({ status: "completed" }).eq("id", task.plan_id);
    }
  }
  revalidatePath("/app");
  return { ok: true as const };
}

export type StuckResult = { ok: true; turn: StuckTurn } | { ok: false; support: boolean; message: string };

/** "I'm stuck": Luna suggests a smaller next step. */
export async function getUnstuck(taskTitle: string, note: string): Promise<StuckResult> {
  await getSessionProfile();
  const title = taskTitle.trim().slice(0, 200) || "this task";
  const what = note.trim().slice(0, 500);
  if (screenMessage(what)) return { ok: false, support: true, message: "" };
  try {
    return { ok: true, turn: await askLunaWhenStuck(title, what) };
  } catch (error) {
    if (!(error instanceof LunaUnavailableError)) console.error("[focus] stuck failed", error);
    return {
      ok: false,
      support: false,
      message: "Try making it smaller: spend five minutes on the roughest possible first draft.",
    };
  }
}

/** Marks a plan task skipped (from the between-blocks check). */
export async function skipTask(taskId: string) {
  if (!z.uuid().safeParse(taskId).success) return;
  const { supabase } = await getSessionProfile();
  await supabase.from("tasks").update({ status: "skipped" }).eq("id", taskId);
}
