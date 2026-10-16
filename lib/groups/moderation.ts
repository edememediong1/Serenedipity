import { screenMessage } from "@/lib/luna/safety";

/**
 * Automatic content screen for posts and comments. Conservative: anything it catches is held
 * for a moderator rather than silently deleted, and self-harm language shows the author support
 * resources. This is a first line of defence, not a replacement for human review.
 */

export type ScreenResult =
  | { action: "allow" }
  | { action: "hold"; reason: "abuse" | "spam" | "harm_to_others" }
  | { action: "support"; reason: "self_harm" };

// Direct abuse aimed at another person. Extend with care: false positives hold real posts.
const ABUSE =
  /\b(kys|kill your ?self|go die|you(?:'re| are) (?:worthless|pathetic|a waste)|nobody (?:likes|wants) you)\b/i;
const URL = /https?:\/\/\S+/gi;

export function screenContent(text: string, linkUrl?: string | null): ScreenResult {
  const safety = screenMessage(text);
  if (safety === "self_harm") return { action: "support", reason: "self_harm" };
  if (safety === "harm_to_others") return { action: "hold", reason: "harm_to_others" };
  if (ABUSE.test(text)) return { action: "hold", reason: "abuse" };
  const links = (text.match(URL) ?? []).length + (linkUrl ? 1 : 0);
  // Link dumps and long runs of the same character are classic spam.
  if (links >= 4 || /(.)\1{14,}/.test(text)) return { action: "hold", reason: "spam" };
  return { action: "allow" };
}

export function containsLink(text: string, linkUrl?: string | null) {
  return !!linkUrl || /https?:\/\/|www\./i.test(text);
}

export const HELD_LABELS: Record<string, string> = {
  abuse: "Possible abuse",
  spam: "Looks like spam",
  harm_to_others: "Mentions harming others",
  self_harm: "Mentions self-harm",
};
