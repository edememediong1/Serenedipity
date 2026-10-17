import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { GlowBackground } from "@/components/brand/glow-background";
import { RoomForm } from "@/components/rooms/room-form";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { isAdmin } from "@/lib/auth/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { roomAllowance } from "@/lib/rooms/allowance";
import { listTracks } from "@/lib/rooms/data";
import { createPrivateRoom } from "../actions";

export const metadata: Metadata = { title: "Host a room" };

async function NewRoom() {
  const { user, profile } = await getSessionProfile();
  const allowance = await roomAllowance(user.id, profile, isAdmin(profile, user.email));
  if (allowance.createsLeft === 0)
    return (
      <GlassCard className="flex flex-col gap-4 p-6">
        <p>
          You&apos;ve created {allowance.limits.createsPerDay} rooms today, the free plan&apos;s daily limit.
          Go Pro to create as many as you like, or come back tomorrow.
        </p>
        <Button asChild className="w-fit">
          <Link href="/app/upgrade">See Pro</Link>
        </Button>
      </GlassCard>
    );
  const tracks = await listTracks();
  return (
    <GlassCard className="flex flex-col gap-5 p-5 md:p-8">
      {allowance.createsLeft !== null ? (
        <p className="type-body-sm text-ink-muted">
          Free plan: {allowance.createsLeft} of {allowance.limits.createsPerDay} rooms left to create today.
        </p>
      ) : null}
      <RoomForm action={createPrivateRoom} tracks={tracks} mode="private" />
    </GlassCard>
  );
}

export default function NewRoomPage() {
  return (
    <>
      <GlowBackground mood="rooms" />
      <div className="mx-auto flex max-w-2xl animate-rise-in flex-col gap-6">
        <Link
          href="/app/rooms"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-sm type-body-sm text-ink-muted focus-ring hover:text-ink"
        >
          <ArrowLeft className="size-4 stroke-[1.5]" aria-hidden="true" /> All rooms
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="type-h1 md:text-[48px] md:leading-[52px]">
            Host a <em>room</em>
          </h1>
          <p className="text-ink-muted">
            A private room for your people. Only those with the invite link can join.
          </p>
        </div>
        <Suspense
          fallback={<div role="status" aria-label="Loading" className="h-96 rounded-lg bg-surface-deep/60" />}
        >
          <NewRoom />
        </Suspense>
      </div>
    </>
  );
}
