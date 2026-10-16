import Link from "next/link";
import { Suspense } from "react";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminHeader, AdminSkeleton } from "@/components/admin/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { listReports } from "@/lib/admin/rooms";
import { REPORT_REASONS } from "@/lib/rooms/validation";
import { cn } from "@/lib/utils";
import { resolveReport } from "../rooms/actions";

export const metadata = { title: "Safety reports" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";

async function Reports({ searchParams }: { searchParams: PageProps<"/admin/reports">["searchParams"] }) {
  const status = (await searchParams).status === "closed" ? "closed" : "open";
  const reports = await listReports(status);
  const tab = (value: "open" | "closed", label: string) => (
    <Link
      href={value === "open" ? "/admin/reports" : "/admin/reports?status=closed"}
      aria-current={status === value ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-pill px-4 type-body-sm focus-ring",
        status === value ? "bg-white/[0.1] text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
  const name = (p: { name: string | null; email: string | null }) => p.name || p.email || "Unknown";
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Report status" className="flex gap-2">
        {tab("open", "Open")}
        {tab("closed", "Closed")}
      </nav>
      {reports.length === 0 ? (
        <p className="text-ink-muted">
          {status === "open" ? "No open reports. All calm." : "No closed reports yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => (
            <li key={r.id}>
              <GlassCard className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="type-h3">
                    {REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS] ?? r.reason}
                  </h2>
                  <span className="type-body-sm text-ink-muted">{when(r.created_at)}</span>
                </div>
                <dl className="grid gap-x-6 gap-y-1 type-body-sm sm:grid-cols-[auto_1fr]">
                  <dt className="text-ink-muted">Reported</dt>
                  <dd>
                    {name(r.reported)}{" "}
                    {r.reported.email && r.reported.name ? (
                      <span className="text-ink-muted">({r.reported.email})</span>
                    ) : null}
                    {r.reportsAgainst > 1 ? (
                      <span className="text-orange"> · {r.reportsAgainst} reports in total</span>
                    ) : null}
                  </dd>
                  <dt className="text-ink-muted">By</dt>
                  <dd>{name(r.reporter)}</dd>
                  <dt className="text-ink-muted">Where</dt>
                  <dd>
                    {r.group
                      ? `Group: ${r.group.name}${r.post_id ? " (post)" : r.comment_id ? " (comment)" : ""}`
                      : (r.room?.title ?? "Room closed")}
                  </dd>
                  {r.content ? (
                    <>
                      <dt className="text-ink-muted">Content</dt>
                      <dd className="whitespace-pre-wrap">{r.content}</dd>
                    </>
                  ) : null}
                  {r.details ? (
                    <>
                      <dt className="text-ink-muted">Details</dt>
                      <dd className="whitespace-pre-wrap">{r.details}</dd>
                    </>
                  ) : null}
                  {status === "closed" ? (
                    <>
                      <dt className="text-ink-muted">Outcome</dt>
                      <dd>
                        {r.status === "actioned"
                          ? r.group
                            ? "Action taken"
                            : "Removed from the room"
                          : "Dismissed"}
                      </dd>
                    </>
                  ) : null}
                </dl>
                {status === "open" ? (
                  <div className="flex flex-wrap gap-2">
                    {r.post_id || r.comment_id ? (
                      <AdminActionButton
                        run={resolveReport.bind(null, { reportId: r.id, action: "remove_content" })}
                        label={`Remove ${r.post_id ? "post" : "comment"}`}
                        variant="primary"
                      />
                    ) : null}
                    {r.room_id ? (
                      <AdminActionButton
                        run={resolveReport.bind(null, { reportId: r.id, action: "remove" })}
                        label="Remove from room"
                        variant="primary"
                        confirm={`Remove ${name(r.reported)} from ${r.room?.title ?? "the room"}? They can't rejoin it.`}
                      />
                    ) : null}
                    <AdminActionButton
                      run={resolveReport.bind(null, { reportId: r.id, action: "dismiss" })}
                      label="Dismiss"
                      variant="ghost"
                    />
                  </div>
                ) : null}
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  return (
    <>
      <AdminHeader
        eyebrow="Safety"
        title={
          <>
            Reports <em>to review</em>
          </>
        }
      />
      <Suspense fallback={<AdminSkeleton />}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </>
  );
}
