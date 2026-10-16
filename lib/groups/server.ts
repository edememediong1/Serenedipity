import "server-only";
import { isAdmin } from "@/lib/auth/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GroupRole, MemberStatus } from "./rules";

export const GROUP_COLUMNS =
  "id, slug, name, description, topic, visibility, rules, owner_id, status, member_count, created_at";

/**
 * Everything an action needs to authorise a request: the caller, the group (including its
 * invite code, read with the service role) and the caller's membership. Null group if missing
 * or deleted.
 */
export async function groupContext(groupId: string) {
  const session = await getSessionProfile();
  const db = createAdminClient();
  const [{ data: group }, { data: member }] = await Promise.all([
    db.from("groups").select(`${GROUP_COLUMNS}, invite_code`).eq("id", groupId).maybeSingle(),
    db
      .from("group_members")
      .select("role, status, joined_at, muted_until")
      .eq("group_id", groupId)
      .eq("user_id", session.user.id)
      .maybeSingle(),
  ]);
  const admin = isAdmin(session.profile, session.user.email);
  const live = group && group.status !== "deleted" ? group : null;
  const active = member?.status === "active";
  return {
    ...session,
    db,
    admin,
    group: live,
    member: member as {
      role: GroupRole;
      status: MemberStatus;
      joined_at: string;
      muted_until: string | null;
    } | null,
    role: active ? (member!.role as GroupRole) : null,
  };
}

export type GroupContext = Awaited<ReturnType<typeof groupContext>>;
