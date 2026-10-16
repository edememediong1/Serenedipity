import { z } from "zod";

export const GOALS = [
  { value: "deep-work", label: "Deep work" },
  { value: "studying", label: "Studying" },
  { value: "procrastination", label: "Beating procrastination" },
  { value: "calm", label: "Calm and stress relief" },
  { value: "creative", label: "Creative work" },
] as const;

export const WORK_STYLES = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "varies", label: "It varies" },
] as const;

/** Focus length -> matching break length (minutes). */
export const FOCUS_LENGTHS = [
  { value: "25", label: "25 min", focus: 25, break: 5 },
  { value: "50", label: "50 min", focus: 50, break: 10 },
  { value: "90", label: "90 min", focus: 90, break: 20 },
] as const;

export const MUSIC_STYLES = [
  { value: "piano", label: "Piano" },
  { value: "jazz", label: "Jazz" },
  { value: "lofi", label: "Lofi" },
  { value: "afro-lounge", label: "Afro lounge" },
  { value: "ambient", label: "Ambient" },
  { value: "binaural", label: "Binaural" },
] as const;

type Values<T extends readonly { value: string }[]> = T[number]["value"];
const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((i) => i.value) as [Values<T>, ...Values<T>[]];

export const welcomeSchema = z.object({
  display_name: z
    .string()
    .trim()
    .max(40, "Keep it to 40 characters or fewer.")
    .nullish()
    .transform((v) => v || null),
  timezone: z.string().max(64).optional(),
});

export const ageSchema = z.object({
  answer: z.enum(["adult", "under18"], { error: "Choose one to continue." }),
});

export const goalsSchema = z.object({
  goals: z.array(z.enum(values(GOALS))).min(1, "Pick at least one, or skip for now."),
});

export const rhythmSchema = z.object({
  work_style: z.enum(values(WORK_STYLES), { error: "Choose when you usually work." }),
  focus_length: z.enum(values(FOCUS_LENGTHS), { error: "Choose a focus length." }),
});

export const soundSchema = z.object({
  music_prefs: z.array(z.enum(values(MUSIC_STYLES))).min(1, "Pick at least one, or skip for now."),
  has_headphones: z.enum(["yes", "no"], { error: "Let us know either way." }),
});

export const guideSchema = z.object({
  consent: z.literal(true, { error: "Please confirm to continue." }),
});

export const finishSchema = z.object({
  timezone: z.string().max(64).optional(),
});

/** Settings reuses the same rules in one form. */
export const preferencesSchema = z.object({
  display_name: welcomeSchema.shape.display_name,
  goals: z.array(z.enum(values(GOALS))),
  work_style: z.enum(values(WORK_STYLES)).nullable(),
  focus_length: z.enum(values(FOCUS_LENGTHS)),
  music_prefs: z.array(z.enum(values(MUSIC_STYLES))),
  has_headphones: z.enum(["yes", "no"]).nullable(),
});

export type WelcomeValues = z.input<typeof welcomeSchema>;
export type WelcomeOutput = z.output<typeof welcomeSchema>;
export type AgeValues = z.infer<typeof ageSchema>;
export type GoalsValues = z.infer<typeof goalsSchema>;
export type RhythmValues = z.infer<typeof rhythmSchema>;
export type SoundValues = z.infer<typeof soundSchema>;
export type GuideValues = z.infer<typeof guideSchema>;
export type PreferencesValues = z.input<typeof preferencesSchema>;

export function focusLengthFor(minutes: number | null | undefined) {
  return FOCUS_LENGTHS.find((f) => f.focus === minutes) ?? FOCUS_LENGTHS[0];
}

export function labelFor<T extends readonly { value: string; label: string }[]>(list: T, value: string) {
  return list.find((i) => i.value === value)?.label ?? value;
}
