"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { localDateKey, zonedTimeToUtc } from "@/lib/time";

/*
 * Manual to-dos. These write with the signed-in user's own client: RLS ("Own tasks") already limits
 * every row to its owner. Manual tasks join today's active plan, so the focus timer picks them up.
 */

export type TodoResult = { ok: true } | { ok: false; message: string };

const Time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time like 14:30.")
  .nullable()
  .optional();

const AddInput = z.object({
  title: z.string().trim().min(1, "Give the task a name.").max(200),
  time: Time,
  estimateMinutes: z.coerce.number().int().min(5).max(240).default(25),
});

function dueAt(time: string | null | undefined, tz: string | null) {
  return time ? zonedTimeToUtc(localDateKey(Date.now(), tz), time, tz).toISOString() : null;
}

function refresh() {
  revalidatePath("/app");
  revalidatePath("/app/focus");
}

export async function addTodo(input: z.input<typeof AddInput>): Promise<TodoResult> {
  const parsed = AddInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the task." };
  const { user, profile, supabase } = await getSessionProfile();
  let { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan)
    ({ data: plan } = await supabase.from("plans").insert({ user_id: user.id }).select("id").single());
  if (!plan) return { ok: false, message: "Couldn't add that. Try again." };
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", plan.id);
  if ((count ?? 0) >= 50)
    return { ok: false, message: "That's a long list for one day. Finish or clear a few first." };
  const { error } = await supabase.from("tasks").insert({
    plan_id: plan.id,
    user_id: user.id,
    title: parsed.data.title,
    estimate_minutes: parsed.data.estimateMinutes,
    due_at: dueAt(parsed.data.time, profile.timezone),
    source: "manual",
    position: count ?? 0,
  });
  if (error) {
    console.error("[todos] add failed", error);
    return { ok: false, message: "Couldn't add that. Try again." };
  }
  refresh();
  return { ok: true };
}

const UpdateInput = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  time: Time,
  estimateMinutes: z.coerce.number().int().min(5).max(240).optional(),
});

/** Rename, retime (null clears the time) or re-estimate a task. */
export async function updateTodo(input: z.input<typeof UpdateInput>): Promise<TodoResult> {
  const parsed = UpdateInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the task." };
  const { profile, supabase } = await getSessionProfile();
  const patch: { title?: string; due_at?: string | null; estimate_minutes?: number } = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.time !== undefined) patch.due_at = dueAt(parsed.data.time, profile.timezone);
  if (parsed.data.estimateMinutes !== undefined) patch.estimate_minutes = parsed.data.estimateMinutes;
  const { data, error } = await supabase.from("tasks").update(patch).eq("id", parsed.data.id).select("id");
  if (error || !data?.length) return { ok: false, message: "Couldn't update that task." };
  refresh();
  return { ok: true };
}

export async function setTodoDone(id: string, done: boolean): Promise<TodoResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Unknown task." };
  const { supabase } = await getSessionProfile();
  const { data, error } = await supabase
    .from("tasks")
    .update(
      done
        ? { status: "done", completed_at: new Date().toISOString() }
        : { status: "todo", completed_at: null },
    )
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false, message: "Couldn't update that task." };
  refresh();
  return { ok: true };
}

/** Manual tasks are deleted; tasks from Luna's plan are set aside (kept for Review). */
export async function removeTodo(id: string): Promise<TodoResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Unknown task." };
  const { supabase } = await getSessionProfile();
  const { data: task } = await supabase.from("tasks").select("source").eq("id", id).maybeSingle();
  if (!task) return { ok: false, message: "Unknown task." };
  const { error } =
    task.source === "manual"
      ? await supabase.from("tasks").delete().eq("id", id)
      : await supabase.from("tasks").update({ status: "skipped" }).eq("id", id);
  if (error) return { ok: false, message: "Couldn't remove that task." };
  refresh();
  return { ok: true };
}
