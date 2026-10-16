"use server";

import { redirect } from "next/navigation";
import type { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import {
  NOT_AVAILABLE_PATH,
  ONBOARDING_STEPS,
  stepIndex,
  stepPath,
  type OnboardingStep,
} from "@/lib/onboarding/steps";
import type { Database } from "@/lib/supabase/database.types";
import {
  ageSchema,
  finishSchema,
  focusLengthFor,
  goalsSchema,
  guideSchema,
  rhythmSchema,
  soundSchema,
  welcomeSchema,
} from "@/lib/validation/onboarding";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type StepResult = { ok: false; message: string } | undefined;

const SKIPPABLE: readonly OnboardingStep[] = ["goals", "rhythm", "sound"];

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Something needs another look.";
}

function validTimezone(tz: string | undefined) {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

/**
 * Saves one onboarding step and moves to the next. Saving happens immediately so a user who
 * leaves can resume where they stopped. `skip` is only honoured for optional steps.
 */
export async function saveOnboardingStep(
  step: OnboardingStep,
  input: unknown,
  skip = false,
): Promise<StepResult> {
  const { user, profile, supabase } = await getSessionProfile();
  const index = stepIndex(step);
  if (index === -1 || step === "done") return { ok: false, message: "Unknown step." };
  if (profile.onboarding_completed_at) redirect("/app");

  // The age gate must be passed before later steps can be saved.
  if (index > 1 && !profile.age_confirmed) redirect(stepPath(1));

  let update: ProfileUpdate = {};

  if (skip) {
    if (!SKIPPABLE.includes(step)) return { ok: false, message: "This step can't be skipped." };
  } else {
    switch (step) {
      case "welcome": {
        const r = welcomeSchema.safeParse(input);
        if (!r.success) return { ok: false, message: firstIssue(r.error) };
        update = {
          display_name: r.data.display_name,
          timezone: validTimezone(r.data.timezone) ?? profile.timezone,
        };
        break;
      }
      case "age": {
        const r = ageSchema.safeParse(input);
        if (!r.success) return { ok: false, message: firstIssue(r.error) };
        const now = new Date().toISOString();
        if (r.data.answer === "under18") {
          const { error } = await supabase
            .from("profiles")
            .update({ age_confirmed: false, age_confirmed_at: now })
            .eq("id", user.id);
          if (error) {
            console.error("[onboarding] age gate save failed", error);
            return {
              ok: false,
              message: "We couldn't save that just now. Check your connection and try again.",
            };
          }
          redirect(NOT_AVAILABLE_PATH);
        }
        update = { age_confirmed: true, age_confirmed_at: now };
        break;
      }
      case "goals": {
        const r = goalsSchema.safeParse(input);
        if (!r.success) return { ok: false, message: firstIssue(r.error) };
        update = { goals: r.data.goals };
        break;
      }
      case "rhythm": {
        const r = rhythmSchema.safeParse(input);
        if (!r.success) return { ok: false, message: firstIssue(r.error) };
        const length = focusLengthFor(Number(r.data.focus_length));
        update = {
          work_style: r.data.work_style,
          default_focus_minutes: length.focus,
          default_break_minutes: length.break,
        };
        break;
      }
      case "sound": {
        const r = soundSchema.safeParse(input);
        if (!r.success) return { ok: false, message: firstIssue(r.error) };
        update = { music_prefs: r.data.music_prefs, has_headphones: r.data.has_headphones === "yes" };
        break;
      }
      case "guide": {
        const r = guideSchema.safeParse(input);
        if (!r.success) return { ok: false, message: firstIssue(r.error) };
        update = { ai_guide_consent: true, ai_guide_consent_at: new Date().toISOString() };
        break;
      }
    }
  }

  const nextIndex = Math.min(index + 1, ONBOARDING_STEPS.length - 1);
  update.onboarding_step = Math.max(profile.onboarding_step, nextIndex);

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) {
    console.error("[onboarding] save failed", error);
    return { ok: false, message: "We couldn't save that just now. Check your connection and try again." };
  }

  redirect(stepPath(nextIndex));
}

/** Final step: marks onboarding complete and opens the app. */
export async function finishOnboarding(input: unknown): Promise<StepResult> {
  const { user, profile, supabase } = await getSessionProfile();
  if (profile.onboarding_completed_at) redirect("/app");
  if (!profile.age_confirmed || !profile.ai_guide_consent) {
    redirect(stepPath(!profile.age_confirmed ? 1 : 5));
  }
  const r = finishSchema.safeParse(input);
  const timezone = validTimezone(r.success ? r.data.timezone : undefined) ?? profile.timezone;

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString(), onboarding_step: 6, timezone })
    .eq("id", user.id);
  if (error) {
    console.error("[onboarding] finish failed", error);
    return { ok: false, message: "We couldn't open your space just now. Please try again." };
  }
  redirect("/app");
}
