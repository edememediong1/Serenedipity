import type { LunaTurn } from "./schema";

/**
 * What Luna says out loud for a turn: the reply, then her questions, then a short summary of a plan.
 * Kept brief: the full plan is always on screen.
 */
export function spokenText(turn: LunaTurn) {
  const parts = [turn.reply.trim()];
  if (turn.kind === "clarify" && turn.questions.length) parts.push(...turn.questions.map((q) => q.trim()));
  if (turn.kind === "plan" && turn.tasks.length) {
    const n = turn.tasks.length;
    parts.push(`I've made a plan with ${n} ${n === 1 ? "step" : "steps"}. First: ${turn.tasks[0].title}.`);
  }
  return parts.filter(Boolean).join(" ").slice(0, 1200);
}

/** Rough speaking time, used as a safety stop if the browser never reports the end. */
export function estimatedSpeechMs(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.round((words / 2.6) * 1000) + 2500;
}
