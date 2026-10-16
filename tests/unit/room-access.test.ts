import { describe, expect, it } from "vitest";
import { agoraUid, initials, inviteCode, joinDenial, type JoinCheck } from "@/lib/rooms/access";

const base: JoinCheck = {
  ageConfirmed: true,
  plan: "free",
  admin: false,
  removed: false,
  alreadyMember: false,
  otherRoomsJoined: 0,
  liveCount: 3,
  capacity: 20,
  isHost: false,
};

describe("room access", () => {
  it("lets a free member try one room", () => {
    expect(joinDenial(base)).toBeNull();
    expect(joinDenial({ ...base, otherRoomsJoined: 1 })).toBe("trial_used");
    expect(joinDenial({ ...base, otherRoomsJoined: 1, alreadyMember: true })).toBeNull();
    expect(joinDenial({ ...base, otherRoomsJoined: 4, plan: "premium" })).toBeNull();
    expect(joinDenial({ ...base, otherRoomsJoined: 4, admin: true })).toBeNull();
  });

  it("enforces 18+, removals and capacity", () => {
    expect(joinDenial({ ...base, ageConfirmed: false })).toBe("age");
    expect(joinDenial({ ...base, removed: true, admin: true })).toBe("removed");
    expect(joinDenial({ ...base, liveCount: 20 })).toBe("full");
    expect(joinDenial({ ...base, liveCount: 20, admin: true })).toBeNull();
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
