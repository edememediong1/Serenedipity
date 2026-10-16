/**
 * Study group rules: who can do what, how joining works, and posting limits. Pure, so it's unit
 * tested (tests/unit/groups.test.ts) and shared by server actions and UI.
 */

export type GroupRole = "owner" | "moderator" | "member";
export type GroupVisibility = "public" | "request" | "private";
export type MemberStatus = "active" | "pending" | "banned";

/** Groups a Pro member (or admin) can own at once. */
export const MAX_OWNED_GROUPS = 5;
/** Active memberships on the free plan. */
export const FREE_GROUP_LIMIT = 3;
/** New members can't post links for this long (a common spam pattern). */
export const NEW_MEMBER_LINK_DELAY_MS = 24 * 60 * 60 * 1000;
export const POST_LIMIT = { count: 5, windowMs: 60 * 60 * 1000 };
export const COMMENT_LIMIT = { count: 20, windowMs: 10 * 60 * 1000 };

export const TOPICS = {
  exams: "Exams",
  coding: "Coding",
  writing: "Writing",
  languages: "Languages",
  work: "Work",
  creative: "Creative",
  research: "Research",
  other: "Other",
} as const;
export type Topic = keyof typeof TOPICS;

export const POST_KINDS = {
  update: "Update",
  question: "Question",
  resource: "Resource",
  win: "Win",
} as const;
export type PostKind = keyof typeof POST_KINDS;

export const REACTIONS = { clap: "👏", fire: "🔥", heart: "💜" } as const;
export type Reaction = keyof typeof REACTIONS;

export function isModerator(role: GroupRole | null | undefined) {
  return role === "owner" || role === "moderator";
}

/** Moderators act on members; only the owner acts on moderators; nobody acts on the owner or themselves. */
export function canActOn(actor: GroupRole | null, target: GroupRole, self: boolean) {
  if (self || target === "owner" || !isModerator(actor)) return false;
  return actor === "owner" || target === "member";
}

export type JoinContext = {
  visibility: GroupVisibility;
  codeValid: boolean;
  ageConfirmed: boolean;
  /** Existing membership row, if any. */
  existing: MemberStatus | null;
  plan: string;
  admin: boolean;
  activeMemberships: number;
};

export type JoinOutcome =
  | { ok: true; status: "active" | "pending" }
  | { ok: false; reason: "age" | "banned" | "invite_only" | "limit" | "already" };

/** What happens when someone tries to join. Invite links always skip approval. */
export function joinOutcome(c: JoinContext): JoinOutcome {
  if (!c.ageConfirmed) return { ok: false, reason: "age" };
  if (c.existing === "banned") return { ok: false, reason: "banned" };
  if (c.existing === "active") return { ok: false, reason: "already" };
  if (c.visibility === "private" && !c.codeValid) return { ok: false, reason: "invite_only" };
  const unlimited = c.admin || c.plan === "premium";
  if (!unlimited && c.activeMemberships >= FREE_GROUP_LIMIT) return { ok: false, reason: "limit" };
  if (c.visibility === "request" && !c.codeValid) return { ok: true, status: "pending" };
  return { ok: true, status: "active" };
}

export const JOIN_MESSAGES: Record<Exclude<JoinOutcome, { ok: true }>["reason"], string> = {
  age: "Groups are for people 18 and over.",
  banned: "You can't join this group.",
  invite_only: "This group is invite-only. Ask a member for the link.",
  limit: `The free plan includes ${FREE_GROUP_LIMIT} groups. Leave one or go Pro for unlimited groups.`,
  already: "You're already a member.",
};

/** True if `times` (ISO strings, newest first is fine) already hit the limit inside the window. */
export function rateLimited(times: string[], limit: { count: number; windowMs: number }, now: number) {
  return times.filter((t) => now - Date.parse(t) < limit.windowMs).length >= limit.count;
}

/** URL-safe slug from a group name, e.g. "Med School Finals!" -> "med-school-finals". */
export function slugify(name: string) {
  const s = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return s.length >= 3 ? s : `group-${s}`.replace(/-+$/, "");
}
