import { Download } from "lucide-react";
import { Suspense } from "react";
import { AdminHeader, AdminSkeleton } from "@/components/admin/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { listWaitlist } from "@/lib/admin/data";

export const metadata = { title: "Waitlist" };

async function WaitlistTable() {
  const rows = await listWaitlist();
  return (
    <div className="flex flex-col gap-4">
      <p className="type-body-sm text-ink-muted">{rows.length} people on the waitlist</p>
      <GlassCard padding="none" className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left type-body-sm">
          <thead className="text-ink-muted">
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-3 font-semibold">
                Email
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Source
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Campaign
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {[r.utm_source, r.utm_medium].filter(Boolean).join(" / ") || r.source || "—"}
                </td>
                <td className="px-4 py-3 text-ink-muted">{r.utm_campaign || "—"}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {new Date(r.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}

export default function AdminWaitlistPage() {
  return (
    <>
      <AdminHeader
        eyebrow="Admin"
        title={
          <>
            The <em>waitlist</em>
          </>
        }
      >
        <a
          href="/admin/waitlist/export"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface-glass px-4 type-body-sm font-semibold focus-ring"
        >
          <Download className="size-4 stroke-[1.5]" aria-hidden="true" /> Download CSV
        </a>
      </AdminHeader>
      <Suspense fallback={<AdminSkeleton />}>
        <WaitlistTable />
      </Suspense>
    </>
  );
}
