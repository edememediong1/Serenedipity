import { Suspense } from "react";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminHeader, AdminSkeleton } from "@/components/admin/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { listAllGroups } from "@/lib/admin/rooms";
import { TOPICS, type Topic } from "@/lib/groups/rules";
import { setGroupStatus } from "../rooms/actions";

export const metadata = { title: "Study groups" };

async function Groups() {
  const groups = await listAllGroups();
  if (!groups.length) return <p className="text-ink-muted">No groups yet.</p>;
  return (
    <GlassCard padding="none" className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left type-body-sm">
        <thead className="text-ink-muted">
          <tr className="border-b border-line">
            <th scope="col" className="px-4 py-3 font-semibold">
              Group
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Owner
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Members
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3">
                <a
                  href={`/app/groups/${g.slug}`}
                  className="block text-ink underline-offset-2 focus-ring hover:underline"
                >
                  {g.name}
                </a>
                <span className="block text-ink-muted">
                  {TOPICS[g.topic as Topic] ?? g.topic} · {g.visibility}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-muted">{g.owner ? g.owner.name || g.owner.email : "None"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{g.member_count}</td>
              <td className="px-4 py-3">{g.status === "frozen" ? "Paused" : "Active"}</td>
              <td className="px-4 py-3 text-right">
                <span className="inline-flex flex-wrap justify-end gap-2">
                  <AdminActionButton
                    run={setGroupStatus.bind(null, {
                      groupId: g.id,
                      status: g.status === "frozen" ? "active" : "frozen",
                    })}
                    label={g.status === "frozen" ? "Restore" : "Pause"}
                    variant="ghost"
                  />
                  <AdminActionButton
                    run={setGroupStatus.bind(null, { groupId: g.id, status: "deleted" })}
                    label="Delete"
                    variant="ghost"
                    confirm={`Delete "${g.name}" for everyone? Its posts and rooms will be gone.`}
                  />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
}

export default function AdminGroupsPage() {
  return (
    <>
      <AdminHeader
        eyebrow="Community"
        title={
          <>
            Study <em>groups</em>
          </>
        }
      />
      <p className="mb-6 max-w-2xl text-ink-muted">
        Paused groups stay readable to members, but nobody can post. Reports about group posts and comments
        arrive in Safety reports, and each group&apos;s moderators see their own.
      </p>
      <Suspense fallback={<AdminSkeleton />}>
        <Groups />
      </Suspense>
    </>
  );
}
