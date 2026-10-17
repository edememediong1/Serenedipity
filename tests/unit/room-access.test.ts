import { describe, expect, it } from "vitest";
import {
  agoraUid,
  createDenial,
  denialMessage,
  initials,
  inviteCode,
  joinDenial,
  remaining,
  roomLimits,
  type JoinCheck,
} from "@/lib/rooms/access";

const base: JoinCheck = {
  ageConfirmed: true,
  admin: false,
  removed: false,
  joinedToday: 0,
  alreadyJoinedToday: false,
  joinsPerDay: 10,
  liveCount: 3,
  capacity: 20,
  isHost: false,
};
const FREE = { createsPerDay: 2, joinsPerDay: 10 };

describe("room access", () => {
  it("free members get daily allowances; Pro and admins are unlimited", () => {
    expect(roomLimits(FREE, "free", false)).toEqual(FREE);
    expect(roomLimits(FREE, "premium", false)).toEqual({ createsPerDay: null, joinsPerDay: null });
    expect(roomLimits(FREE, "free", true)).toEqual({ createsPerDay: null, joinsPerDay: null });
  });

  it("limits different rooms joined per day; rejoining the same room is free", () => {
    expect(joinDenial({ ...base, joinedToday: 9 })).toBeNull();
    expect(joinDenial({ ...base, joinedToday: 10 })).toBe("daily_joins");
    expect(joinDenial({ ...base, joinedToday: 10, alreadyJoinedToday: true })).toBeNull();
    expect(joinDenial({ ...base, joinedToday: 50, joinsPerDay: null })).toBeNull();
    expect(joinDenial({ ...base, joinedToday: 10, isHost: true })).toBeNull();
  });

  it("enforces 18+, removals and capacity", () => {
    expect(joinDenial({ ...base, ageConfirmed: false })).toBe("age");
    expect(joinDenial({ ...base, removed: true, admin: true })).toBe("removed");
    expect(joinDenial({ ...base, liveCount: 20 })).toBe("full");
    expect(joinDenial({ ...base, liveCount: 20, admin: true })).toBeNull();
  });

  it("limits rooms created per day", () => {
    expect(createDenial({ ageConfirmed: true, createdToday: 1, createsPerDay: 2 })).toBeNull();
    expect(createDenial({ ageConfirmed: true, createdToday: 2, createsPerDay: 2 })).toBe("daily_creates");
    expect(createDenial({ ageConfirmed: true, createdToday: 40, createsPerDay: null })).toBeNull();
    expect(createDenial({ ageConfirmed: false, createdToday: 0, createsPerDay: null })).toBe("age");
    expect(denialMessage("daily_creates", FREE)).toContain("created 2 rooms today");
    expect(denialMessage("daily_joins", FREE)).toContain("joined 10 rooms today");
    expect(remaining(10, 3)).toBe(7);
    expect(remaining(null, 3)).toBeNull();
  });

  it("derives stable Agora ids and invite codes", () => {
    const id = "6f1c1b7e-2f43-4d8e-9a8b-0c2f9d7a1e55";
    expect(agoraUid(id)).toBe(agoraUid(id));
    expect(agoraUid(id)).toBeGreaterThan(0);
    expect(agoraUid(id)).toBeLessThan(2 ** 32);
    expect(inviteCode((n) => new Uint8Array(n).fill(3))).toMatch(/^[a-z0-9]{10}$/);
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials(null)).toBe("··");
  });
});
