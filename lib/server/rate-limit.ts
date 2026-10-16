import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export async function getClientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

/** Salted SHA-256 so raw IPs are never stored. */
export function hashKey(value: string) {
  const salt = process.env.RATE_LIMIT_SALT ?? "";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}
