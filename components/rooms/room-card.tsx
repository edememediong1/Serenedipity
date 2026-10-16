import Link from "next/link";
import { Lock, Music, Users } from "lucide-react";
import type { RoomView } from "@/lib/rooms/data";
import { describeSchedule, roomPhase } from "@/lib/rooms/schedule";
import { cn } from "@/lib/utils";

function at(ms: number, tz: string | null) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || undefined,
    }).format(ms);
  } catch {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(ms);
  }
}

export function RoomCard({ room, now, timezone }: { room: RoomView; now: number; timezone: string | null }) {
  const phase = roomPhase(room, now);
  const status = phase.live
    ? `Live · ${phase.phase === "focus" ? "focus block" : "break"} · ${room.liveCount} working`
    : phase.nextStart
      ? `Next at ${at(phase.nextStart, timezone)}`
      : "Finished";
  return (
    <Link
      href={`/app/rooms/${room.id}`}
      className="flex h-full flex-col gap-3 rounded-lg p-5 focus-ring glass transition-colors hover:bg-white/[0.08] md:p-6"
    >
      <span className="flex items-center gap-2 type-body-sm text-ink-muted">
        <span
          className={cn("size-2 rounded-pill", phase.live ? "bg-orange" : "bg-white/30")}
          aria-hidden="true"
        />
        {status}
      </span>
      <span className="type-h3">{room.title}</span>
      {room.description ? <span className="text-ink-muted">{room.description}</span> : null}
      <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 type-body-sm text-ink-muted">
        <span>{describeSchedule(room, timezone)}</span>
        <span>
          {room.focus_minutes} on · {room.break_minutes} off
        </span>
        {room.track ? (
          <span className="inline-flex items-center gap-1">
            <Music className="size-3.5 stroke-[1.5]" aria-hidden="true" /> {room.track.title}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5 stroke-[1.5]" aria-hidden="true" /> Up to {room.capacity}
        </span>
        {room.visibility === "private" ? (
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3.5 stroke-[1.5]" aria-hidden="true" /> Private
            {room.isHost ? " · you host" : ""}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
