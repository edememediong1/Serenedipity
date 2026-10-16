import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { GlowBackground } from "@/components/brand/glow-background";
import { JoinInvite } from "@/components/rooms/join-invite";
import { GlassCard } from "@/components/ui/glass-card";
import { getSessionProfile } from "@/lib/auth/session";
import { getRoomByInvite } from "@/lib/rooms/data";
import { describeSchedule } from "@/lib/rooms/schedule";

export const metadata: Metadata = { title: "Join a room", robots: { index: false } };

async function Invite({ params }: { params: PageProps<"/app/rooms/join/[code]">["params"] }) {
  const { code } = await params;
  const { user, profile, supabase } = await getSessionProfile();
  const room = await getRoomByInvite(code);
  if (!room) notFound();
  const { data: me } = await supabase
    .from("room_participants")
    .select("removed")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (me && !me.removed) redirect(`/app/rooms/${room.id}`);
  return (
    <GlassCard className="flex flex-col gap-4 p-6 md:p-8">
      <p className="type-body-sm text-ink-muted">You&apos;re invited to a private room</p>
      <h1 className="type-h1">{room.title}</h1>
      {room.description ? <p className="text-ink-muted">{room.description}</p> : null}
      <p className="type-body-sm text-ink-muted">
        {describeSchedule(room, profile.timezone)} · {room.focus_minutes} on, {room.break_minutes} off
        {room.track ? ` · ${room.track.title}` : ""}
      </p>
      {me?.removed ? (
        <p className="text-orange">You can&apos;t rejoin this room.</p>
      ) : (
        <JoinInvite roomId={room.id} code={code} />
      )}
      <Link href="/app/rooms" className="w-fit rounded-sm type-body-sm text-ink-muted underline focus-ring">
        See all rooms
      </Link>
    </GlassCard>
  );
}

export default function JoinPage({ params }: PageProps<"/app/rooms/join/[code]">) {
  return (
    <>
      <GlowBackground mood="rooms" />
      <div className="mx-auto max-w-xl animate-rise-in pt-4">
        <Suspense
          fallback={
            <div role="status" aria-label="Loading invite" className="h-72 rounded-lg bg-surface-deep/60" />
          }
        >
          <Invite params={params} />
        </Suspense>
      </div>
    </>
  );
}
