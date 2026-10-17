"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CreateRoomResult } from "@/app/app/rooms/actions";
import { isAdmin } from "@/lib/auth/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { containsLink, screenContent } from "@/lib/groups/moderation";
import {
  canActOn,
  COMMENT_LIMIT,
  isModerator,
  JOIN_MESSAGES,
  joinOutcome,
  MAX_OWNED_GROUPS,
  NEW_MEMBER_LINK_DELAY_MS,
  POST_LIMIT,
  rateLimited,
  slugify,
  type GroupRole,
  type GroupVisibility,
} from "@/lib/groups/rules";
import { groupContext, type GroupContext } from "@/lib/groups/server";
import {
  CommentInput,
  GroupInput,
  PostInput,
  ReactionInput,
  type GroupInputValue,
} from "@/lib/groups/validation";
import { createDenial, denialMessage, inviteCode } from "@/lib/rooms/access";
import { roomAllowance } from "@/lib/rooms/allowance";
import { RoomInput, type RoomInputValue } from "@/lib/rooms/validation";
import { getStreak } from "@/lib/streaks/data";
import { REPORT_REASONS } from "@/lib/rooms/validation";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Study group writes. Each action loads the caller's membership with groupContext(), checks role,
 * status, mutes and rate limits, runs the content screen where relevant, and only then writes with
 * the service role. RLS (migration 20261020000200) governs every read.
 */

export type GroupResult = { ok: true; message?: string } | { ok: false; message: string };
export type PostResult =
  { ok: true; held: boolean; support: boolean; message: string } | { ok: false; message: string };

const Id = z.uuid();
const fail = (message: string) => ({ ok: false as const, message });

function refresh(slug?: string | null) {
  revalidatePath("/app/groups");
  if (slug) revalidatePath(`/app/groups/${slug}`);
}

function writable(ctx: GroupContext) {
  if (!ctx.group) return "This group doesn't exist anymore.";
  if (ctx.group.status === "frozen") return "This group is paused by the Serenedipity team.";
  return null;
}

function canPost(ctx: GroupContext) {
  const blocked = writable(ctx);
  if (blocked) return blocked;
  if (!ctx.role) return "Join the group to take part.";
  if (ctx.member?.muted_until && Date.parse(ctx.member.muted_until) > Date.now())
    return "A moderator has paused your posting for a while.";
  return null;
}

// ---------------------------------------------------------------- groups

export type CreateGroupResult = { ok: true; slug: string } | { ok: false; message: string };

/** Pro members and admins can create groups. The creator becomes the owner. */
export async function createGroup(input: GroupInputValue): Promise<CreateGroupResult> {
  const parsed = GroupInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the group details.");
  const { user, profile } = await getSessionProfile();
  const admin = isAdmin(profile, user.email);
  if (!admin && profile.plan !== "premium") return fail("Creating groups is part of Pro.");
  if (!profile.age_confirmed) return fail(JOIN_MESSAGES.age);

  const db = createAdminClient();
  const { count } = await db
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .neq("status", "deleted");
  if (!admin && (count ?? 0) >= MAX_OWNED_GROUPS)
    return fail(`You can run up to ${MAX_OWNED_GROUPS} groups at once.`);

  const g = parsed.data;
  const base = slugify(g.name);
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    const { data, error } = await db
      .from("groups")
      .insert({
        slug,
        name: g.name,
        description: g.description || null,
        topic: g.topic,
        visibility: g.visibility,
        rules: g.rules || null,
        owner_id: user.id,
        invite_code: inviteCode((n) => randomBytes(n)),
      })
      .select("id, slug")
      .single();
    if (error?.code === "23505") continue; // slug or invite code taken: try another
    if (error || !data) {
      console.error("[groups] create failed", error);
      return fail("Couldn't create the group. Try again.");
    }
    await db.from("group_members").insert({ group_id: data.id, user_id: user.id, role: "owner" });
    refresh(data.slug);
    return { ok: true, slug: data.slug };
  }
  return fail("Couldn't find a free name for the group. Try a different name.");
}

/** Owner edits the group's details. */
export async function updateGroup(groupId: string, input: GroupInputValue): Promise<GroupResult> {
  if (!Id.safeParse(groupId).success) return fail("Unknown group.");
  const parsed = GroupInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the group details.");
  const ctx = await groupContext(groupId);
  const blocked = writable(ctx);
  if (blocked) return fail(blocked);
  if (ctx.role !== "owner" && !ctx.admin) return fail("Only the owner can change the group's details.");
  const g = parsed.data;
  await ctx.db
    .from("groups")
    .update({
      name: g.name,
      description: g.description || null,
      topic: g.topic,
      visibility: g.visibility,
      rules: g.rules || null,
    })
    .eq("id", groupId);
  refresh(ctx.group!.slug);
  return { ok: true, message: "Saved." };
}

/** Join (or request to join). An invite code skips approval and opens private groups. */
export async function joinGroup(
  groupId: string,
  code?: string,
): Promise<GroupResult & { status?: "active" | "pending"; slug?: string }> {
  if (!Id.safeParse(groupId).success) return fail("Unknown group.");
  const ctx = await groupContext(groupId);
  const blocked = writable(ctx);
  if (blocked) return fail(blocked);
  const outcome = joinOutcome({
    visibility: ctx.group!.visibility as GroupVisibility,
    codeValid: !!code && code === ctx.group!.invite_code,
    ageConfirmed: ctx.profile.age_confirmed,
    existing: ctx.member?.status ?? null,
  });
  if (!outcome.ok) return fail(JOIN_MESSAGES[outcome.reason]);
  const { error } = await ctx.db.from("group_members").upsert({
    group_id: groupId,
    user_id: ctx.user.id,
    role: "member",
    status: outcome.status,
    joined_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[groups] join failed", error);
    return fail("Couldn't join. Try again.");
  }
  refresh(ctx.group!.slug);
  return {
    ok: true,
    status: outcome.status,
    slug: ctx.group!.slug,
    message:
      outcome.status === "pending" ? "Request sent. A moderator will review it." : "Welcome to the group.",
  };
}

export async function leaveGroup(groupId: string): Promise<GroupResult> {
  if (!Id.safeParse(groupId).success) return fail("Unknown group.");
  const ctx = await groupContext(groupId);
  if (!ctx.group || !ctx.member) return fail("You're not in this group.");
  if (ctx.member.role === "owner")
    return fail("Owners can't leave. Hand the group to someone else first, or delete it.");
  if (ctx.member.status === "banned") return fail("You're not in this group.");
  await ctx.db.from("group_members").delete().eq("group_id", groupId).eq("user_id", ctx.user.id);
  refresh(ctx.group.slug);
  return { ok: true };
}

/** Owner deletes the group: hidden everywhere and its rooms close. */
export async function deleteGroup(groupId: string): Promise<GroupResult> {
  if (!Id.safeParse(groupId).success) return fail("Unknown group.");
  const ctx = await groupContext(groupId);
  if (!ctx.group) return fail("This group doesn't exist anymore.");
  if (ctx.role !== "owner" && !ctx.admin) return fail("Only the owner can delete the group.");
  await ctx.db.from("groups").update({ status: "deleted" }).eq("id", groupId);
  await ctx.db.from("rooms").update({ status: "archived" }).eq("group_id", groupId);
  refresh(ctx.group.slug);
  return { ok: true };
}

/** Moderators can share the invite link. */
export async function getInviteCode(groupId: string): Promise<{ code: string } | null> {
  if (!Id.safeParse(groupId).success) return null;
  const ctx = await groupContext(groupId);
  if (!ctx.group || (!isModerator(ctx.role) && !ctx.admin)) return null;
  return { code: ctx.group.invite_code };
}

// ---------------------------------------------------------------- members

const MemberAction = z.object({
  groupId: z.uuid(),
  userId: z.uuid(),
  action: z.enum([
    "approve",
    "decline",
    "remove",
    "ban",
    "unban",
    "mute",
    "unmute",
    "promote",
    "demote",
    "transfer",
  ]),
});

/**
 * Member management. Moderators approve, mute, remove and ban members; only the owner promotes,
 * demotes or transfers ownership. Nobody can act on the owner or on themselves.
 */
export async function manageMember(input: z.input<typeof MemberAction>): Promise<GroupResult> {
  const parsed = MemberAction.safeParse(input);
  if (!parsed.success) return fail("Unknown request.");
  const { groupId, userId, action } = parsed.data;
  const ctx = await groupContext(groupId);
  const blocked = writable(ctx);
  if (blocked) return fail(blocked);
  const actor: GroupRole | null = ctx.admin ? "owner" : ctx.role;
  if (!isModerator(actor)) return fail("Only moderators can do that.");

  const { data: target } = await ctx.db
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return fail("That person isn't in this group.");
  if (!canActOn(actor, target.role as GroupRole, userId === ctx.user.id))
    return fail("You can't change that member.");
  if (["promote", "demote", "transfer"].includes(action) && actor !== "owner")
    return fail("Only the owner can change roles.");

  const where = ctx.db.from("group_members");
  const match = <T extends { eq: (c: string, v: string) => T }>(q: T) =>
    q.eq("group_id", groupId).eq("user_id", userId);
  switch (action) {
    case "approve":
      if (target.status !== "pending") return fail("There's no request to approve.");
      await match(where.update({ status: "active", joined_at: new Date().toISOString() }));
      break;
    case "decline":
      if (target.status !== "pending") return fail("There's no request to decline.");
      await match(where.delete());
      break;
    case "remove":
      await match(where.delete());
      break;
    case "ban":
      await match(where.update({ status: "banned", role: "member" }));
      break;
    case "unban":
      if (target.status !== "banned") return fail("They're not banned.");
      await match(where.delete());
      break;
    case "mute":
      await match(where.update({ muted_until: new Date(Date.now() + 24 * 3600_000).toISOString() }));
      break;
    case "unmute":
      await match(where.update({ muted_until: null }));
      break;
    case "promote":
      if (target.status !== "active") return fail("Only active members can moderate.");
      await match(where.update({ role: "moderator" }));
      break;
    case "demote":
      await match(where.update({ role: "member" }));
      break;
    case "transfer":
      if (target.status !== "active") return fail("Only active members can own the group.");
      await match(where.update({ role: "owner" }));
      await ctx.db
        .from("group_members")
        .update({ role: "moderator" })
        .eq("group_id", groupId)
        .eq("user_id", ctx.user.id);
      await ctx.db.from("groups").update({ owner_id: userId }).eq("id", groupId);
      break;
  }
  refresh(ctx.group!.slug);
  return { ok: true };
}

// ---------------------------------------------------------------- posts and comments

/** New post. Screened, rate limited, links held back for brand-new members. */
export async function createPost(input: z.input<typeof PostInput>): Promise<PostResult> {
  const parsed = PostInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check your post.");
  const { groupId, kind, body, linkUrl } = parsed.data;
  const ctx = await groupContext(groupId);
  const blocked = canPost(ctx);
  if (blocked) return fail(blocked);

  const now = Date.now();
  if (
    containsLink(body, linkUrl) &&
    !isModerator(ctx.role) &&
    now - Date.parse(ctx.member!.joined_at) < NEW_MEMBER_LINK_DELAY_MS
  )
    return fail("New members can share links after their first day in the group.");
  const { data: recent } = await ctx.db
    .from("group_posts")
    .select("created_at")
    .eq("author_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(POST_LIMIT.count);
  if (
    rateLimited(
      (recent ?? []).map((r) => r.created_at),
      POST_LIMIT,
      now,
    )
  )
    return fail("You've posted a lot in the last hour. Take a breather and try again soon.");

  const screen = screenContent(body, linkUrl);
  let win = null;
  if (kind === "win") {
    const s = await getStreak();
    const today = s.days[s.today];
    win = { streak: s.current, minutesToday: today?.minutes ?? 0, blocksToday: today?.blocks ?? 0 };
  }
  const { error } = await ctx.db.from("group_posts").insert({
    group_id: groupId,
    author_id: ctx.user.id,
    kind,
    body,
    link_url: linkUrl,
    win,
    status: screen.action === "allow" ? "visible" : "held",
    held_reason: screen.action === "allow" ? null : screen.reason,
  });
  if (error) {
    console.error("[groups] post failed", error);
    return fail("Couldn't post that. Try again.");
  }
  refresh(ctx.group!.slug);
  if (screen.action === "support")
    return { ok: true, held: true, support: true, message: "Your post is with the moderators." };
  if (screen.action === "hold")
    return {
      ok: true,
      held: true,
      support: false,
      message: "Your post is waiting for a moderator to review it.",
    };
  return { ok: true, held: false, support: false, message: "Posted." };
}

async function loadPost(ctx: GroupContext, postId: string) {
  const { data } = await ctx.db
    .from("group_posts")
    .select("id, group_id, author_id, kind, status")
    .eq("id", postId)
    .maybeSingle();
  return data && data.group_id === ctx.group?.id ? data : null;
}

async function postContext(postId: string) {
  const { data: post } = await createAdminClient()
    .from("group_posts")
    .select("group_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return null;
  return groupContext(post.group_id);
}

export async function createComment(input: z.input<typeof CommentInput>): Promise<PostResult> {
  const parsed = CommentInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check your comment.");
  const { postId, parentId, body } = parsed.data;
  const ctx = await postContext(postId);
  if (!ctx) return fail("That post doesn't exist anymore.");
  const blocked = canPost(ctx);
  if (blocked) return fail(blocked);
  const post = await loadPost(ctx, postId);
  if (!post || post.status !== "visible") return fail("That post isn't available.");
  if (parentId) {
    const { data: parent } = await ctx.db
      .from("group_comments")
      .select("post_id, parent_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.post_id !== postId || parent.parent_id)
      return fail("You can only reply to a top-level comment.");
  }
  const now = Date.now();
  if (
    containsLink(body) &&
    !isModerator(ctx.role) &&
    now - Date.parse(ctx.member!.joined_at) < NEW_MEMBER_LINK_DELAY_MS
  )
    return fail("New members can share links after their first day in the group.");
  const { data: recent } = await ctx.db
    .from("group_comments")
    .select("created_at")
    .eq("author_id", ctx.user.id)
    .order("created_at", { ascending: false })
    .limit(COMMENT_LIMIT.count);
  if (
    rateLimited(
      (recent ?? []).map((r) => r.created_at),
      COMMENT_LIMIT,
      now,
    )
  )
    return fail("You're commenting quickly. Give it a minute.");

  const screen = screenContent(body);
  const { error } = await ctx.db.from("group_comments").insert({
    post_id: postId,
    group_id: ctx.group!.id,
    author_id: ctx.user.id,
    parent_id: parentId ?? null,
    body,
    status: screen.action === "allow" ? "visible" : "held",
    held_reason: screen.action === "allow" ? null : screen.reason,
  });
  if (error) {
    console.error("[groups] comment failed", error);
    return fail("Couldn't post that. Try again.");
  }
  refresh(ctx.group!.slug);
  if (screen.action !== "allow")
    return {
      ok: true,
      held: true,
      support: screen.action === "support",
      message: "Your comment is waiting for a moderator.",
    };
  return { ok: true, held: false, support: false, message: "Comment posted." };
}

const PostAction = z.object({
  postId: z.uuid(),
  action: z.enum(["remove", "pin", "unpin", "solve", "unsolve", "approve"]),
});

/** Authors remove their posts and mark questions solved; moderators also pin, remove and approve held posts. */
export async function updatePost(input: z.input<typeof PostAction>): Promise<GroupResult> {
  const parsed = PostAction.safeParse(input);
  if (!parsed.success) return fail("Unknown request.");
  const { postId, action } = parsed.data;
  const ctx = await postContext(postId);
  if (!ctx) return fail("That post doesn't exist anymore.");
  const blocked = writable(ctx);
  if (blocked) return fail(blocked);
  const post = await loadPost(ctx, postId);
  if (!post) return fail("That post doesn't exist anymore.");
  const mod = isModerator(ctx.role) || ctx.admin;
  const author = post.author_id === ctx.user.id && !!ctx.role;
  const allowed =
    action === "remove"
      ? mod || author
      : action === "solve" || action === "unsolve"
        ? (mod || author) && post.kind === "question"
        : mod;
  if (!allowed) return fail("You can't do that.");
  const patch =
    action === "remove"
      ? { status: "removed" }
      : action === "approve"
        ? { status: "visible", held_reason: null }
        : action === "pin" || action === "unpin"
          ? { pinned: action === "pin" }
          : { solved: action === "solve" };
  await ctx.db.from("group_posts").update(patch).eq("id", postId);
  refresh(ctx.group!.slug);
  return { ok: true };
}

const CommentAction = z.object({ commentId: z.uuid(), action: z.enum(["remove", "approve"]) });

export async function updateComment(input: z.input<typeof CommentAction>): Promise<GroupResult> {
  const parsed = CommentAction.safeParse(input);
  if (!parsed.success) return fail("Unknown request.");
  const db = createAdminClient();
  const { data: comment } = await db
    .from("group_comments")
    .select("id, group_id, author_id")
    .eq("id", parsed.data.commentId)
    .maybeSingle();
  if (!comment) return fail("That comment doesn't exist anymore.");
  const ctx = await groupContext(comment.group_id);
  const blocked = writable(ctx);
  if (blocked) return fail(blocked);
  const mod = isModerator(ctx.role) || ctx.admin;
  if (parsed.data.action === "approve" ? !mod : !(mod || (comment.author_id === ctx.user.id && ctx.role)))
    return fail("You can't do that.");
  await ctx.db
    .from("group_comments")
    .update(
      parsed.data.action === "remove" ? { status: "removed" } : { status: "visible", held_reason: null },
    )
    .eq("id", comment.id);
  refresh(ctx.group!.slug);
  return { ok: true };
}

export async function toggleReaction(
  input: z.input<typeof ReactionInput>,
): Promise<GroupResult & { on?: boolean }> {
  const parsed = ReactionInput.safeParse(input);
  if (!parsed.success) return fail("Unknown reaction.");
  const { postId, reaction } = parsed.data;
  const ctx = await postContext(postId);
  if (!ctx) return fail("That post doesn't exist anymore.");
  const blocked = writable(ctx) ?? (ctx.role ? null : "Join the group to react.");
  if (blocked) return fail(blocked);
  const post = await loadPost(ctx, postId);
  if (!post || post.status !== "visible") return fail("That post isn't available.");
  const { data: existing } = await ctx.db
    .from("group_reactions")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", ctx.user.id)
    .eq("reaction", reaction)
    .maybeSingle();
  if (existing)
    await ctx.db
      .from("group_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", ctx.user.id)
      .eq("reaction", reaction);
  else await ctx.db.from("group_reactions").insert({ post_id: postId, user_id: ctx.user.id, reaction });
  refresh(ctx.group!.slug);
  return { ok: true, on: !existing };
}

// ---------------------------------------------------------------- safety

const ReportInput = z.object({
  groupId: z.uuid(),
  userId: z.uuid(),
  postId: z.uuid().nullable().optional(),
  commentId: z.uuid().nullable().optional(),
  reason: z.enum(
    Object.keys(REPORT_REASONS) as [keyof typeof REPORT_REASONS, ...(keyof typeof REPORT_REASONS)[]],
  ),
  details: z.string().trim().max(500).optional().default(""),
  block: z.boolean().default(false),
});

/** Report a post, comment or member. Goes to the group's moderators and the admin queue. */
export async function reportGroupContent(input: z.input<typeof ReportInput>): Promise<GroupResult> {
  const parsed = ReportInput.safeParse(input);
  if (!parsed.success) return fail("Choose a reason for the report.");
  const r = parsed.data;
  const ctx = await groupContext(r.groupId);
  const { user, supabase, db } = ctx;
  if (r.userId === user.id) return fail("You can't report yourself.");
  // Only members report, and only about content that really belongs to this group and person,
  // so nobody can fill another group's moderation queue.
  if (!ctx.group || !ctx.role) return fail("Join the group to report something in it.");
  if (r.postId) {
    const { data: p } = await db
      .from("group_posts")
      .select("group_id, author_id")
      .eq("id", r.postId)
      .maybeSingle();
    if (p?.group_id !== r.groupId || p.author_id !== r.userId) return fail("That post isn't in this group.");
  }
  if (r.commentId) {
    const { data: c } = await db
      .from("group_comments")
      .select("group_id, author_id")
      .eq("id", r.commentId)
      .maybeSingle();
    if (c?.group_id !== r.groupId || c.author_id !== r.userId)
      return fail("That comment isn't in this group.");
  }
  if (!r.postId && !r.commentId) {
    const { data: m } = await db
      .from("group_members")
      .select("status")
      .eq("group_id", r.groupId)
      .eq("user_id", r.userId)
      .maybeSingle();
    if (!m) return fail("That person isn't in this group.");
  }
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_user_id: r.userId,
    group_id: r.groupId,
    post_id: r.postId ?? null,
    comment_id: r.commentId ?? null,
    reason: r.reason,
    details: r.details || null,
  });
  if (error) {
    console.error("[groups] report failed", error);
    return fail("Couldn't send the report. Try again.");
  }
  if (r.block)
    await supabase
      .from("blocks")
      .upsert({ blocker_id: user.id, blocked_id: r.userId }, { ignoreDuplicates: true });
  return { ok: true, message: "Thanks. The moderators will take a look." };
}

const ResolveGroupReport = z.object({
  reportId: z.uuid(),
  action: z.enum(["dismiss", "remove_content", "ban"]),
});

/** Group moderators resolve reports about their group. */
export async function resolveGroupReport(input: z.input<typeof ResolveGroupReport>): Promise<GroupResult> {
  const parsed = ResolveGroupReport.safeParse(input);
  if (!parsed.success) return fail("Unknown report.");
  const db = createAdminClient();
  const { data: report } = await db
    .from("reports")
    .select("id, group_id, post_id, comment_id, reported_user_id")
    .eq("id", parsed.data.reportId)
    .maybeSingle();
  if (!report?.group_id) return fail("Report not found.");
  const ctx = await groupContext(report.group_id);
  if (!ctx.group || !(isModerator(ctx.role) || ctx.admin)) return fail("Only moderators can do that.");
  if (parsed.data.action === "remove_content") {
    if (report.post_id) await db.from("group_posts").update({ status: "removed" }).eq("id", report.post_id);
    if (report.comment_id)
      await db.from("group_comments").update({ status: "removed" }).eq("id", report.comment_id);
  }
  if (parsed.data.action === "ban") {
    const { data: target } = await db
      .from("group_members")
      .select("role")
      .eq("group_id", report.group_id)
      .eq("user_id", report.reported_user_id)
      .maybeSingle();
    const actor: GroupRole = ctx.admin ? "owner" : ctx.role!;
    if (target && !canActOn(actor, target.role as GroupRole, false))
      return fail("You can't ban that member.");
    await db.from("group_members").upsert({
      group_id: report.group_id,
      user_id: report.reported_user_id,
      status: "banned",
      role: "member",
    });
    if (report.post_id) await db.from("group_posts").update({ status: "removed" }).eq("id", report.post_id);
    if (report.comment_id)
      await db.from("group_comments").update({ status: "removed" }).eq("id", report.comment_id);
  }
  await db
    .from("reports")
    .update({ status: parsed.data.action === "dismiss" ? "dismissed" : "actioned" })
    .eq("id", report.id);
  refresh(ctx.group.slug);
  revalidatePath("/admin/reports");
  return { ok: true };
}

// ---------------------------------------------------------------- rooms

/** Moderators schedule rooms for their group (members only). */
export async function createGroupRoom(groupId: string, input: RoomInputValue): Promise<CreateRoomResult> {
  if (!Id.safeParse(groupId).success) return fail("Unknown group.");
  const parsed = RoomInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the room details.");
  const ctx = await groupContext(groupId);
  const blocked = writable(ctx);
  if (blocked) return fail(blocked);
  if (!isModerator(ctx.role) && !ctx.admin) return fail("Only moderators can schedule group rooms.");
  // Group sessions count toward the same daily creation allowance as private rooms.
  const allowance = await roomAllowance(ctx.user.id, ctx.profile, ctx.admin);
  const denied = createDenial({
    ageConfirmed: ctx.profile.age_confirmed,
    createdToday: allowance.createdToday,
    createsPerDay: allowance.limits.createsPerDay,
  });
  if (denied) return fail(denialMessage(denied, allowance.limits));
  const r = parsed.data;
  const { data, error } = await ctx.db
    .from("rooms")
    .insert({
      title: r.title,
      description: r.description || null,
      visibility: "group",
      group_id: groupId,
      host_id: ctx.user.id,
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
    console.error("[groups] room create failed", error);
    return fail("Couldn't schedule the room. Try again.");
  }
  refresh(ctx.group!.slug);
  revalidatePath("/app/rooms");
  return { ok: true, id: data.id, inviteCode: null };
}
