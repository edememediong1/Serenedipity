/**
 * Crisis handling (PRD section 5). Two layers:
 *  1. This deterministic keyword screen runs on every message before the model is called.
 *     If it matches, Luna never sees the message: the app steps straight into the support flow.
 *  2. Luna's model response also carries a safety assessment (see schema.ts) for anything subtler.
 * Either layer alone is enough to show support resources and stop planning.
 */

export type SafetyCategory = "self_harm" | "harm_to_others" | "severe_distress" | "other";

const PATTERNS: { category: SafetyCategory; re: RegExp }[] = [
  {
    category: "self_harm",
    re: /\b(kill(ing)? myself|end(ing)? (my|it all|my life)|suicid(e|al)|want to die|wanna die|don'?t want to (be alive|live|wake up)|better off (dead|without me)|self[- ]?harm|hurt(ing)? myself|cut(ting)? myself|overdose|no reason to live|take my (own )?life)\b/i,
  },
  {
    category: "harm_to_others",
    re: /\b(kill (him|her|them|someone|people)|hurt (him|her|them|someone|people)|shoot (up|someone|people))\b/i,
  },
];

export function screenMessage(text: string): SafetyCategory | null {
  for (const p of PATTERNS) if (p.re.test(text)) return p.category;
  return null;
}

export type SupportResource = { name: string; detail: string; href: string; action: string };

/** US resources first (primary market). Local equivalents can be added per country later. */
export const SUPPORT_RESOURCES: SupportResource[] = [
  {
    name: "988 Suicide & Crisis Lifeline",
    detail: "Free, confidential, 24/7 in the US. Call or text 988.",
    href: "tel:988",
    action: "Call 988",
  },
  {
    name: "Text 988",
    detail: "Prefer typing? Text 988 to reach the same free, confidential line, any time.",
    href: "sms:988",
    action: "Text 988",
  },
  {
    name: "Emergency services",
    detail: "If you or someone else is in immediate danger, call 911 (or your local emergency number).",
    href: "tel:911",
    action: "Call 911",
  },
  {
    name: "Outside the US",
    detail: "Find a free helpline in your country.",
    href: "https://findahelpline.com",
    action: "Find a helpline",
  },
];

export const SUPPORT_MESSAGE =
  "It sounds like you're carrying something really heavy right now, and I'm glad you said it. This is bigger than a focus plan, and you deserve support from a real person. Please reach out to someone you trust, or to one of the free, confidential lines below. They're there right now.";
