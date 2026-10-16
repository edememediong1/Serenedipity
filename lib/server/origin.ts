import "server-only";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/config";

/** The origin the request came in on (handles Vercel previews), falling back to SITE_URL. */
export async function getRequestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return SITE_URL;
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
