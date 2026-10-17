import { describe, expect, it } from "vitest";
import type { LunaTurn } from "@/lib/luna/schema";
import { estimatedSpeechMs, spokenText } from "@/lib/luna/spoken";

const base: LunaTurn = {
  safety: "ok",
  safety_category: "none",
  kind: "clarify",
  reply: "Thanks for telling me.",
  mood_summary: "",
  questions: ["What do you need to finish?", "When is it due?"],
  deadline_iso: null,
  deadline_label: null,
  tasks: [],
  suggest_reset: false,
};

describe("what Luna says aloud", () => {
  it("reads the reply and her questions", () => {
    expect(spokenText(base)).toBe("Thanks for telling me. What do you need to finish? When is it due?");
  });
  it("summarises a plan instead of reading every step", () => {
    const plan: LunaTurn = {
      ...base,
      kind: "plan",
      reply: "Here's a plan.",
      questions: [],
      tasks: [
        { title: "Outline the report", estimate_minutes: 25, music_category: "deep-focus" },
        { title: "Draft", estimate_minutes: 25, music_category: "deep-focus" },
      ],
    };
    expect(spokenText(plan)).toBe("Here's a plan. I've made a plan with 2 steps. First: Outline the report.");
  });
  it("estimates speaking time with a safety margin", () => {
    expect(estimatedSpeechMs("one two three four five six")).toBeGreaterThan(2500);
  });
});
