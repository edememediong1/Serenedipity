import { describe, expect, it } from "vitest";
import { waitlistServerSchema } from "@/lib/validation/waitlist";

describe("waitlist schema", () => {
  it("accepts a valid email and fills defaults", () => {
    const r = waitlistServerSchema.parse({ email: "  Ada@Example.com ", utm_source: "" });
    expect(r.email).toBe("Ada@Example.com");
    expect(r.source).toBe("landing");
    expect(r.utm_source).toBeUndefined();
    expect(r.company).toBe("");
  });

  it("rejects empty and malformed emails with kind messages", () => {
    expect(waitlistServerSchema.safeParse({ email: "" }).error?.issues[0].message).toMatch(/Add your email/);
    expect(waitlistServerSchema.safeParse({ email: "nope" }).error?.issues[0].message).toMatch(
      /doesn't look/,
    );
  });

  it("caps UTM length", () => {
    expect(waitlistServerSchema.safeParse({ email: "a@b.co", utm_campaign: "x".repeat(200) }).success).toBe(
      false,
    );
  });
});
