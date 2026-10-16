import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GlowBackground } from "@/components/brand/glow-background";
import { RoomView } from "@/components/rooms/room-view";
import { getSessionProfile } from "@/lib/auth/session";
import { getRoom } from "@/lib/rooms/data";
import { mediaConfigured } from "@/lib/rooms/media";

export const metadata: Metadata = { title: "Focus room" };

async function RoomLoader({ params }: { params: PageProps<"/app/rooms/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getRoom(id);
  if (!data) notFound();
  const { room, profile, removed, userId } = data;

  const { supabase } = await getSessionProfile();
  const [{ data: blocks }, { data: plan }] = await Promise.all([
    supabase.from("blocks").select("blocked_id").eq("blocker_id", userId),
    supabase
      .from("plans")
      .select("id, tasks(title, status, position)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const task = (plan?.tasks ?? [])
    .filter((t) => t.status === "todo")
    .sort((a, b) => a.position - b.position)[0];

  return (
    <RoomView
      room={room}
      me={{ id: userId, name: profile.display_name?.trim() || "Someone" }}
      mediaEnabled={mediaConfigured()}
      initialBlocked={(blocks ?? []).map((b) => b.blocked_id)}
      taskTitle={task?.title ?? null}
      timezone={profile.timezone}
      removed={removed}
    />
  );
}

export default function RoomPage({ params }: PageProps<"/app/rooms/[id]">) {
  return (
    <>
      <GlowBackground mood="rooms" />
      <div className="animate-rise-in">
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading the room"
              className="mx-auto flex max-w-3xl flex-col gap-5"
            >
              <div className="h-12 w-2/3 rounded-sm bg-surface-deep" />
              <div className="h-32 rounded-lg bg-surface-deep/60" />
            </div>
          }
        >
          <RoomLoader params={params} />
        </Suspense>
      </div>
    </>
  );
}
