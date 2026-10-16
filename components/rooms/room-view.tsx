"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ICameraVideoTrack, IRemoteVideoTrack } from "agora-rtc-sdk-ng";
import {
  ArrowLeft,
  Copy,
  Lock,
  Mic,
  MicOff,
  Music,
  Send,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  joinRoom,
  leaveRoom,
  roomHeartbeat,
  sendRoomMessage,
  setBlocked,
  closeRoom,
} from "@/app/app/rooms/actions";
import { ProgressRing } from "@/components/brand/progress-ring";
import { GAMES, type GameId } from "@/components/games/catalog";
import { useTimer } from "@/components/focus/timer-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlassCard } from "@/components/ui/glass-card";
import { agoraUid, initials } from "@/lib/rooms/access";
import type { RoomView as Room } from "@/lib/rooms/data";
import { describeSchedule, roomPhase, trackPosition } from "@/lib/rooms/schedule";
import { formatClock } from "@/lib/timer/engine";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ReportSheet } from "./report-sheet";
import { useRoomMedia } from "./use-room-media";
import { useServerNow } from "./use-server-clock";

type Person = { userId: string; name: string; mic: boolean; cam: boolean };
type Message = { id: string; user_id: string; display_name: string; body: string; created_at: string };

const VISIBLE_TILES = 7;

function clockTime(ms: number, tz?: string | null) {
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

function VideoBox({ track }: { track: ICameraVideoTrack | IRemoteVideoTrack }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    track.play(ref.current, { fit: "cover" });
    return () => track.stop();
  }, [track]);
  return <div ref={ref} className="absolute inset-0 overflow-hidden rounded-md" aria-hidden="true" />;
}

function Avatar({ name, you }: { name: string; you?: boolean }) {
  return (
    <span
      className="flex size-11 items-center justify-center rounded-pill text-sm font-semibold text-on-brand bg-gradient-orb"
      aria-hidden="true"
    >
      {you ? "You" : initials(name)}
    </span>
  );
}

export function RoomView({
  room,
  me,
  mediaEnabled,
  initialBlocked,
  taskTitle,
  timezone,
  removed: removedAtLoad,
}: {
  room: Room;
  me: { id: string; name: string };
  mediaEnabled: boolean;
  initialBlocked: string[];
  taskTitle: string | null;
  timezone: string | null;
  removed: boolean;
}) {
  const router = useRouter();
  const timer = useTimer();
  const now = useServerNow(500);
  const [stage, setStage] = useState<"lobby" | "in" | "removed">(removedAtLoad ? "removed" : "lobby");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, startJoin] = useTransition();
  const [people, setPeople] = useState<Person[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [blocked, setBlockedIds] = useState<Set<string>>(() => new Set(initialBlocked));
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [musicBlocked, setMusicBlocked] = useState(false);
  const [game, setGame] = useState<GameId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ownTask, setOwnTask] = useState("");
  const [copied, setCopied] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inRoom = stage === "in";

  const phase = now ? roomPhase(room, now) : null;
  const live = !!phase?.live;
  const onBreak = phase?.live && phase.phase === "break";

  const blockedUids = useMemo(() => new Set([...blocked].map(agoraUid)), [blocked]);
  const media = useRoomMedia({ roomId: room.id, enabled: mediaEnabled, active: inRoom && live, blockedUids });

  // Your task: the running focus block's task, else the first open task in today's plan, else your own note.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from localStorage after hydration
      setOwnTask(localStorage.getItem(`room-task:${room.id}`) ?? "");
    } catch {
      // Storage unavailable: the note just isn't remembered.
    }
  }, [room.id]);
  const shownTask = timer.title || taskTitle;

  // ---------- Presence, chat and removals over Supabase Realtime ----------
  useEffect(() => {
    if (!inRoom) return;
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const { data: recent } = await supabase
        .from("room_messages")
        .select("id, user_id, display_name, body, created_at")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled && recent) setMessages(recent.reverse());

      channel = supabase.channel(`room:${room.id}`, {
        config: { private: true, presence: { key: me.id } },
      });
      channelRef.current = channel;
      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState<Person>();
          const list = Object.values(state)
            .map((entries) => entries[entries.length - 1])
            .filter(Boolean)
            .map(({ userId, name, mic, cam }) => ({ userId, name, mic, cam }));
          setPeople(list);
        })
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${room.id}` },
          (payload) => setMessages((m) => [...m.slice(-49), payload.new as Message]),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "room_participants", filter: `room_id=eq.${room.id}` },
          (payload) => {
            const row = payload.new as { user_id: string; removed: boolean };
            if (row.user_id === me.id && row.removed) setStage("removed");
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED")
            void channel!.track({ userId: me.id, name: me.name, mic: false, cam: false });
        });
    })();

    // Heartbeat keeps the headcount honest and catches removals if Realtime drops.
    const beat = window.setInterval(async () => {
      const res = await roomHeartbeat(room.id);
      if (res.removed) setStage("removed");
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(beat);
      if (channel) void supabase.removeChannel(channel);
      channelRef.current = null;
      setPeople([]);
    };
  }, [inRoom, room.id, me.id, me.name]);

  // Tell the room when your mic or camera changes.
  useEffect(() => {
    void channelRef.current?.track({ userId: me.id, name: me.name, mic: media.micOn, cam: media.camOn });
  }, [media.micOn, media.camOn, me.id, me.name]);

  // ---------- Synced music ----------
  const duration = room.track?.duration_seconds ?? 0;
  const sessionStart = phase?.live ? phase.sessionStart : null;
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !room.track) return;
    if (!inRoom || !musicOn || sessionStart === null) {
      audio.pause();
      return;
    }
    const expected = trackPosition(sessionStart, now, duration);
    const drift = Math.abs(audio.currentTime - expected);
    // Re-sync if we've drifted (allowing for the loop wrapping around).
    if (Math.min(drift, duration - drift) > 0.6) audio.currentTime = expected;
    if (audio.paused)
      audio.play().then(
        () => setMusicBlocked(false),
        () => setMusicBlocked(true),
      );
  }, [now, inRoom, musicOn, sessionStart, duration, room.track]);

  // ---------- Break ends: close the game gently ----------
  const [wasBreak, setWasBreak] = useState(false);
  if (wasBreak !== !!onBreak) {
    setWasBreak(!!onBreak);
    if (onBreak) setNotice(null);
    else if (inRoom) {
      setGame(null);
      setNotice("Break's over. Back to the block together.");
    }
  }

  // ---------- Actions ----------
  function join() {
    setJoinError(null);
    startJoin(async () => {
      const res = await joinRoom(room.id);
      if (res.ok) setStage("in");
      else setJoinError(res.message);
    });
  }

  async function leave() {
    audioRef.current?.pause();
    setStage("lobby");
    await leaveRoom(room.id);
    router.push("/app/rooms");
  }

  const block = useCallback(async (userId: string, value: boolean) => {
    setBlockedIds((s) => {
      const next = new Set(s);
      if (value) next.add(userId);
      else next.delete(userId);
      return next;
    });
    await setBlocked(userId, value);
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setChatError(null);
    const res = await sendRoomMessage({ roomId: room.id, body });
    if (res.ok) setDraft("");
    else setChatError(res.message);
  }

  // ---------- Derived view ----------
  const others = people.filter((p) => p.userId !== me.id);
  const meInRoom: Person = { userId: me.id, name: me.name, mic: media.micOn, cam: media.camOn };
  const tiles = [meInRoom, ...others];
  const shown = tiles.slice(0, others.length + 1 > VISIBLE_TILES + 1 ? VISIBLE_TILES : VISIBLE_TILES + 1);
  const extra = tiles.length - shown.length;
  const count = inRoom ? Math.max(1, people.length) : room.liveCount;

  const clock = phase?.live
    ? formatClock(phase.remaining)
    : phase && !phase.live && phase.nextStart
      ? formatClock(Math.max(0, phase.nextStart - now))
      : "--:--";
  const ringValue = phase?.live ? 1 - phase.remaining / phase.phaseLength : 0;
  const subline = !phase
    ? " "
    : phase.live
      ? phase.phase === "focus"
        ? phase.nextBreakAt
          ? `Shared block · break at ${clockTime(phase.nextBreakAt, timezone)}`
          : `Shared block · ends at ${clockTime(phase.sessionEnd, timezone)}`
        : `Break · back at ${clockTime(phase.sessionStart + phase.lap * (room.focus_minutes + room.break_minutes) * 60_000, timezone)}`
      : phase.nextStart
        ? `Next session at ${clockTime(phase.nextStart, timezone)}`
        : "This room has finished";

  const visibleMessages = messages.filter((m) => !blocked.has(m.user_id));
  const activeGame = GAMES.find((g) => g.id === game);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link
        href="/app/rooms"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-sm type-body-sm text-ink-muted focus-ring hover:text-ink"
      >
        <ArrowLeft className="size-4 stroke-[1.5]" aria-hidden="true" /> All rooms
      </Link>

      <header className="flex flex-col gap-1">
        <p className="flex items-center gap-2 type-body-sm text-ink-muted">
          <span
            className={cn("size-2 rounded-pill", live ? "bg-orange" : "bg-white/30")}
            aria-hidden="true"
          />
          {live
            ? `Live · ${count} ${count === 1 ? "person" : "people"} working`
            : `${describeSchedule(room, timezone)}`}
        </p>
        <h1 className="type-h1 md:text-[44px] md:leading-[48px]">{room.title}</h1>
        {room.description ? <p className="text-ink-muted">{room.description}</p> : null}
      </header>

      {room.isHost && room.invite_code ? (
        <GlassCard className="flex flex-wrap items-center gap-3 p-4">
          <p className="min-w-0 flex-1 type-body-sm">
            <span className="font-semibold">Private room.</span>{" "}
            <span className="text-ink-muted">Share the invite link with people you want to focus with.</span>
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(
                `${window.location.origin}/app/rooms/join/${room.invite_code}`,
              );
              setCopied(true);
            }}
          >
            <Copy aria-hidden="true" /> {copied ? "Link copied" : "Copy invite link"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const res = await closeRoom(room.id);
              if (res.ok) router.push("/app/rooms");
            }}
          >
            Close room
          </Button>
        </GlassCard>
      ) : null}

      <GlassCard className="flex items-center gap-5 p-5">
        <ProgressRing
          value={ringValue}
          size={88}
          strokeWidth={7}
          label={
            phase?.live
              ? `${phase.phase === "focus" ? "Shared focus block" : "Break"} progress`
              : "Time until the next session"
          }
          valueText={`${clock} ${phase?.live ? "remaining" : "until it starts"}`}
        />
        <div className="min-w-0">
          <p
            className="text-[40px] leading-[44px] font-extralight tabular-nums md:text-5xl"
            aria-hidden="true"
          >
            {clock}
          </p>
          <p className="type-body-sm text-ink-muted">{subline}</p>
          {phase?.live ? (
            <p className="type-body-sm text-ink-muted">
              Lap {phase.lap} of {phase.laps}
            </p>
          ) : null}
        </div>
      </GlassCard>

      {room.track ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="inline-flex min-h-11 items-center gap-2 rounded-pill px-4 type-body-sm glass">
            <Music className="size-4 stroke-[1.5] text-ink-muted" aria-hidden="true" />
            <span>
              Everyone hears: <span className="font-semibold">{room.track.title}</span>
            </span>
          </p>
          {inRoom ? (
            <Button
              variant="ghost"
              size="icon"
              aria-pressed={musicOn}
              aria-label={musicOn ? "Mute room music for me" : "Unmute room music"}
              onClick={() => setMusicOn((m) => !m)}
            >
              {musicOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
            </Button>
          ) : null}
          {inRoom && musicBlocked && musicOn && live ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                audioRef.current?.play().then(
                  () => setMusicBlocked(false),
                  () => {},
                )
              }
            >
              Tap to hear the music
            </Button>
          ) : null}
          <audio ref={audioRef} src={room.track.file_url} loop preload="auto" />
        </div>
      ) : null}

      {stage === "removed" ? (
        <GlassCard className="flex flex-col gap-3 p-6" role="alert">
          <h2 className="type-h2">You&apos;ve been removed from this room</h2>
          <p className="text-ink-muted">
            The team reviews reports to keep rooms calm and safe. You can still join other rooms.
          </p>
          <Button asChild variant="secondary" className="w-fit">
            <Link href="/app/rooms">See other rooms</Link>
          </Button>
        </GlassCard>
      ) : stage === "lobby" ? (
        <GlassCard className="flex flex-col gap-4 p-6">
          <h2 className="type-h2">Join quietly</h2>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-ink-muted">
            <li>Your mic and camera stay off until you turn them on.</li>
            <li>Chat opens during breaks only.</li>
            <li>Report and block are always one tap away.</li>
          </ul>
          {joinError ? (
            <p role="alert" className="text-orange">
              {joinError}{" "}
              {joinError.includes("Pro") ? (
                <Link href="/app/upgrade" className="font-semibold underline focus-ring">
                  See Pro
                </Link>
              ) : null}
            </p>
          ) : null}
          <Button onClick={join} disabled={joining} className="w-fit">
            <Users aria-hidden="true" /> {joining ? "Joining…" : "Join room"}
          </Button>
        </GlassCard>
      ) : (
        <>
          <section aria-label="People in the room">
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {shown.map((p) => {
                const you = p.userId === me.id;
                const isBlocked = blocked.has(p.userId);
                const video = you
                  ? media.localVideo
                  : isBlocked
                    ? null
                    : media.remoteVideo.get(agoraUid(p.userId));
                const speaking = media.speaking.has(you ? agoraUid(me.id) : agoraUid(p.userId)) && p.mic;
                const status = isBlocked ? "Blocked" : !p.cam ? "Camera off" : !p.mic ? "Mic off" : "Mic on";
                const label = you ? (p.mic ? "Mic on" : "Mic off") : status;
                const body = (
                  <>
                    {video ? <VideoBox track={video} /> : null}
                    <span className={cn("relative flex flex-col items-center gap-2", video && "mt-auto")}>
                      {video ? null : <Avatar name={p.name} you={you} />}
                      <span className="rounded-pill px-2 text-xs text-ink-muted [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
                        {you ? (
                          <span className="sr-only">You: </span>
                        ) : (
                          <span className="sr-only">{p.name}: </span>
                        )}
                        {label}
                        {you ? null : <span className="sr-only">. Options</span>}
                      </span>
                    </span>
                  </>
                );
                const tileClass = cn(
                  "relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-md border p-2 glass sm:aspect-[4/3]",
                  speaking ? "border-blue-soft" : "border-line",
                );
                return (
                  <li key={p.userId}>
                    {you ? (
                      <div className={tileClass}>{body}</div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger className={cn(tileClass, "focus-ring hover:bg-white/[0.08]")}>
                          {body}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center">
                          <DropdownMenuLabel className="type-body-sm text-ink-muted">
                            {p.name}
                          </DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => block(p.userId, !isBlocked)}>
                            {isBlocked ? "Unblock" : "Block"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setReportFor(p.userId);
                              setReportOpen(true);
                            }}
                          >
                            Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </li>
                );
              })}
              {extra > 0 ? (
                <li className="flex aspect-square flex-col items-center justify-center rounded-md border border-dashed border-line sm:aspect-[4/3]">
                  <span className="text-2xl font-light">+{extra}</span>
                  <span className="text-xs text-ink-muted">working</span>
                </li>
              ) : null}
            </ul>
          </section>

          {media.message || !live ? (
            <p className="type-body-sm text-ink-muted" role="status">
              {media.message ?? "Voice and video open when the session starts."}
            </p>
          ) : null}

          <GlassCard className="flex flex-col gap-1 p-4">
            <p className="flex items-center gap-2 type-body-sm text-ink-muted">
              <Lock className="size-4 stroke-[1.5]" aria-hidden="true" /> Your task · only you see this
            </p>
            {shownTask ? (
              <p className="font-semibold">{shownTask}</p>
            ) : (
              <>
                <label htmlFor="room-task" className="sr-only">
                  What are you working on?
                </label>
                <input
                  id="room-task"
                  value={ownTask}
                  placeholder="What are you working on?"
                  onChange={(e) => {
                    setOwnTask(e.target.value);
                    try {
                      localStorage.setItem(`room-task:${room.id}`, e.target.value);
                    } catch {
                      // Not remembered without storage.
                    }
                  }}
                  className="min-h-11 rounded-sm border border-transparent bg-transparent font-semibold text-ink focus-ring placeholder:font-normal placeholder:text-ink-muted"
                />
              </>
            )}
          </GlassCard>

          {notice ? (
            <p role="status" className="type-body-sm text-blue-soft">
              {notice}
            </p>
          ) : null}

          <section aria-labelledby="chat-heading" className="flex flex-col gap-3">
            <h2 id="chat-heading" className="type-h3">
              Break chat
            </h2>
            {onBreak ? (
              <>
                <ol
                  className="flex max-h-60 flex-col gap-2 overflow-y-auto"
                  aria-live="polite"
                  aria-label="Messages"
                >
                  {visibleMessages.length === 0 ? (
                    <li className="type-body-sm text-ink-muted">Say hi, or just enjoy the quiet.</li>
                  ) : (
                    visibleMessages.map((m) => (
                      <li key={m.id} className="type-body-sm">
                        <span className="font-semibold">{m.user_id === me.id ? "You" : m.display_name}</span>{" "}
                        <span className="text-ink-muted">{m.body}</span>
                      </li>
                    ))
                  )}
                </ol>
                <form onSubmit={send} className="flex gap-2">
                  <label htmlFor="room-chat" className="sr-only">
                    Message the room
                  </label>
                  <input
                    id="room-chat"
                    value={draft}
                    maxLength={280}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Message the room"
                    className="min-h-11 flex-1 rounded-pill border border-line bg-surface-glass px-4 text-ink focus-ring placeholder:text-ink-muted"
                  />
                  <Button type="submit" size="icon" aria-label="Send message">
                    <Send aria-hidden="true" />
                  </Button>
                </form>
                {chatError ? (
                  <p role="alert" className="type-body-sm text-orange">
                    {chatError}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="type-body-sm text-ink-muted">
                {phase?.live && phase.nextBreakAt
                  ? `Chat opens at the break, ${clockTime(phase.nextBreakAt, timezone)}.`
                  : "Chat opens during breaks."}
              </p>
            )}
          </section>

          {onBreak ? (
            <section aria-labelledby="break-games" className="flex flex-col gap-3">
              <h2 id="break-games" className="type-h3">
                Rest your mind
              </h2>
              <div className="flex flex-wrap gap-2">
                {GAMES.map((g) => (
                  <Button
                    key={g.id}
                    variant={game === g.id ? "primary" : "secondary"}
                    size="sm"
                    aria-pressed={game === g.id}
                    onClick={() => setGame(game === g.id ? null : g.id)}
                  >
                    <g.icon aria-hidden="true" /> {g.name}
                  </Button>
                ))}
              </div>
              {activeGame ? (
                <GlassCard className="p-5">
                  <activeGame.Component />
                </GlassCard>
              ) : null}
            </section>
          ) : null}

          <div className="sticky bottom-24 z-10 flex items-center gap-3 rounded-pill border border-line bg-surface-deep p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] lg:bottom-6">
            <Button
              variant="secondary"
              size="icon"
              aria-pressed={media.micOn}
              aria-label={media.micOn ? "Turn microphone off" : "Turn microphone on"}
              disabled={media.status === "connecting"}
              onClick={media.status === "ready" ? media.toggleMic : undefined}
              aria-disabled={media.status !== "ready" || undefined}
            >
              {media.micOn ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-pressed={media.camOn}
              aria-label={media.camOn ? "Turn camera off" : "Turn camera on"}
              disabled={media.status === "connecting"}
              onClick={media.status === "ready" ? media.toggleCam : undefined}
              aria-disabled={media.status !== "ready" || undefined}
            >
              {media.camOn ? <Video aria-hidden="true" /> : <VideoOff aria-hidden="true" />}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-orange"
              onClick={() => {
                setReportFor(others[0]?.userId ?? null);
                setReportOpen(true);
              }}
            >
              Report
            </Button>
            <Button variant="solid" size="sm" className="ml-auto rounded-pill px-6" onClick={leave}>
              Leave room
            </Button>
          </div>
        </>
      )}

      <ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        roomId={room.id}
        people={others.map((p) => ({ id: p.userId, name: p.name }))}
        initialUserId={reportFor}
        onBlocked={(id) => setBlockedIds((s) => new Set(s).add(id))}
      />
    </div>
  );
}
