import "server-only";
import { getSessionProfile } from "@/lib/auth/session";
import { startOfLocalDay } from "@/lib/time";
import { sortTodos, type Todo } from "./todos";

const COLUMNS = "id, title, status, estimate_minutes, due_at, completed_at, source, position, created_at";

/** Today's list: open tasks in the active plan, plus anything finished today. */
export async function getTodayTodos(): Promise<Todo[]> {
  const { user, profile, supabase } = await getSessionProfile();
  const since = startOfLocalDay(Date.now(), profile.timezone).toISOString();
  const [{ data: plan }, { data: doneToday }] = await Promise.all([
    supabase
      .from("plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select(COLUMNS)
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("completed_at", since),
  ]);
  const { data: open } = plan
    ? await supabase.from("tasks").select(COLUMNS).eq("plan_id", plan.id).eq("status", "todo")
    : { data: [] };
  const byId = new Map<string, Todo>();
  for (const t of [...(open ?? []), ...(doneToday ?? [])]) byId.set(t.id, t as Todo);
  return sortTodos([...byId.values()]);
}
