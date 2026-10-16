import "server-only";
import { isAdmin } from "@/lib/auth/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { liveCounts } from "@/lib/rooms/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { isModerator, type GroupRole, type MemberStatus } from "./rules";
import { GROUP_COLUMNS } from "./server";

export type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  topic: string;
  visibility: string;
  rules: string | null;
  owner_id: string | null;
  status: string;
  member_count: number;
  created_at: string;
};

/**
 * Display names for a set of people. Profiles are private under RLS, so names (and only names)
 * are read with the service role for people the viewer can already see in a group.
 */
export async function displayNames(ids: string[]) {
  const unique = [...new Set(ids)];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const { data } = await createAdminClient().from("profiles").select("id, display_name").in("id", unique);
  for (const id of unique) map.set(id, data?.find((p) => p.id === id)?.display_name?.trim() || "Member");
  return map;
}

/** Groups you're in (or have asked to join), and listed groups you could join. */
export async function listGroups({ q, topic }: { q?: string; topic?: string } = {}) {
  const { user, profile, supabase } = await getSessionProfile();
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role, status")
    .eq("user_id", user.id)
    .in("status", ["active", "pending"]);
  const myIds = (memberships ?? []).map((m) => m.group_id);
  const [{ data: mine }, discover] = await Promise.all([
    myIds.length
      ? supabase.from("groups").select(GROUP_COLUMNS).in("id", myIds).neq("status", "deleted")
      : Promise.resolve({ data: [] as GroupSummary[] }),
    (async () => {
      let query = supabase
        .from("groups")
        .select(GROUP_COLUMNS)
        .eq("status", "active")
        .in("visibility", ["public", "request"])
        .order("member_count", { ascending: false })
        .limit(30);
      if (topic) query = query.eq("topic", topic);
      if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
      const { data } = await query;
      return (data ?? []).filter((g) => !myIds.includes(g.id));
    })(),
  ]);
  const roleOf = new Map((memberships ?? []).map((m) => [m.group_id, m]));
  return {
    mine: (mine ?? []).map((g) => ({
      ...g,
      role: roleOf.get(g.id)!.role as GroupRole,
      status: roleOf.get(g.id)!.status as MemberStatus,
    })),
    discover,
    canCreate: isAdmin(profile, user.email) || profile.plan === "premium",
  };
}

/** A group by slug, as the viewer sees it (null if hidden from them). */
export async function getGroup(slug: string) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!/^[a-z0-9-]{3,64}$/.test(slug)) return null;
  const { data: group } = await supabase.from("groups").select(GROUP_COLUMNS).eq("slug", slug).maybeSingle();
  if (!group) return null;
  const { data: me } = await supabase
    .from("group_members")
    .select("role, status, muted_until")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const admin = isAdmin(profile, user.email);
  const role = me?.status === "active" ? (me.role as GroupRole) : null;
  return {
    group: group as GroupSummary,
    me: me as { role: GroupRole; status: MemberStatus; muted_until: string | null } | null,
    role,
    isMod: isModerator(role) || admin,
    admin,
    userId: user.id,
    profile,
  };
}

export type FeedComment = {
  id: string;
  author_id: string;
  author: string;
  parent_id: string | null;
  body: string;
  status: string;
  created_at: string;
};
export type FeedPost = {
  id: string;
  author_id: string;
  author: string;
  kind: string;
  body: string;
  link_url: string | null;
  win: { streak: number; minutesToday: number; blocksToday: number } | null;
  solved: boolean;
  pinned: boolean;
  status: string;
  held_reason: string | null;
  created_at: string;
  reactions: Record<string, { count: number; mine: boolean }>;
  comments: FeedComment[];
};

/** The group feed: pinned first, then newest. RLS limits it to members; blocked people are hidden. */
export async function getFeed(groupId: string, before?: string): Promise<FeedPost[]> {
  const { user, supabase } = await getSessionProfile();
  let query = supabase
    .from("group_posts")
    .select("id, author_id, kind, body, link_url, win, solved, pinned, status, held_reason, created_at")
    .eq("group_id", groupId)
    .neq("status", "removed")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);
  if (before) query = query.lt("created_at", before);
  const [{ data: posts }, { data: blocks }] = await Promise.all([
    query,
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
  ]);
  const blocked = new Set((blocks ?? []).map((b) => b.blocked_id));
  const visible = (posts ?? []).filter((p) => !blocked.has(p.author_id));
  const ids = visible.map((p) => p.id);
  const [{ data: comments }, { data: reactions }] = ids.length
    ? await Promise.all([
        supabase
          .from("group_comments")
          .select("id, post_id, author_id, parent_id, body, status, created_at")
          .in("post_id", ids)
          .neq("status", "removed")
          .order("created_at"),
        supabase.from("group_reactions").select("post_id, user_id, reaction").in("post_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const names = await displayNames([
    ...visible.map((p) => p.author_id),
    ...(comments ?? []).map((c) => c.author_id),
  ]);
  return visible.map((p) => {
    const rx: FeedPost["reactions"] = {};
    for (const r of (reactions ?? []).filter((r) => r.post_id === p.id)) {
      rx[r.reaction] ??= { count: 0, mine: false };
      rx[r.reaction].count++;
      if (r.user_id === user.id) rx[r.reaction].mine = true;
    }
    return {
      ...p,
      win: p.win as FeedPost["win"],
      author: names.get(p.author_id) ?? "Member",
      reactions: rx,
      comments: (comments ?? [])
        .filter((c) => c.post_id === p.id && !blocked.has(c.author_id))
        .map((c) => ({ ...c, author: names.get(c.author_id) ?? "Member" })),
    };
  });
}

/** Members (and, for moderators, pending requests and bans). */
export async function getMembers(groupId: string) {
  const { supabase } = await getSessionProfile();
  const { data } = await supabase
    .from("group_members")
    .select("user_id, role, status, joined_at, muted_until")
    .eq("group_id", groupId)
    .order("joined_at");
  const names = await displayNames((data ?? []).map((m) => m.user_id));
  const order = { owner: 0, moderator: 1, member: 2 } as Record<string, number>;
  return (data ?? [])
    .map((m) => ({ ...m, name: names.get(m.user_id) ?? "Member" }))
    .sort((a, b) => order[a.role] - order[b.role] || a.joined_at.localeCompare(b.joined_at));
}

/** The group's rooms with live headcounts. */
export async function getGroupRooms(groupId: string) {
  const { supabase } = await getSessionProfile();
  const { data } = await supabase
    .from("rooms")
    .select(
      "id, title, description, visibility, invite_code, host_id, schedule, starts_at, session_minutes, focus_minutes, break_minutes, capacity, track_id, status, created_at, group_id, track:tracks(id, title, file_url, duration_seconds)",
    )
    .eq("group_id", groupId)
    .eq("status", "active")
    .order("starts_at");
  const rooms = data ?? [];
  const counts = await liveCounts(rooms.map((r) => r.id));
  return rooms.map((r) => ({
    ...r,
    track: Array.isArray(r.track) ? (r.track[0] ?? null) : r.track,
    invite_code: null,
    liveCount: counts.get(r.id) ?? 0,
    isHost: false,
    isMember: false,
  }));
}

/** Moderators' queue: held posts and comments, open reports. Reports are read with the service role. */
export async function getModerationQueue(groupId: string) {
  const { supabase } = await getSessionProfile();
  const db = createAdminClient();
  const [{ data: heldPosts }, { data: heldComments }, { data: reports }] = await Promise.all([
    supabase
      .from("group_posts")
      .select("id, author_id, body, held_reason, created_at")
      .eq("group_id", groupId)
      .eq("status", "held")
      .order("created_at"),
    supabase
      .from("group_comments")
      .select("id, author_id, body, held_reason, created_at")
      .eq("group_id", groupId)
      .eq("status", "held")
      .order("created_at"),
    db
      .from("reports")
      .select("id, reporter_id, reported_user_id, post_id, comment_id, reason, details, created_at")
      .eq("group_id", groupId)
      .eq("status", "open")
      .order("created_at"),
  ]);
  // The reported content itself, so moderators can judge it in place.
  const postIds = (reports ?? []).map((r) => r.post_id).filter((x): x is string => !!x);
  const commentIds = (reports ?? []).map((r) => r.comment_id).filter((x): x is string => !!x);
  const [{ data: rPosts }, { data: rComments }] = await Promise.all([
    postIds.length
      ? db.from("group_posts").select("id, body").in("id", postIds)
      : Promise.resolve({ data: [] }),
    commentIds.length
      ? db.from("group_comments").select("id, body").in("id", commentIds)
      : Promise.resolve({ data: [] }),
  ]);
  const names = await displayNames([
    ...(heldPosts ?? []).map((p) => p.author_id),
    ...(heldComments ?? []).map((c) => c.author_id),
    ...(reports ?? []).flatMap((r) => [r.reporter_id, r.reported_user_id]),
  ]);
  return {
    heldPosts: (heldPosts ?? []).map((p) => ({ ...p, author: names.get(p.author_id)! })),
    heldComments: (heldComments ?? []).map((c) => ({ ...c, author: names.get(c.author_id)! })),
    reports: (reports ?? []).map((r) => ({
      ...r,
      reporter: names.get(r.reporter_id)!,
      reported: names.get(r.reported_user_id)!,
      content:
        (r.post_id && rPosts?.find((p) => p.id === r.post_id)?.body) ||
        (r.comment_id && rComments?.find((c) => c.id === r.comment_id)?.body) ||
        null,
    })),
  };
}

/** A group by invite code (for the join page). Service role: the visitor may not be able to see it yet. */
export async function getGroupByInvite(code: string) {
  if (!/^[a-z0-9]{10}$/.test(code)) return null;
  const { data } = await createAdminClient()
    .from("groups")
    .select(GROUP_COLUMNS)
    .eq("invite_code", code)
    .eq("status", "active")
    .maybeSingle();
  return data as GroupSummary | null;
}
