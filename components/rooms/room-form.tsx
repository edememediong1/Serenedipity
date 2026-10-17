"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { CreateRoomResult } from "@/app/app/rooms/actions";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { Input, inputClassName } from "@/components/ui/input";
import type { RoomInputValue } from "@/lib/rooms/validation";

type Schedule = "once" | "hourly" | "daily" | "weekdays";
const SCHEDULES: { value: Schedule; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
];

function localInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="type-body-sm">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClassName}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const mins = (list: number[]) => list.map((n) => ({ value: String(n), label: `${n} min` }));

/** Create a room. Pro members make private rooms (invite link); admins schedule public ones. */
export function RoomForm({
  action,
  tracks,
  mode,
}: {
  action: (input: RoomInputValue) => Promise<CreateRoomResult>;
  tracks: { id: string; title: string }[];
  mode: "private" | "public" | "group";
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState<Schedule>(mode === "public" ? "hourly" : "once");
  const [start, setStart] = useState("");
  const [session, setSession] = useState("50");
  const [focus, setFocus] = useState("25");
  const [brk, setBrk] = useState("5");
  const [capacity, setCapacity] = useState(mode === "public" ? "20" : mode === "group" ? "10" : "8");
  const [track, setTrack] = useState(tracks[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Default to the next quarter hour, in the creator's own time zone (set after mount).
  useEffect(() => {
    const d = new Date(Date.now() + 15 * 60_000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the creator's time zone is only known on the client
    setStart(localInputValue(d));
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const startsAt = start ? new Date(start).toISOString() : "";
    startTransition(async () => {
      const res = await action({
        title,
        description,
        schedule,
        startsAt,
        sessionMinutes: Number(session),
        focusMinutes: Number(focus),
        breakMinutes: Number(brk),
        capacity: Number(capacity),
        trackId: track || null,
      });
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      if (mode === "private" || mode === "group") router.push(`/app/rooms/${res.id}`);
      else {
        setMessage("Room scheduled.");
        setTitle("");
        setDescription("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <Input
        label="Room name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        required
      />
      <Input
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={280}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 type-body-sm">Repeats</legend>
        <ChipGroup
          type="single"
          aria-label="Repeats"
          value={schedule}
          onValueChange={setSchedule}
          options={SCHEDULES}
        />
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor="room-start" className="type-body-sm">
          {schedule === "once" ? "Starts" : "First session starts"}
        </label>
        <input
          id="room-start"
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className={inputClassName}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          id="room-session"
          label="Session length"
          value={session}
          onChange={setSession}
          options={mins(
            schedule === "hourly"
              ? [25, 30, 45, 50, 55, 60]
              : [25, 30, 45, 50, 55, 60, 90, 110, 120, 150, 180],
          )}
        />
        <Select
          id="room-focus"
          label="Focus block"
          value={focus}
          onChange={setFocus}
          options={mins([15, 20, 25, 30, 45, 50, 52, 60, 90])}
        />
        <Select
          id="room-break"
          label="Break"
          value={brk}
          onChange={setBrk}
          options={mins([3, 5, 10, 15, 17, 20])}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="room-capacity"
          label="Capacity"
          value={capacity}
          onChange={setCapacity}
          options={(mode === "public"
            ? [10, 20, 30, 50]
            : mode === "group"
              ? [6, 10, 20, 30]
              : [2, 4, 6, 8, 12]
          ).map((n) => ({
            value: String(n),
            label: `${n} people`,
          }))}
        />
        <Select
          id="room-track"
          label="Music everyone hears"
          value={track}
          onChange={setTrack}
          options={[
            ...tracks.map((t) => ({ value: t.id, label: t.title })),
            { value: "", label: "No music" },
          ]}
        />
      </div>
      {message ? (
        <p
          role={message === "Room scheduled." ? "status" : "alert"}
          className={message === "Room scheduled." ? "text-blue-soft" : "text-orange"}
        >
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : mode === "private" ? "Create room" : "Schedule room"}
      </Button>
    </form>
  );
}
