"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { getSessionProfile } from "@/lib/auth/session";
import {
  canHostPrivate,
  DENIAL_MESSAGES,
  inviteCode,
  joinDenial,
  MAX_HOSTED_ROOMS,
} from "@/lib/rooms/access";
import { liveCounts } from "@/lib/rooms/data";
import { roomPhase } from "@/lib/rooms/schedule";
import { MessageInput, ReportInput, RoomInput, type RoomInputValue } from "@/lib/rooms/validation";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Room writes. Each action authorises the caller (session, plan, membership, room phase) and only
 * then writes with the service role, because the rules (capacity, the free trial room, break-only
 * chat) span rows that the caller can't see under RLS.
 */

export type RoomResult = { ok: true } | { ok: false; message: string };

const Id = z.uuid();

async function loadRoom(roomId: string) {
  const { data } = await createAdminClient()
    .from("rooms")
    .select(
      "id, visibility, invite_code, host_id, capacity, status, schedule, starts_at, session_minutes, focus_minutes, break_minutes",
    )
    .eq("id", roomId)
    .maybeSingle();
  return data && data.status === "active" ? data : null;
}

export async function joinRoom(roomId: string, code?: string): Promise<RoomResult> {
  if (!Id.safeParse(roomId).success) return { ok: false, message: "That room doesn't exist." };
  const { user, profile } = await getSessionProfile();
  const admin = isAdmin(profile, user.email);
  const room = await loadRoom(roomId);
  if (!room) return { ok: false, message: "That room has closed." };

  const db = createAdminClient();
  const { data: rows } = await db.from("room_participants").select("room_id, removed").eq("user_id", user.id);
  const mine = (rows ?? []).find((r) => r.room_id === roomId);
  const isHost = room.host_id === user.id;

  if (room.visibility === "private" && !isHost && !mine && !admin && code !== room.invite_code)
    return { ok: false, message: "This is a private room. Ask the host for the invite link." };

  const counts = await liveCounts([roomId]);
  const denial = joinDenial({
    ageConfirmed: profile.age_confirmed,
    plan: profile.plan,
    admin,
    removed: !!mine?.removed,
    alreadyMember: !!mine,
    otherRoomsJoined: (rows ?? []).filter((r) => r.room_id !== roomId).length,
    liveCount: counts.get(roomId) ?? 0,
    capacity: room.capacity,
    isHost,
  });
  if (denial) return { ok: false, message: DENIAL_MESSAGES[denial] };

  const now = new Date().toISOString();
  const { error } = await db
    .from("room_participants")
    .upsert({ room_id: roomId, user_id: user.id, last_seen_at: now, left_at: null });
  if (error) {
    console.error("[rooms] join failed", error);
    return { ok: false, message: "Couldn't join the room. Try again." };
  }
  revalidatePath("/app/rooms");
  return { ok: true };
}

/** Called every minute while the room is open, so headcounts and capacity stay honest. */
export async function roomHeartbeat(roomId: string): Promise<{ removed: boolean }> {
  if (!Id.safeParse(roomId).success) return { removed: false };
  const { user } = await getSessionProfile();
  const db = createAdminClient();
  const { data } = await db
    .from("room_participants")
    .update({ last_seen_at: new Date().toISOString(), left_at: null })
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .eq("removed", false)
    .select("room_id");
  return { removed: !data?.length };
}

export async function leaveRoom(roomId: string): Promise<RoomResult> {
  if (!Id.safeParse(roomId).success) return { ok: false, message: "Unknown room." };
  const { user } = await getSessionProfile();
  await createAdminClient()
    .from("room_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("user_id", user.id);
  revalidatePath("/app/rooms");
  return { ok: true };
}

/** Chat is open during breaks only (PRD 4.5). The server checks the phase, not the client. */
export async function sendRoomMessage(input: z.input<typeof MessageInput>): Promise<RoomResult> {
  const parsed = MessageInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Messages can be up to 280 characters." };
  const { roomId, body } = parsed.data;
  const { user, profile } = await getSessionProfile();
  const db = createAdminClient();
  const [room, { data: me }] = await Promise.all([
    loadRoom(roomId),
    db
      .from("room_participants")
      .select("removed, left_at")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!room || !me || me.removed || me.left_at) return { ok: false, message: "You're not in this room." };
  const phase = roomPhase(room, Date.now());
  if (!phase.live || phase.phase !== "break") return { ok: false, message: "Chat opens during the break." };

  const { data: last } = await db
    .from("room_messages")
    .select("created_at")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - Date.parse(last.created_at) < 3000)
    return { ok: false, message: "Give it a moment before sending another." };

  const { error } = await db.from("room_messages").insert({
    room_id: roomId,
    user_id: user.id,
    display_name: (profile.display_name?.trim() || "Someone").slice(0, 40),
    body,
  });
  if (error) {
    console.error("[rooms] message failed", error);
    return { ok: false, message: "Couldn't send that. Try again." };
  }
  return { ok: true };
}

/** Report someone (and by default block them). Admins review reports in /admin/reports. */
export async function reportParticipant(input: z.input<typeof ReportInput>): Promise<RoomResult> {
  const parsed = ReportInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a reason for the report." };
  const { roomId, userId, reason, details, block } = parsed.data;
  const { user, supabase } = await getSessionProfile();
  if (userId === user.id) return { ok: false, message: "You can't report yourself." };
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_user_id: userId,
    room_id: roomId,
    reason,
    details: details || null,
  });
  if (error) {
    console.error("[rooms] report failed", error);
    return { ok: false, message: "Couldn't send the report. Try again." };
  }
  if (block) {
    // Insert-only (no update grant): an existing block is left as is.
    const { error: blockError } = await supabase
      .from("blocks")
      .upsert({ blocker_id: user.id, blocked_id: userId }, { ignoreDuplicates: true });
    if (blockError) console.error("[rooms] block failed", blockError);
  }
  return { ok: true };
}

/** Blocking hides someone's video, voice and messages from you, everywhere. */
export async function setBlocked(userId: string, blocked: boolean): Promise<RoomResult> {
  if (!Id.safeParse(userId).success) return { ok: false, message: "Unknown person." };
  const { user, supabase } = await getSessionProfile();
  if (userId === user.id) return { ok: false, message: "You can't block yourself." };
  const { error } = blocked
    ? await supabase
        .from("blocks")
        .upsert({ blocker_id: user.id, blocked_id: userId }, { ignoreDuplicates: true })
    : await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", userId);
  if (error) return { ok: false, message: "Couldn't update that. Try again." };
  return { ok: true };
}

export type CreateRoomResult =
  { ok: true; id: string; inviteCode: string | null } | { ok: false; message: string };

/** Pro members host private rooms with an invite link. Public rooms are scheduled by admins (/admin/rooms). */
export async function createPrivateRoom(input: RoomInputValue): Promise<CreateRoomResult> {
  const parsed = RoomInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the room details." };
  const { user, profile } = await getSessionProfile();
  const admin = isAdmin(profile, user.email);
  if (!canHostPrivate(profile.plan, admin))
    return { ok: false, message: "Hosting private rooms is part of Pro." };
  if (!profile.age_confirmed) return { ok: false, message: DENIAL_MESSAGES.age };

  const db = createAdminClient();
  const { count } = await db
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("host_id", user.id)
    .eq("status", "active");
  if (!admin && (count ?? 0) >= MAX_HOSTED_ROOMS)
    return { ok: false, message: `You can host up to ${MAX_HOSTED_ROOMS} rooms at once. Close one first.` };

  const r = parsed.data;
  const code = inviteCode((n) => randomBytes(n));
  const { data, error } = await db
    .from("rooms")
    .insert({
      title: r.title,
      description: r.description || null,
      visibility: "private",
      invite_code: code,
      host_id: user.id,
      schedule: r.schedule,
      starts_at: r.startsAt,
      session_minutes: r.sessionMinutes,
      focus_minutes: r.focusMinutes,
      break_minutes: r.breakMinutes,
      capacity: Math.min(r.capacity, 12),
      track_id: r.trackId ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[rooms] create failed", error);
    return { ok: false, message: "Couldn't create the room. Try again." };
  }
  await db
    .from("room_participants")
    .insert({ room_id: data.id, user_id: user.id, left_at: new Date().toISOString() });
  revalidatePath("/app/rooms");
  return { ok: true, id: data.id, inviteCode: code };
}

/** Hosts can close their own private rooms. */
export async function closeRoom(roomId: string): Promise<RoomResult> {
  if (!Id.safeParse(roomId).success) return { ok: false, message: "Unknown room." };
  const { user } = await getSessionProfile();
  const { data } = await createAdminClient()
    .from("rooms")
    .update({ status: "archived" })
    .eq("id", roomId)
    .eq("host_id", user.id)
    .select("id");
  if (!data?.length) return { ok: false, message: "Only the host can close this room." };
  revalidatePath("/app/rooms");
  return { ok: true };
}
