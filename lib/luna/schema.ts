import { z } from "zod";

export const MUSIC_CATEGORIES = [
  "deep-focus",
  "calm-mind",
  "clear-the-fog",
  "creative-flow",
  "wind-down",
] as const;

/**
 * The structured reply Luna returns on every turn (Claude structured outputs).
 * Keep constraints here API-friendly (no min/max); limits are enforced in sanitizeTurn().
 */
export const LunaTurnSchema = z.object({
  safety: z.enum(["ok", "concern", "crisis"]),
  safety_category: z.enum(["none", "self_harm", "harm_to_others", "severe_distress", "other"]),
  kind: z.enum(["clarify", "plan", "support", "chat"]),
  reply: z.string(),
  mood_summary: z.string(),
  questions: z.array(z.string()),
  deadline_iso: z.string().nullable(),
  deadline_label: z.string().nullable(),
  tasks: z.array(
    z.object({
      title: z.string(),
      estimate_minutes: z.number(),
      music_category: z.enum(MUSIC_CATEGORIES),
    }),
  ),
  suggest_reset: z.boolean(),
});

export type LunaTurn = z.infer<typeof LunaTurnSchema>;
export type LunaTask = LunaTurn["tasks"][number];

export type LunaMessage = { role: "user" | "assistant"; content: string };

/** Clamp model output to what the UI and database accept. */
export function sanitizeTurn(turn: LunaTurn): LunaTurn {
  const tasks = turn.tasks.slice(0, 12).map((t) => ({
    title: t.title.trim().slice(0, 200) || "Next step",
    estimate_minutes: Math.min(240, Math.max(5, Math.round(t.estimate_minutes / 5) * 5 || 25)),
    music_category: t.music_category,
  }));
  let deadline = turn.deadline_iso;
  if (deadline && Number.isNaN(Date.parse(deadline))) deadline = null;
  return {
    ...turn,
    reply: turn.reply.trim().slice(0, 1200),
    mood_summary: turn.mood_summary.trim().slice(0, 200),
    questions:
      turn.kind === "clarify"
        ? turn.questions
            .map((q) => q.trim())
            .filter(Boolean)
            .slice(0, 3)
        : [],
    tasks: turn.kind === "plan" ? tasks : [],
    deadline_iso: deadline,
    deadline_label: turn.deadline_label?.trim().slice(0, 40) || null,
  };
}

/** Client-editable plan sent back when the user starts their first block. */
export const PlanInputSchema = z.object({
  checkinId: z.uuid(),
  deadline: z.string().nullable(),
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(1, "Give each task a short name.").max(200),
        estimate_minutes: z.number().int().min(5).max(240),
        music_category: z.enum(MUSIC_CATEGORIES).nullable(),
      }),
    )
    .min(1, "Keep at least one task.")
    .max(12),
});
export type PlanInput = z.infer<typeof PlanInputSchema>;

export const StuckSchema = z.object({
  reply: z.string(),
  next_step: z.string(),
  estimate_minutes: z.number(),
});
export type StuckTurn = z.infer<typeof StuckSchema>;
