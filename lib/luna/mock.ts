import type { LunaMessage, LunaTurn, Reflection, StuckTurn } from "./schema";

/**
 * Deterministic stand-in for Claude, used only when LUNA_MOCK=true (local dev and e2e tests).
 * Turn 1 asks clarifying questions unless a deadline is mentioned; the next turn returns a plan.
 */
export function mockLunaTurn(history: LunaMessage[]): LunaTurn {
  const userTurns = history.filter((m) => m.role === "user");
  const all = userTurns.map((m) => m.content.toLowerCase()).join(" ");
  const mentionsDeadline = /\b(by|due|before|tonight|tomorrow|today)\b/.test(all);
  const base = {
    safety: "ok" as const,
    safety_category: "none" as const,
    mood_summary: /fog|tired|stress|overwhelm/.test(all) ? "foggy, stressed" : "ready",
    deadline_iso: null,
    deadline_label: null,
    suggest_reset: /fog|stress|overwhelm/.test(all),
  };

  if (userTurns.length === 1 && !mentionsDeadline) {
    return {
      ...base,
      kind: "clarify",
      reply: "Thanks for telling me. Let's figure out the shape of it first.",
      questions: ["What exactly do you need to finish?", "When is it due?"],
      tasks: [],
    };
  }

  const deadline = new Date();
  deadline.setUTCHours(17, 0, 0, 0); // label below assumes UTC; real replies carry the user's offset
  return {
    ...base,
    kind: "plan",
    reply: "That's a heavy start, and a normal one. Four small pieces, done before five.",
    questions: [],
    deadline_iso: deadline.toISOString(),
    deadline_label: "5:00 PM",
    tasks: [
      { title: "Outline the report sections", estimate_minutes: 25, music_category: "clear-the-fog" },
      { title: "Draft the summary and findings", estimate_minutes: 50, music_category: "deep-focus" },
      { title: "Add charts and examples", estimate_minutes: 25, music_category: "creative-flow" },
      { title: "Proofread and send", estimate_minutes: 25, music_category: "calm-mind" },
    ],
  };
}

export function mockStuck(taskTitle: string): StuckTurn {
  return {
    reply: "Stuck is normal. Let's shrink it until it's easy to start.",
    next_step: `Write three rough bullet points for "${taskTitle}"`,
    estimate_minutes: 10,
  };
}

export function mockReflection(): Reflection {
  return {
    headline: "A steady week with a strong start.",
    went_well: ["You showed up on most days.", "Mornings carried your deepest work."],
    to_improve: ["Plans ran a little long midweek; try one fewer task."],
    next_week: "Protect two morning laps on Tuesday and Thursday.",
  };
}
