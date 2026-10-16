/** Who may join or host a room. Pure, so the rules are unit tested (tests/unit/room-access.test.ts). */

/** A participant counts as "in the room" if their app checked in within this window. */
export const PRESENCE_WINDOW_MS = 90_000;
/** Private rooms a Pro member can host at once. */
export const MAX_HOSTED_ROOMS = 3;
/** Free members can try one room before upgrading. */
export const FREE_TRIAL_ROOMS = 1;

export type JoinCheck = {
  ageConfirmed: boolean;
  plan: string;
  admin: boolean;
  removed: boolean;
  /** Already a participant (rejoining doesn't use up the trial or need a free seat check twice). */
  alreadyMember: boolean;
  /** Other rooms this person has joined before. */
  otherRoomsJoined: number;
  liveCount: number;
  capacity: number;
  isHost: boolean;
  /** Group rooms are part of the group: members join them freely, without using the trial room. */
  groupRoom?: boolean;
};

export type JoinDenied = "age" | "removed" | "trial_used" | "full";

export function joinDenial(c: JoinCheck): JoinDenied | null {
  if (!c.ageConfirmed) return "age";
  if (c.removed) return "removed";
  const unlimited = c.admin || c.plan === "premium" || c.isHost || !!c.groupRoom;
  if (!unlimited && !c.alreadyMember && c.otherRoomsJoined >= FREE_TRIAL_ROOMS) return "trial_used";
  if (!c.admin && !c.isHost && c.liveCount >= c.capacity) return "full";
  return null;
}

export const DENIAL_MESSAGES: Record<JoinDenied, string> = {
  age: "Rooms are for people 18 and over.",
  removed: "You can't rejoin this room.",
  trial_used: "Your free plan includes one trial room. Go Pro to join any room.",
  full: "This room is full right now. Try again in a little while.",
};

export function canHostPrivate(plan: string, admin: boolean) {
  return admin || plan === "premium";
}

/** 32-bit numeric id for Agora, derived from the user id so everyone can map media to a person. */
export function agoraUid(userId: string) {
  let h = 2166136261;
  for (const ch of userId.replace(/-/g, "")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  // Agora uids are 1..2^32-1.
  return h >>> 0 || 1;
}

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
export function inviteCode(random: (n: number) => Uint8Array) {
  return Array.from(random(10), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "··";
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
