import { z } from "zod";

const utm = z
  .string()
  .trim()
  .max(128)
  .optional()
  .transform((v) => (v ? v : undefined));

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

/** Client-side fields (what the visitor types). */
export const waitlistFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Add your email so we can let you know.")
    .max(320, "That email is a little long.")
    .pipe(z.email("That email doesn't look quite right.")),
});

/** Full server payload, including hidden fields. */
export const waitlistServerSchema = waitlistFormSchema.extend({
  /** Honeypot. Real people never see or fill this. */
  company: z.string().max(200).optional().default(""),
  source: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => v || "landing"),
  utm_source: utm,
  utm_medium: utm,
  utm_campaign: utm,
  utm_term: utm,
  utm_content: utm,
});

export type WaitlistFormValues = z.infer<typeof waitlistFormSchema>;

export type WaitlistState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<"email", string>> };
