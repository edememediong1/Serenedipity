/** To-do list ordering and status. Pure (tests/unit/todos.test.ts). */

export type Todo = {
  id: string;
  title: string;
  status: "todo" | "done" | "skipped";
  estimate_minutes: number;
  due_at: string | null;
  completed_at: string | null;
  source: "luna" | "manual";
  position: number;
  created_at: string;
};

/** Open tasks first, ordered by time (untimed after timed), then by plan order; done tasks last. */
export function sortTodos(list: Todo[]) {
  return [...list].sort((a, b) => {
    if ((a.status === "done") !== (b.status === "done")) return a.status === "done" ? 1 : -1;
    if (a.status === "done") return (a.completed_at ?? "").localeCompare(b.completed_at ?? "");
    if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at) || a.position - b.position;
    if (a.due_at || b.due_at) return a.due_at ? -1 : 1;
    return a.position - b.position;
  });
}

export function isOverdue(t: Pick<Todo, "status" | "due_at">, now: number) {
  return t.status === "todo" && !!t.due_at && Date.parse(t.due_at) < now;
}

export function openMinutes(list: Todo[]) {
  return list.filter((t) => t.status === "todo").reduce((n, t) => n + t.estimate_minutes, 0);
}
