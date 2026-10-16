import { z } from "zod";

export const magicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Add your email and we'll send a sign-in link.")
    .max(320, "That email is a little long.")
    .pipe(z.email("That email doesn't look quite right.")),
});

export type MagicLinkValues = z.infer<typeof magicLinkSchema>;

export const PLAN_INTENTS = ["free", "premium-monthly", "premium-yearly"] as const;
export type PlanIntent = (typeof PLAN_INTENTS)[number];

export type AuthFormState = { status: "idle" } | { status: "error"; message: string };
