import { describe, expect, it } from "vitest";
import { screenMessage } from "@/lib/luna/safety";
import { sanitizeTurn, type LunaTurn } from "@/lib/luna/schema";
import { mockLunaTurn } from "@/lib/luna/mock";

describe("Luna safety screen", () => {
  it("flags self-harm and harm-to-others language", () => {
    expect(screenMessage("honestly I want to die")).toBe("self_harm");
    expect(screenMessage("I keep thinking about ending my life")).toBe("self_harm");
    expect(screenMessage("everyone would be better off without me")).toBe("self_harm");
    expect(screenMessage("I want to hurt someone")).toBe("harm_to_others");
  });

  it("does not flag everyday deadline stress", () => {
    expect(screenMessage("this report is killing me, due at 5")).toBeNull();
    expect(screenMessage("I'm dying to finish this deck")).toBeNull();
    expect(screenMessage("foggy and stressed, client report today")).toBeNull();
  });
});

describe("sanitizeTurn", () => {
  const base: LunaTurn = {
    safety: "ok",
    safety_category: "none",
    kind: "plan",
    reply: " hi ",
    mood_summary: "",
    questions: ["should be dropped"],
    deadline_iso: "not a date",
    deadline_label: null,
    tasks: [{ title: "  ", estimate_minutes: 3, music_category: "deep-focus" }],
    suggest_reset: false,
  };
  it("clamps estimates, drops stray fields and bad deadlines", () => {
    const t = sanitizeTurn(base);
    expect(t.reply).toBe("hi");
    expect(t.questions).toEqual([]);
    expect(t.deadline_iso).toBeNull();
    expect(t.tasks[0]).toEqual({ title: "Next step", estimate_minutes: 5, music_category: "deep-focus" });
  });
  it("support turns never carry tasks", () => {
    expect(sanitizeTurn({ ...base, kind: "support" }).tasks).toEqual([]);
  });
});

describe("mock Luna", () => {
  it("clarifies first, then plans", () => {
    expect(mockLunaTurn([{ role: "user", content: "I feel foggy" }]).kind).toBe("clarify");
    expect(mockLunaTurn([{ role: "user", content: "client report due by 5" }]).kind).toBe("plan");
  });
});
