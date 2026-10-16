import { Suspense } from "react";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminHeader, AdminSkeleton } from "@/components/admin/page-header";
import { RoomForm } from "@/components/rooms/room-form";
import { GlassCard } from "@/components/ui/glass-card";
import { listAllRooms } from "@/lib/admin/rooms";
import { requireAdmin } from "@/lib/auth/admin";
import { describeSchedule, roomPhase } from "@/lib/rooms/schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { archiveRoom, createPublicRoom } from "./actions";

export const metadata = { title: "Focus rooms" };

async function Rooms() {
  const rooms = await listAllRooms();
  const now = new Date().getTime();
  return (
    <GlassCard padding="none" className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left type-body-sm">
        <thead className="text-ink-muted">
          <tr className="border-b border-line">
            <th scope="col" className="px-4 py-3 font-semibold">
              Room
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Schedule (UTC)
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Now
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Here
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((r) => {
            const p = roomPhase(r, now);
            return (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <span className="block text-ink">{r.title}</span>
                  <span className="block text-ink-muted">
                    {r.visibility === "private" ? "Private · hosted by a member" : "Public · team"}
                    {r.track ? ` · ${r.track.title}` : ""}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {describeSchedule(r, "UTC")} · {r.session_minutes} min ({r.focus_minutes}/{r.break_minutes})
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {p.live
                    ? p.phase === "focus"
                      ? "Focus block"
                      : "Break"
                    : p.nextStart
                      ? "Waiting"
                      : "Finished"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.liveCount}/{r.capacity}
                </td>
                <td className="px-4 py-3 text-right">
                  <AdminActionButton
                    run={archiveRoom.bind(null, r.id)}
                    label="Archive"
                    variant="ghost"
                    confirm={`Archive "${r.title}"? People in it will see it close.`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </GlassCard>
  );
}

async function NewRoom() {
  await requireAdmin();
  const { data: tracks } = await createAdminClient()
    .from("tracks")
    .select("id, title")
    .eq("status", "published")
    .order("title");
  return <RoomForm action={createPublicRoom} tracks={tracks ?? []} mode="public" />;
}

export default function AdminRoomsPage() {
  return (
    <>
      <AdminHeader
        eyebrow="Focus rooms"
        title={
          <>
            Rooms <em>on the schedule</em>
          </>
        }
      />
      <div className="flex flex-col gap-10">
        <Suspense fallback={<AdminSkeleton />}>
          <Rooms />
        </Suspense>
        <section aria-labelledby="new-room" className="flex max-w-2xl flex-col gap-4">
          <h2 id="new-room" className="type-h2">
            Schedule a public room
          </h2>
          <GlassCard className="p-5 md:p-6">
            <Suspense fallback={<AdminSkeleton />}>
              <NewRoom />
            </Suspense>
          </GlassCard>
        </section>
      </div>
    </>
  );
}
