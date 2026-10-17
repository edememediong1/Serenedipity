import "server-only";
import { requireAdmin } from "@/lib/auth/admin";
import { liveCounts } from "@/lib/rooms/data";
import { createAdminClient } from "@/lib/supabase/admin";

/** Every active room (public and private) with live headcounts. Admin only. */
export async function listAllRooms() {
  await requireAdmin();
  const db = createAdminClient();
  const { data } = await db
    .from("rooms")
    .select(
      "id, title, visibility, host_id, schedule, starts_at, session_minutes, focus_minutes, break_minutes, capacity, status, track:tracks(title)",
    )
    .eq("status", "active")
    .order("visibility")
    .order("starts_at");
  const rooms = data ?? [];
  const counts = await liveCounts(rooms.map((r) => r.id));
  return rooms.map((r) => ({
    ...r,
    track: Array.isArray(r.track) ? (r.track[0] ?? null) : r.track,
    liveCount: counts.get(r.id) ?? 0,
  }));
}

async function people(ids: string[]) {
  const db = createAdminClient();
  const unique = [...new Set(ids)];
  const [{ data: profiles }, users] = await Promise.all([
    db.from("profiles").select("id, display_name").in("id", unique),
    Promise.all(unique.map((id) => db.auth.admin.getUserById(id))),
  ]);
  const map = new Map<string, { name: string | null; email: string | null }>();
  for (const id of unique) {
    const p = profiles?.find((x) => x.id === id);
    const u = users.find((x) => x.data.user?.id === id)?.data.user;
    map.set(id, { name: p?.display_name ?? null, email: u?.email ?? null });
  }
  return map;
}

/** Reports, newest first; open ones on top. Admin only. */
export async function listReports(status: "open" | "closed") {
  await requireAdmin();
  const db = createAdminClient();
  let q = db
    .from("reports")
    .select(
      "id, reporter_id, reported_user_id, room_id, group_id, post_id, comment_id, reason, details, status, created_at, room:rooms(title), group:groups(name, slug), post:group_posts(body), comment:group_comments(body)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  q = status === "open" ? q.eq("status", "open") : q.neq("status", "open");
  const { data } = await q;
  const reports = data ?? [];
  const who = await people(reports.flatMap((r) => [r.reporter_id, r.reported_user_id]));
  // Prior reports against the same person help spot patterns.
  const { data: all } = await db
    .from("reports")
    .select("reported_user_id")
    .in("reported_user_id", [...new Set(reports.map((r) => r.reported_user_id))]);
  const totals = new Map<string, number>();
  for (const r of all ?? []) totals.set(r.reported_user_id, (totals.get(r.reported_user_id) ?? 0) + 1);
  return reports.map((r) => ({
    ...r,
    room: Array.isArray(r.room) ? (r.room[0] ?? null) : r.room,
    group: Array.isArray(r.group) ? (r.group[0] ?? null) : r.group,
    content:
      (Array.isArray(r.post) ? r.post[0]?.body : r.post?.body) ??
      (Array.isArray(r.comment) ? r.comment[0]?.body : r.comment?.body) ??
      null,
    reporter: who.get(r.reporter_id)!,
    reported: who.get(r.reported_user_id)!,
    reportsAgainst: totals.get(r.reported_user_id) ?? 1,
  }));
}

export async function openReportCount() {
  await requireAdmin();
  const { count } = await createAdminClient()
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}

/** Every group that hasn't been deleted, biggest first. Admin only. */
export async function listAllGroups() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("groups")
    .select("id, slug, name, topic, visibility, status, member_count, created_at, owner_id")
    .neq("status", "deleted")
    .order("member_count", { ascending: false })
    .limit(200);
  const groups = data ?? [];
  const who = await people(groups.map((g) => g.owner_id).filter((x): x is string => !!x));
  return groups.map((g) => ({ ...g, owner: g.owner_id ? who.get(g.owner_id)! : null }));
}
