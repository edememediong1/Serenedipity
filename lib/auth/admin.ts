import "server-only";
import { notFound } from "next/navigation";
import { getSessionProfile, type Profile } from "./session";

/** Comma-separated emails that are always admins (handy before anyone has the admin role). */
function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(profile: Pick<Profile, "role">, email: string | null) {
  return profile.role === "admin" || (!!email && adminEmails().includes(email.toLowerCase()));
}

/** For admin pages and actions: 404 for everyone else, so the admin area isn't advertised. */
export async function requireAdmin() {
  const session = await getSessionProfile();
  if (!isAdmin(session.profile, session.user.email)) notFound();
  return session;
}
