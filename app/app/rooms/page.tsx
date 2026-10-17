import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { GlowBackground } from "@/components/brand/glow-background";
import { RoomCard } from "@/components/rooms/room-card";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";
import { canHostPrivate, FREE_TRIAL_ROOMS } from "@/lib/rooms/access";
import { listRooms } from "@/lib/rooms/data";
import { roomPhase } from "@/lib/rooms/schedule";

export const metadata: Metadata = { title: "Rooms" };

async function RoomsList() {
  const { rooms, profile, admin, joinedCount } = await listRooms();
  const now = new Date().getTime();
  const tz = profile.timezone;
  // One-off rooms that have finished drop off the list.
  const current = rooms.filter((r) => {
    const p = roomPhase(r, now);
    return p.live || p.nextStart !== null;
  });
  const team = current.filter((r) => r.visibility === "public");
  const live = team.filter((r) => roomPhase(r, now).live);
  const upcoming = team.filter((r) => !roomPhase(r, now).live);
  const mine = current.filter((r) => r.visibility === "private");
  const fromGroups = current.filter((r) => r.visibility === "group");
  const pro = profile.plan === "premium" || admin;
  const canHost = canHostPrivate(profile.plan, admin);

  const grid = (list: typeof rooms) => (
    <ul className="grid gap-4 sm:grid-cols-2">
      {list.map((r) => (
        <li key={r.id}>
          <RoomCard room={r} now={now} timezone={tz} />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-10">
      {!profile.age_confirmed ? (
        <GlassCard className="p-5" role="note">
          Rooms are for people 18 and over. Confirm your age in settings to join.
        </GlassCard>
      ) : null}
      {!pro ? (
        <GlassCard className="flex flex-wrap items-center gap-4 p-5">
          <p className="min-w-0 flex-1 text-ink-muted">
            {joinedCount >= FREE_TRIAL_ROOMS
              ? "You've used your free trial room. Pro opens every room and lets you host your own."
              : "Your free plan includes one trial room. Pro opens every room and lets you host your own."}
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link href="/app/upgrade">See Pro</Link>
          </Button>
        </GlassCard>
      ) : null}

      <section aria-labelledby="live-heading" className="flex flex-col gap-4">
        <h2 id="live-heading" className="type-h2">
          Live now
        </h2>
        {live.length ? (
          grid(live)
        ) : (
          <p className="text-ink-muted">Nothing live this minute. The next session is below.</p>
        )}
      </section>

      {upcoming.length ? (
        <section aria-labelledby="upcoming-heading" className="flex flex-col gap-4">
          <h2 id="upcoming-heading" className="type-h2">
            Coming up
          </h2>
          {grid(upcoming)}
        </section>
      ) : null}

      <section aria-labelledby="groups-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="groups-heading" className="type-h2">
            From your groups
          </h2>
          <Link
            href="/app/groups"
            className="inline-flex min-h-11 items-center rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
          >
            Study groups
          </Link>
        </div>
        {fromGroups.length ? (
          grid(fromGroups)
        ) : (
          <p className="text-ink-muted">
            Join a study group to focus in its rooms with people working toward the same thing.
          </p>
        )}
      </section>

      <section aria-labelledby="private-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="private-heading" className="type-h2">
            Private rooms
          </h2>
          {canHost ? (
            <Button asChild size="sm">
              <Link href="/app/rooms/new">
                <Plus aria-hidden="true" /> Host a room
              </Link>
            </Button>
          ) : null}
        </div>
        {mine.length ? (
          grid(mine)
        ) : (
          <p className="text-ink-muted">
            {canHost
              ? "Host a room for your study group or team. You'll get an invite link to share."
              : "Pro members can host private rooms and share an invite link."}
          </p>
        )}
      </section>
    </div>
  );
}

export default function RoomsPage() {
  return (
    <>
      <GlowBackground mood="rooms" />
      <div className="flex animate-rise-in flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Eyebrow>Focus rooms</Eyebrow>
          <h1 className="type-hero md:text-[60px] md:leading-[62px]">
            Focus <em>together</em>
          </h1>
          <p className="max-w-lg text-ink-muted md:text-base">
            Scheduled sessions with quiet company. Everyone hears the same music and works through the same
            blocks.
          </p>
        </div>
        <Suspense
          fallback={
            <div role="status" aria-label="Loading rooms" className="grid gap-4 sm:grid-cols-2">
              <div className="h-44 rounded-lg bg-surface-deep/60" />
              <div className="h-44 rounded-lg bg-surface-deep/60" />
            </div>
          }
        >
          <RoomsList />
        </Suspense>
      </div>
    </>
  );
}
