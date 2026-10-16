import "server-only";
import { getSessionProfile } from "@/lib/auth/session";
import { startOfToday } from "./today";

/** Today's completed focus minutes and blocks for the signed-in user. */
export async function getTodayStats() {
  const { user, profile, supabase } = await getSessionProfile();
  const { data } = await supabase
    .from("focus_blocks")
    .select("focused_seconds, completed")
    .eq("user_id", user.id)
    .gte("started_at", startOfToday(profile.timezone));
  const rows = data ?? [];
  return {
    minutes: Math.round(rows.reduce((sum, r) => sum + r.focused_seconds, 0) / 60),
    blocks: rows.filter((r) => r.completed).length,
  };
}
