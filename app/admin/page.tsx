import { Suspense } from "react";
import { AdminHeader, AdminSkeleton } from "@/components/admin/page-header";
import { BarChart } from "@/components/ui/bar-chart";
import { GlassCard } from "@/components/ui/glass-card";
import { StatTile } from "@/components/ui/stat-tile";
import { getOverview } from "@/lib/admin/data";

export const metadata = { title: "Overview" };

const short = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const pct = (a: number, b: number) => (b === 0 ? "0%" : `${Math.round((a / b) * 100)}%`);

async function OverviewContent() {
  const o = await getOverview();
  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Users" value={o.users} hint={`${o.newUsers7d} new this week`} />
        <StatTile
          label="Finished onboarding"
          value={pct(o.onboarded, o.users)}
          hint={`${o.onboarded} people`}
        />
        <StatTile label="Pro subscribers" value={o.pro} hint={`${pct(o.pro, o.users)} of users`} />
        <StatTile label="Waitlist" value={o.waitlist} />
        <StatTile label="Check-ins today" value={o.checkinsToday} hint={`${o.checkins7d} in 7 days`} />
        <StatTile label="Focus minutes (7 days)" value={o.focusMinutes7d.toLocaleString()} />
        <StatTile label="Blocks completed (7 days)" value={o.blocks7d} />
        <StatTile
          label="Safety flags (7 days)"
          value={o.safetyFlags7d}
          hint="Counts only. Conversations stay private."
        />
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        {(
          [
            ["New sign-ups", "signups"],
            ["Check-ins", "checkins"],
            ["Completed focus blocks", "blocks"],
          ] as const
        ).map(([title, key]) => (
          <GlassCard key={key} className="flex flex-col gap-4">
            <h2 className="type-h3">
              {title} <span className="type-body-sm font-normal text-ink-muted">· last 14 days</span>
            </h2>
            <BarChart
              title={`${title}, last 14 days`}
              data={o.daily.map((d, i) => ({
                label: i % 4 === 1 ? short(d.date) : "",
                value: d[key],
                display: `${short(d.date)}: ${d[key]}`,
              }))}
              height={120}
            />
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <>
      <AdminHeader
        eyebrow="Admin"
        title={
          <>
            Product <em>health</em>
          </>
        }
      />
      <Suspense fallback={<AdminSkeleton />}>
        <OverviewContent />
      </Suspense>
    </>
  );
}
