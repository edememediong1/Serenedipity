import "server-only";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY = 86_400_000;
const isoDaysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

type CountFilter = { gte?: [string, string]; eq?: [string, string]; notNull?: string };

async function count(
  table: "profiles" | "checkins" | "focus_blocks" | "waitlist" | "safety_events" | "subscriptions",
  f: CountFilter = {},
) {
  let q = createAdminClient().from(table).select("*", { count: "exact", head: true });
  if (f.gte) q = q.gte(f.gte[0], f.gte[1]);
  if (f.eq) q = q.eq(f.eq[0], f.eq[1]);
  if (f.notNull) q = q.not(f.notNull, "is", null);
  const { count: c } = await q;
  return c ?? 0;
}

export type Overview = {
  users: number;
  newUsers7d: number;
  onboarded: number;
  pro: number;
  checkinsToday: number;
  checkins7d: number;
  focusMinutes7d: number;
  blocks7d: number;
  waitlist: number;
  safetyFlags7d: number;
  daily: { date: string; signups: number; checkins: number; blocks: number }[];
};

/** Product health at a glance (PRD 4.7). Never reads check-in content. */
export async function getOverview(): Promise<Overview> {
  await requireAdmin();
  const admin = createAdminClient();
  const since14 = isoDaysAgo(13).slice(0, 10);

  const [users, newUsers7d, onboarded, pro, checkinsToday, checkins7d, waitlist, safetyFlags7d] =
    await Promise.all([
      count("profiles"),
      count("profiles", { gte: ["created_at", isoDaysAgo(7)] }),
      count("profiles", { notNull: "onboarding_completed_at" }),
      count("profiles", { eq: ["plan", "premium"] }),
      count("checkins", { gte: ["created_at", new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()] }),
      count("checkins", { gte: ["created_at", isoDaysAgo(7)] }),
      count("waitlist"),
      count("safety_events", { gte: ["created_at", isoDaysAgo(7)] }),
    ]);

  const [{ data: blocks }, { data: signups }, { data: checkins }] = await Promise.all([
    admin
      .from("focus_blocks")
      .select("started_at, focused_seconds, completed")
      .gte("started_at", `${since14}T00:00:00Z`),
    admin.from("profiles").select("created_at").gte("created_at", `${since14}T00:00:00Z`),
    admin.from("checkins").select("created_at").gte("created_at", `${since14}T00:00:00Z`),
  ]);

  const days = Array.from({ length: 14 }, (_, i) =>
    new Date(Date.now() - (13 - i) * DAY).toISOString().slice(0, 10),
  );
  const daily = days.map((date) => ({
    date,
    signups: (signups ?? []).filter((r) => r.created_at.startsWith(date)).length,
    checkins: (checkins ?? []).filter((r) => r.created_at.startsWith(date)).length,
    blocks: (blocks ?? []).filter((r) => r.started_at.startsWith(date) && r.completed).length,
  }));
  const week = (blocks ?? []).filter((b) => b.started_at >= isoDaysAgo(7));

  return {
    users,
    newUsers7d,
    onboarded,
    pro,
    checkinsToday,
    checkins7d,
    focusMinutes7d: Math.round(week.reduce((s, b) => s + b.focused_seconds, 0) / 60),
    blocks7d: week.filter((b) => b.completed).length,
    waitlist,
    safetyFlags7d,
    daily,
  };
}

export type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  plan: string;
  role: string;
  onboarded: boolean;
  joined: string;
  lastSignIn: string | null;
  checkins7d: number;
  focusMinutes7d: number;
  subscription: string | null;
};

export async function listUsers(search: string): Promise<AdminUser[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  const authUsers = authData?.users ?? [];
  const needle = search.trim().toLowerCase();

  const [{ data: profiles }, { data: checkins }, { data: blocks }, { data: subs }] = await Promise.all([
    admin.from("profiles").select("id, display_name, plan, role, onboarding_completed_at, created_at"),
    admin.from("checkins").select("user_id").gte("created_at", isoDaysAgo(7)),
    admin.from("focus_blocks").select("user_id, focused_seconds").gte("started_at", isoDaysAgo(7)),
    admin.from("subscriptions").select("user_id, status"),
  ]);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  return authUsers
    .map((u) => {
      const p = byId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        name: p?.display_name ?? null,
        plan: p?.plan ?? "free",
        role: p?.role ?? "user",
        onboarded: !!p?.onboarding_completed_at,
        joined: p?.created_at ?? u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        checkins7d: (checkins ?? []).filter((c) => c.user_id === u.id).length,
        focusMinutes7d: Math.round(
          (blocks ?? []).filter((b) => b.user_id === u.id).reduce((s, b) => s + b.focused_seconds, 0) / 60,
        ),
        subscription: (subs ?? []).find((s) => s.user_id === u.id)?.status ?? null,
      };
    })
    .filter(
      (u) => !needle || u.email?.toLowerCase().includes(needle) || u.name?.toLowerCase().includes(needle),
    )
    .sort((a, b) => b.joined.localeCompare(a.joined));
}

export async function listWaitlist() {
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("waitlist")
    .select("email, source, utm_source, utm_medium, utm_campaign, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  return data ?? [];
}
