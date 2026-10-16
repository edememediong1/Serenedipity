"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { startOfToday } from "@/lib/focus/today";
import { askLuna, LunaUnavailableError } from "@/lib/luna/client";
import { contextBlock } from "@/lib/luna/prompt";
import { screenMessage, SUPPORT_MESSAGE, type SafetyCategory } from "@/lib/luna/safety";
import { PlanInputSchema, type LunaTurn, type PlanInput } from "@/lib/luna/schema";

const MAX_MESSAGE = 2000;
const MAX_TURNS = 10;

const SendSchema = z.object({
  checkinId: z.uuid().nullable(),
  message: z
    .string()
    .trim()
    .min(1, "Say or type a few words first.")
    .max(MAX_MESSAGE, "That's a lot. Try a shorter version."),
  mode: z.enum(["text", "voice"]),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(MAX_TURNS * 2),
});

export type SendResult =
  | { ok: true; checkinId: string; turn: LunaTurn }
  | { ok: false; code: "invalid" | "limit" | "unavailable" | "consent" | "error"; message: string };

function supportTurn(): LunaTurn {
  return {
    safety: "crisis",
    safety_category: "self_harm",
    kind: "support",
    reply: SUPPORT_MESSAGE,
    mood_summary: "",
    questions: [],
    deadline_iso: null,
    deadline_label: null,
    tasks: [],
    suggest_reset: false,
  };
}

/** One turn of a check-in with Luna. Creates the check-in on the first turn. */
export async function sendCheckIn(input: z.input<typeof SendSchema>): Promise<SendResult> {
  const parsed = SendSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Try again." };
  const { message, mode, history } = parsed.data;
  let checkinId = parsed.data.checkinId;

  const { user, profile, supabase } = await getSessionProfile();
  if (!profile.ai_guide_consent) {
    return {
      ok: false,
      code: "consent",
      message: "Please confirm what Luna is (and isn't) before your first check-in.",
    };
  }

  // Free plan: one check-in a day (PRD section 7). Follow-up turns in the same check-in don't count.
  if (!checkinId && profile.plan !== "premium") {
    const { count } = await supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfToday(profile.timezone));
    if ((count ?? 0) >= 1) {
      return {
        ok: false,
        code: "limit",
        message:
          "You've used today's free check-in. Your plan from earlier is still in Focus, and a new check-in opens tomorrow.",
      };
    }
  }

  const ensureCheckin = async () => {
    if (checkinId) {
      const { data } = await supabase.from("checkins").select("transcript").eq("id", checkinId).single();
      await supabase
        .from("checkins")
        .update({ transcript: `${data?.transcript ?? ""}\n${message}`.trim().slice(0, 20000) })
        .eq("id", checkinId);
      return checkinId;
    }
    const { data, error } = await supabase
      .from("checkins")
      .insert({ user_id: user.id, transcript: message, input_mode: mode })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Could not create check-in");
    return data.id;
  };

  const logSafety = async (id: string, category: SafetyCategory, source: "keyword" | "model") => {
    await supabase.from("checkins").update({ safety_flag: true }).eq("id", id);
    await supabase.from("safety_events").insert({ user_id: user.id, checkin_id: id, category, source });
  };

  try {
    checkinId = await ensureCheckin();

    // Layer 1: deterministic screen. A match never reaches the model and never gets a plan.
    const flagged = screenMessage(message);
    if (flagged) {
      await logSafety(checkinId, flagged, "keyword");
      return { ok: true, checkinId, turn: { ...supportTurn(), safety_category: flagged } };
    }

    const context = contextBlock({
      now: new Date(),
      timezone: profile.timezone,
      name: profile.display_name,
      focusMinutes: profile.default_focus_minutes,
      breakMinutes: profile.default_break_minutes,
    });
    const turn = await askLuna([...history, { role: "user", content: message }], context);

    // Layer 2: the model's own assessment.
    if (turn.safety === "crisis" || turn.kind === "support") {
      const category = turn.safety_category === "none" ? "other" : turn.safety_category;
      await logSafety(checkinId, category, "model");
      return { ok: true, checkinId, turn: { ...turn, kind: "support", tasks: [], questions: [] } };
    }
    if (turn.mood_summary)
      await supabase.from("checkins").update({ mood_summary: turn.mood_summary }).eq("id", checkinId);
    return { ok: true, checkinId, turn };
  } catch (error) {
    if (error instanceof LunaUnavailableError) {
      return { ok: false, code: "unavailable", message: "Luna isn't set up yet. Check back soon." };
    }
    console.error("[luna] check-in failed", error);
    return {
      ok: false,
      code: "error",
      message: "Luna couldn't answer just now. Check your connection and try again.",
    };
  }
}

/** Saves the (possibly edited) plan and opens the first focus block. */
export async function startPlan(
  input: PlanInput,
  withReset = false,
): Promise<{ ok: false; message: string } | undefined> {
  const parsed = PlanInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the plan." };
  const { user, supabase } = await getSessionProfile();

  const { data: checkin } = await supabase
    .from("checkins")
    .select("id")
    .eq("id", parsed.data.checkinId)
    .maybeSingle();
  if (!checkin) return { ok: false, message: "We couldn't find that check-in." };

  // One active plan at a time: earlier ones step aside.
  await supabase.from("plans").update({ status: "abandoned" }).eq("user_id", user.id).eq("status", "active");

  const deadline =
    parsed.data.deadline && !Number.isNaN(Date.parse(parsed.data.deadline)) ? parsed.data.deadline : null;
  const { data: plan, error } = await supabase
    .from("plans")
    .insert({ user_id: user.id, checkin_id: checkin.id, deadline })
    .select("id")
    .single();
  if (error || !plan) {
    console.error("[luna] plan save failed", error);
    return { ok: false, message: "We couldn't save your plan. Please try again." };
  }
  const { error: tasksError } = await supabase
    .from("tasks")
    .insert(parsed.data.tasks.map((t, i) => ({ ...t, plan_id: plan.id, user_id: user.id, position: i })));
  if (tasksError) {
    console.error("[luna] tasks save failed", tasksError);
    return { ok: false, message: "We couldn't save your tasks. Please try again." };
  }
  redirect(`/app/focus?plan=${plan.id}${withReset ? "&reset=1" : ""}`);
}
