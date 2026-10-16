"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/session";
import { focusLengthFor, preferencesSchema } from "@/lib/validation/onboarding";

export type SettingsResult = { ok: true; message: string } | { ok: false; message: string };

/** Saves the name and onboarding answers from Settings. */
export async function updatePreferences(input: unknown): Promise<SettingsResult> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };

  const { user, supabase } = await getSessionProfile();
  const length = focusLengthFor(Number(parsed.data.focus_length));
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      goals: parsed.data.goals,
      work_style: parsed.data.work_style,
      default_focus_minutes: length.focus,
      default_break_minutes: length.break,
      music_prefs: parsed.data.music_prefs,
      has_headphones: parsed.data.has_headphones === null ? null : parsed.data.has_headphones === "yes",
    })
    .eq("id", user.id);

  if (error) {
    console.error("[settings] update failed", error);
    return { ok: false, message: "We couldn't save that just now. Please try again." };
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Saved. Your space is up to date." };
}
