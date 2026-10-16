import type { Metadata } from "next";
import { Suspense } from "react";
import { FocusTimer, type FocusPlan } from "@/components/focus/focus-timer";
import { GlowBackground } from "@/components/brand/glow-background";
import { getSessionProfile } from "@/lib/auth/session";
import type { TechniqueId } from "@/lib/timer/techniques";

export const metadata: Metadata = { title: "Focus" };

function formatDeadline(iso: string | null, tz: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || "UTC",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

async function FocusLoader({ searchParams }: { searchParams: PageProps<"/app/focus">["searchParams"] }) {
  const params = await searchParams;
  const { user, profile, supabase } = await getSessionProfile();
  const planParam = typeof params.plan === "string" ? params.plan : null;

  // The plan from the URL, else the latest active plan.
  let query = supabase.from("plans").select("id, deadline, status").eq("user_id", user.id);
  query = planParam
    ? query.eq("id", planParam)
    : query.eq("status", "active").order("created_at", { ascending: false });
  const { data: planRow } = await query.limit(1).maybeSingle();

  let plan: FocusPlan | null = null;
  if (planRow) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, estimate_minutes, status")
      .eq("plan_id", planRow.id)
      .order("position");
    if (tasks?.length) {
      plan = {
        id: planRow.id,
        deadlineLabel: formatDeadline(planRow.deadline, profile.timezone),
        tasks: tasks.map((t) => ({ ...t, status: t.status as "todo" | "done" | "skipped" })),
      };
    }
  }

  return (
    <FocusTimer
      plan={plan}
      startWithReset={params.reset === "1"}
      technique={(profile.focus_technique as TechniqueId) ?? "pomodoro"}
      laps={profile.focus_laps}
      custom={{
        focusMinutes: profile.default_focus_minutes,
        shortBreakMinutes: profile.default_break_minutes,
        longBreakMinutes: profile.long_break_minutes,
        longBreakEvery: profile.long_break_every,
      }}
    />
  );
}

export default function FocusPage({ searchParams }: PageProps<"/app/focus">) {
  return (
    <>
      <GlowBackground mood="focus" />
      <div className="animate-rise-in pt-2">
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading your timer"
              className="mx-auto flex max-w-xl flex-col items-center gap-6"
            >
              <div className="h-4 w-32 rounded-sm bg-surface-deep" />
              <div className="size-[300px] rounded-pill border-8 border-surface-deep" />
            </div>
          }
        >
          <FocusLoader searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
