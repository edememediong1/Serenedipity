import "server-only";
import { isAdmin } from "@/lib/auth/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { PRESENCE_WINDOW_MS } from "./access";
import { roomAllowance } from "./allowance";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
export type RoomTrack = { id: string; title: string; file_url: string; duration_seconds: number };
export type RoomView = Omit<RoomRow, "invite_code"> & {
  invite_code: string | null;
  track: RoomTrack | null;
  liveCount: number;
  isHost: boolean;
  isMember: boolean;
};

const ROOM_COLUMNS =
  "id, title, description, visibility, invite_code, host_id, schedule, starts_at, session_minutes, focus_minutes, break_minutes, capacity, track_id, status, created_at, group_id, track:tracks(id, title, file_url, duration_seconds)";

/**
 * Live headcounts. Participant rows are only visible to members (RLS), so counts are read with the
 * service role; only numbers leave this function.
 */
export async function liveCounts(roomIds: string[]) {
  const counts = new Map<string, number>();
  if (!roomIds.length) return counts;
  const since = new Date(Date.now() - PRESENCE_WINDOW_MS).toISOString();
  const { data } = await createAdminClient()
    .from("room_participants")
    .select("room_id")
    .in("room_id", roomIds)
    .eq("removed", false)
    .is("left_at", null)
    .gte("last_seen_at", since);
  for (const r of data ?? []) counts.set(r.room_id, (counts.get(r.room_id) ?? 0) + 1);
  return counts;
}

function shape(
  row: RoomRow & { track: RoomTrack | RoomTrack[] | null },
  userId: string,
  memberOf: Set<string>,
  counts: Map<string, number>,
  admin: boolean,
): RoomView {
  const isHost = row.host_id === userId;
  const track = Array.isArray(row.track) ? (row.track[0] ?? null) : row.track;
  return {
    ...row,
    // Only the host (and admins) can see a private room's invite link.
    invite_code: isHost || admin ? row.invite_code : null,
    track,
    liveCount: counts.get(row.id) ?? 0,
    isHost,
    isMember: memberOf.has(row.id),
  };
}

/** Rooms this person can see: public team rooms plus private rooms they host or joined (RLS). */
export async function listRooms() {
  const { user, profile, supabase } = await getSessionProfile();
  const admin = isAdmin(profile, user.email);
  const [{ data: rooms }, { data: mine }] = await Promise.all([
    supabase.from("rooms").select(ROOM_COLUMNS).eq("status", "active").order("starts_at"),
    supabase.from("room_participants").select("room_id, removed").eq("user_id", user.id),
  ]);
  const removed = new Set((mine ?? []).filter((m) => m.removed).map((m) => m.room_id));
  const memberOf = new Set((mine ?? []).filter((m) => !m.removed).map((m) => m.room_id));
  const visible = (rooms ?? []).filter((r) => !removed.has(r.id));
  const [counts, allowance] = await Promise.all([
    liveCounts(visible.map((r) => r.id)),
    roomAllowance(user.id, profile, admin),
  ]);
  return {
    rooms: visible.map((r) => shape(r, user.id, memberOf, counts, admin)),
    allowance,
    profile,
    admin,
    userId: user.id,
  };
}

/** One room the person can see, or null. */
export async function getRoom(roomId: string) {
  const { user, profile, supabase } = await getSessionProfile();
  const admin = isAdmin(profile, user.email);
  const [{ data: room }, { data: me }] = await Promise.all([
    supabase.from("rooms").select(ROOM_COLUMNS).eq("id", roomId).eq("status", "active").maybeSingle(),
    supabase
      .from("room_participants")
      .select("removed, left_at")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!room) return null;
  const memberOf = new Set(me && !me.removed ? [roomId] : []);
  const counts = await liveCounts([roomId]);
  return {
    room: shape(room, user.id, memberOf, counts, admin),
    removed: !!me?.removed,
    profile,
    admin,
    userId: user.id,
  };
}

/** A private room by its invite code (for the join page). Service role: the visitor isn't a member yet. */
export async function getRoomByInvite(code: string) {
  if (!/^[a-z0-9]{10}$/.test(code)) return null;
  const { data } = await createAdminClient()
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("invite_code", code)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const track = Array.isArray(data.track) ? (data.track[0] ?? null) : data.track;
  return { ...data, track };
}

export async function listTracks() {
  const { supabase } = await getSessionProfile();
  const { data } = await supabase.from("tracks").select("id, title, category").order("title");
  return data ?? [];
}
