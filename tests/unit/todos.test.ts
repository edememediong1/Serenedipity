import { describe, expect, it } from "vitest";
import { isOverdue, openMinutes, sortTodos, type Todo } from "@/lib/tasks/todos";

const t = (over: Partial<Todo>): Todo => ({
  id: crypto.randomUUID(),
  title: "x",
  status: "todo",
  estimate_minutes: 25,
  due_at: null,
  completed_at: null,
  source: "manual",
  position: 0,
  created_at: "2026-10-17T08:00:00Z",
  ...over,
});

describe("to-dos", () => {
  it("orders by time, untimed after timed, done last", () => {
    const list = [
      t({ title: "untimed", position: 0 }),
      t({ title: "done", status: "done", completed_at: "2026-10-17T09:00:00Z" }),
      t({ title: "3pm", due_at: "2026-10-17T15:00:00Z" }),
      t({ title: "9am", due_at: "2026-10-17T09:00:00Z" }),
      t({ title: "untimed 2", position: 1 }),
    ];
    expect(sortTodos(list).map((x) => x.title)).toEqual(["9am", "3pm", "untimed", "untimed 2", "done"]);
  });
  it("flags overdue open tasks and totals open minutes", () => {
    const now = Date.parse("2026-10-17T12:00:00Z");
    expect(isOverdue(t({ due_at: "2026-10-17T11:00:00Z" }), now)).toBe(true);
    expect(isOverdue(t({ due_at: "2026-10-17T11:00:00Z", status: "done" }), now)).toBe(false);
    expect(isOverdue(t({ due_at: null }), now)).toBe(false);
    expect(
      openMinutes([t({ estimate_minutes: 10 }), t({ estimate_minutes: 15 }), t({ status: "done" })]),
    ).toBe(25);
  });
});
