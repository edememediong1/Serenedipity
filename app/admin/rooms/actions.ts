"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CreateRoomResult } from "@/app/app/rooms/actions";
import { requireAdmin } from "@/lib/auth/admin";
import { RoomInput, type RoomInputValue } from "@/lib/rooms/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminResult } from "../actions";

/** Schedule a public room run by the team (host_id null). */
export async function createPublicRoom(input: RoomInputValue): Promise<CreateRoomResult> {
  await requireAdmin();
  const parsed = RoomInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the room details." };
  const r = parsed.data;
  const { data, error } = await createAdminClient()
    .from("rooms")
    .insert({
      title: r.title,
      description: r.description || null,
      visibility: "public",
      schedule: r.schedule,
      starts_at: r.startsAt,
      session_minutes: r.sessionMinutes,
      focus_minutes: r.focusMinutes,
      break_minutes: r.breakMinutes,
      capacity: r.capacity,
      track_id: r.trackId ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[admin] room create failed", error);
    return { ok: false, message: "Couldn't schedule the room." };
  }
  revalidatePath("/admin/rooms");
  revalidatePath("/app/rooms");
  return { ok: true, id: data.id, inviteCode: null };
}

export async function archiveRoom(roomId: string): Promise<AdminResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(roomId).success) return { ok: false, message: "Unknown room." };
  const { error } = await createAdminClient().from("rooms").update({ status: "archived" }).eq("id", roomId);
  if (error) return { ok: false, message: "Couldn't archive the room." };
  revalidatePath("/admin/rooms");
  revalidatePath("/app/rooms");
  return { ok: true, message: "Room archived." };
}

const Resolve = z.object({
  reportId: z.uuid(),
  action: z.enum(["dismiss", "remove", "remove_content"]),
});

/**
 * Close a report. "remove" takes the reported person out of that room straight away: their app is
 * listening for the change over Realtime, leaves the call, and can't rejoin; voice tokens stop renewing.
 */
export async function resolveReport(input: z.input<typeof Resolve>): Promise<AdminResult> {
  await requireAdmin();
  const parsed = Resolve.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Unknown report." };
  const db = createAdminClient();
  const { data: report } = await db
    .from("reports")
    .select("id, reported_user_id, room_id, post_id, comment_id")
    .eq("id", parsed.data.reportId)
    .maybeSingle();
  if (!report) return { ok: false, message: "Report not found." };

  if (parsed.data.action === "remove") {
    if (!report.room_id) return { ok: false, message: "That room no longer exists." };
    const { error } = await db
      .from("room_participants")
      .upsert({ room_id: report.room_id, user_id: report.reported_user_id, removed: true });
    if (error) {
      console.error("[admin] remove failed", error);
      return { ok: false, message: "Couldn't remove them." };
    }
  }
  if (parsed.data.action === "remove_content") {
    if (!report.post_id && !report.comment_id)
      return { ok: false, message: "There's no post or comment on this report." };
    if (report.post_id) await db.from("group_posts").update({ status: "removed" }).eq("id", report.post_id);
    if (report.comment_id)
      await db.from("group_comments").update({ status: "removed" }).eq("id", report.comment_id);
  }
  await db
    .from("reports")
    .update({ status: parsed.data.action === "dismiss" ? "dismissed" : "actioned" })
    .eq("id", report.id);
  revalidatePath("/admin/reports");
  return {
    ok: true,
    message:
      parsed.data.action === "remove"
        ? "Removed from the room. Report closed."
        : parsed.data.action === "remove_content"
          ? "Content removed. Report closed."
          : "Report dismissed.",
  };
}

const GroupStatus = z.object({ groupId: z.uuid(), status: z.enum(["active", "frozen", "deleted"]) });

/** Pause (read-only), restore or delete a group. Deleting also closes its rooms. */
export async function setGroupStatus(input: z.input<typeof GroupStatus>): Promise<AdminResult> {
  await requireAdmin();
  const parsed = GroupStatus.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Unknown group." };
  const db = createAdminClient();
  const { error } = await db
    .from("groups")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.groupId);
  if (error) return { ok: false, message: "Couldn't update the group." };
  if (parsed.data.status === "deleted")
    await db.from("rooms").update({ status: "archived" }).eq("group_id", parsed.data.groupId);
  revalidatePath("/admin/groups");
  revalidatePath("/app/groups");
  return {
    ok: true,
    message:
      parsed.data.status === "frozen"
        ? "Group paused."
        : parsed.data.status === "deleted"
          ? "Group deleted."
          : "Group restored.",
  };
}
