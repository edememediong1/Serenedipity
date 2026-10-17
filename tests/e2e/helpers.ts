import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import type { Database } from "@/lib/supabase/database.types";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("E2E needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * Signs a new (or existing) user in through the real /auth/callback route using an admin-generated
 * magic-link token, the same path a user's email link takes.
 */
export async function signInAs(page: Page, email = uniqueEmail(), next = "/app") {
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const tokenHash = data.properties.hashed_token;
  await page.goto(`/auth/callback?token_hash=${tokenHash}&type=email&next=${encodeURIComponent(next)}`);
  return { email, userId: data.user.id };
}

export async function getProfile(userId: string) {
  const { data, error } = await admin().from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function completeOnboarding(userId: string, displayName = "Ada") {
  const now = new Date().toISOString();
  const { error } = await admin()
    .from("profiles")
    .update({
      display_name: displayName,
      age_confirmed: true,
      age_confirmed_at: now,
      ai_guide_consent: true,
      ai_guide_consent_at: now,
      onboarding_step: 6,
      onboarding_completed_at: now,
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function setProfile(userId: string, patch: Database["public"]["Tables"]["profiles"]["Update"]) {
  const { error } = await admin().from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function setSetting(
  key: "free_daily_checkins" | "premium_daily_checkins" | "luna_enabled",
  value: number | boolean | string,
) {
  const { error } = await admin().from("app_settings").upsert({ key, value });
  if (error) throw error;
}

/** Inserts a plan with tasks and focus blocks dated `daysAgo` days back (UTC). */
export async function seedDay(
  userId: string,
  daysAgo: number,
  tasks: { title: string; status: "todo" | "done" | "skipped" }[],
  blocks = 2,
) {
  const at = (h: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - daysAgo);
    d.setUTCHours(h, 0, 0, 0);
    return d.toISOString();
  };
  const db = admin();
  const { data: plan, error } = await db
    .from("plans")
    .insert({ user_id: userId, created_at: at(8), status: "completed" })
    .select("id")
    .single();
  if (error || !plan) throw error;
  await db.from("tasks").insert(
    tasks.map((t, i) => ({
      ...t,
      plan_id: plan.id,
      user_id: userId,
      estimate_minutes: 25,
      position: i,
      created_at: at(8),
    })),
  );
  await db.from("focus_blocks").insert(
    Array.from({ length: blocks }, (_, i) => ({
      user_id: userId,
      task_title: tasks[i % tasks.length]?.title ?? "Focus",
      planned_minutes: 25,
      started_at: at(9 + i),
      focused_seconds: 25 * 60,
      completed: true,
      outcome: "done",
      technique: "pomodoro",
    })),
  );
}

/** A one-off public room whose session started `minutesAgo` minutes ago (25 on / 5 off, 55 minutes). */
export async function createRoom(
  minutesAgo: number,
  patch: Database["public"]["Tables"]["rooms"]["Insert"] | object = {},
) {
  const db = admin();
  const { data: track } = await db.from("tracks").select("id").eq("slug", "glass-hours").single();
  const { data, error } = await db
    .from("rooms")
    .insert({
      title: `Test room ${Math.random().toString(36).slice(2, 6)}`,
      schedule: "once",
      starts_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
      session_minutes: 55,
      focus_minutes: 25,
      break_minutes: 5,
      track_id: track?.id ?? null,
      ...patch,
    })
    .select("id, title")
    .single();
  if (error) throw error;
  return data;
}

export async function participant(roomId: string, userId: string) {
  const { data } = await admin()
    .from("room_participants")
    .select("removed, left_at")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function archiveRoomForTest(roomId: string) {
  await admin().from("rooms").update({ status: "archived" }).eq("id", roomId);
}

export async function isBlocked(blocker: string, blocked: string) {
  const { data } = await admin()
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", blocker)
    .eq("blocked_id", blocked)
    .maybeSingle();
  return !!data;
}

/** Completed 25-minute focus blocks on the given days (0 = today, UTC noon). */
export async function seedBlocks(userId: string, daysAgo: number[]) {
  const rows = daysAgo.map((n) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - n);
    d.setUTCHours(n === 0 ? Math.min(new Date().getUTCHours(), 12) : 12, 0, 0, 0);
    return {
      user_id: userId,
      planned_minutes: 25,
      started_at: d.toISOString(),
      ended_at: d.toISOString(),
      focused_seconds: 1500,
      completed: true,
      outcome: "done",
    };
  });
  const { error } = await admin().from("focus_blocks").insert(rows);
  if (error) throw error;
}

/**
 * A Supabase client signed in as this user with the public key, for checking what row-level
 * security lets a real user read or write directly.
 */
export async function userClient(userId: string) {
  const password = `pw-${crypto.randomUUID()}`;
  const { data: u, error } = await admin().auth.admin.updateUserById(userId, { password });
  if (error) throw error;
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { error: signInError } = await client.auth.signInWithPassword({ email: u.user.email!, password });
  if (signInError) throw signInError;
  return client;
}

export async function groupBySlug(slug: string) {
  const { data } = await admin().from("groups").select("id, invite_code, status").eq("slug", slug).single();
  return data!;
}

export async function memberStatus(groupId: string, userId: string) {
  const { data } = await admin()
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/** Backdates a membership so link-posting (blocked for a member's first day) is allowed. */
export async function backdateMembership(groupId: string, userId: string) {
  await admin()
    .from("group_members")
    .update({ joined_at: new Date(Date.now() - 2 * 86400_000).toISOString() })
    .eq("group_id", groupId)
    .eq("user_id", userId);
}

/** The first finished block of the day opens the streak celebration; close it to carry on. */
export async function dismissCelebration(page: Page) {
  const dialog = page.getByRole("dialog", { name: /streak|Day one/ });
  await dialog.getByRole("button", { name: "Keep going" }).click();
  await dialog.waitFor({ state: "hidden" });
}

/** Marks `n` different rooms as joined today (UTC) for this user, as if they'd been in them. */
export async function seedRoomJoins(userId: string, n: number) {
  const db = admin();
  const { data: rooms, error } = await db
    .from("rooms")
    .insert(
      Array.from({ length: n }, (_, i) => ({
        title: `Seeded room ${i + 1}`,
        schedule: "once",
        starts_at: new Date(Date.now() - 5 * 60_000).toISOString(),
        session_minutes: 55,
        focus_minutes: 25,
        break_minutes: 5,
        status: "archived",
      })),
    )
    .select("id");
  if (error) throw error;
  const today = new Date().toISOString().slice(0, 10);
  const { error: joinError } = await db
    .from("room_joins")
    .insert(rooms!.map((r) => ({ user_id: userId, room_id: r.id, joined_on: today })));
  if (joinError) throw joinError;
}
