/** Who may join or host a room. Pure, so the rules are unit tested (tests/unit/room-access.test.ts). */

/** A participant counts as "in the room" if their app checked in within this window. */
export const PRESENCE_WINDOW_MS = 90_000;
export type RoomLimits = {
  /** Rooms (including group sessions) a person can create per day; null = unlimited. */
  createsPerDay: number | null;
  /** Different rooms a person can join per day; null = unlimited. */
  joinsPerDay: number | null;
};

/** Pro members and admins are unlimited; free members get the admin-configured daily allowances. */
export function roomLimits(
  free: { createsPerDay: number | null; joinsPerDay: number | null },
  plan: string,
  admin: boolean,
): RoomLimits {
  if (admin || plan === "premium") return { createsPerDay: null, joinsPerDay: null };
  return free;
}

export type JoinCheck = {
  ageConfirmed: boolean;
  admin: boolean;
  removed: boolean;
  /** Different rooms joined today, not counting this one. */
  joinedToday: number;
  /** Already joined this room today (rejoining doesn't count again). */
  alreadyJoinedToday: boolean;
  joinsPerDay: number | null;
  liveCount: number;
  capacity: number;
  isHost: boolean;
};

export type JoinDenied = "age" | "removed" | "daily_joins" | "full";

export function joinDenial(c: JoinCheck): JoinDenied | null {
  if (!c.ageConfirmed) return "age";
  if (c.removed) return "removed";
  if (!c.isHost && !c.alreadyJoinedToday && c.joinsPerDay !== null && c.joinedToday >= c.joinsPerDay)
    return "daily_joins";
  if (!c.admin && !c.isHost && c.liveCount >= c.capacity) return "full";
  return null;
}

export type CreateDenied = "age" | "daily_creates";

export function createDenial(c: {
  ageConfirmed: boolean;
  createdToday: number;
  createsPerDay: number | null;
}): CreateDenied | null {
  if (!c.ageConfirmed) return "age";
  if (c.createsPerDay !== null && c.createdToday >= c.createsPerDay) return "daily_creates";
  return null;
}

export function denialMessage(d: JoinDenied | CreateDenied, limits?: RoomLimits) {
  switch (d) {
    case "age":
      return "Rooms are for people 18 and over.";
    case "removed":
      return "You can't rejoin this room.";
    case "full":
      return "This room is full right now. Try again in a little while.";
    case "daily_joins":
      return `You've joined ${limits?.joinsPerDay ?? "your"} rooms today, the free plan's daily limit. Go Pro for unlimited rooms, or come back tomorrow.`;
    case "daily_creates":
      return `You've created ${limits?.createsPerDay ?? "your"} rooms today, the free plan's daily limit. Go Pro to create as many as you like.`;
  }
}

/** "3 of 10 left today" style summary for the UI; null when unlimited. */
export function remaining(limit: number | null, used: number) {
  return limit === null ? null : Math.max(0, limit - used);
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
