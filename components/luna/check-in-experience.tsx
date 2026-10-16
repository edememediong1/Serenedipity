"use client";

import { Mic, Send, Square } from "lucide-react";
import { useCallback, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { sendCheckIn, startPlan } from "@/app/app/check-in/actions";
import { SignatureOrb } from "@/components/brand/signature-orb";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";
import { GUIDE_NAME } from "@/lib/config";
import type { LunaMessage, LunaTurn } from "@/lib/luna/schema";
import { cn } from "@/lib/utils";
import { LunaBadge, LunaDisclaimer } from "./luna-badge";
import { PlanCard, type EditableTask } from "./plan-card";
import { SupportResources } from "./support-resources";
import { useVoiceNote, voiceSupported } from "./use-voice-note";

type Entry =
  | { role: "user"; content: string; mode: "text" | "voice"; seconds?: number }
  | { role: "assistant"; turn: LunaTurn };

const MOOD_PREFILL: Record<string, string> = {
  foggy: "I'm feeling foggy today. ",
  stressed: "I'm feeling stressed. ",
  deadline: "I have a deadline today. ",
  ready: "I'm ready to get going. ",
};

function formatSeconds(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Serialises Luna's structured turn back into plain text for the next request's history. */
function turnToText(turn: LunaTurn) {
  const parts = [turn.reply];
  if (turn.questions.length) parts.push(`Questions: ${turn.questions.join(" ")}`);
  if (turn.tasks.length)
    parts.push(`Plan: ${turn.tasks.map((t) => `${t.title} (${t.estimate_minutes} min)`).join("; ")}`);
  return parts.join("\n");
}

type Props = { mood: string | null; breakMinutes: number };

export function CheckInExperience({ mood, breakMinutes }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => (mood && MOOD_PREFILL[mood]) || "");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tasks, setTasks] = useState<EditableTask[]>([]);
  const [editing, setEditing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canRecord = useSyncExternalStore(
    () => () => {},
    voiceSupported,
    () => false,
  );

  const latest = [...entries]
    .reverse()
    .find((e): e is Extract<Entry, { role: "assistant" }> => e.role === "assistant")?.turn;
  const finished = latest?.kind === "plan" || latest?.kind === "support";

  const send = useCallback(
    (message: string, mode: "text" | "voice", seconds?: number) => {
      const text = message.trim();
      if (!text) {
        setError("Say or type a few words first.");
        return;
      }
      setError(null);
      const history: LunaMessage[] = entries.map((e) =>
        e.role === "user"
          ? { role: "user", content: e.content }
          : { role: "assistant", content: turnToText(e.turn) },
      );
      setEntries((es) => [...es, { role: "user", content: text, mode, seconds }]);
      setDraft("");
      startTransition(async () => {
        const res = await sendCheckIn({ checkinId, message: text, mode, history });
        if (!res.ok) {
          setEntries((es) => es.slice(0, -1));
          setDraft(text);
          if (res.code === "limit" || res.code === "unavailable" || res.code === "consent")
            setBlocked(res.message);
          else setError(res.message);
          return;
        }
        setCheckinId(res.checkinId);
        setEntries((es) => [...es, { role: "assistant", turn: res.turn }]);
        if (res.turn.kind === "plan") {
          setTasks(res.turn.tasks.map((t, i) => ({ ...t, key: `t-${i}` })));
          const due = res.turn.deadline_iso ? Date.parse(res.turn.deadline_iso) : NaN;
          setAvailableMinutes(Number.isNaN(due) ? null : Math.max(0, Math.round((due - Date.now()) / 60000)));
        }
      });
    },
    [entries, checkinId],
  );

  const voice = useVoiceNote(
    useCallback((text: string, seconds: number) => send(text, "voice", seconds), [send]),
  );

  const begin = async (reset: boolean) => {
    if (!checkinId || !latest) return;
    setStarting(true);
    setError(null);
    const res = await startPlan(
      {
        checkinId,
        deadline: latest.deadline_iso,
        tasks: tasks.map(({ title, estimate_minutes, music_category }) => ({
          title: title.trim(),
          estimate_minutes,
          music_category,
        })),
      },
      reset,
    );
    if (res && !res.ok) {
      setError(res.message);
      setStarting(false);
    }
  };

  const recording = voice.status === "recording";
  const busy = pending || voice.status === "transcribing";
  const isFirst = entries.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {isFirst ? (
        <header className="flex animate-rise-in flex-col gap-3">
          <Eyebrow>Clarity check-in</Eyebrow>
          <h1 className="type-hero md:text-[60px] md:leading-[62px]">
            How are you <em>feeling</em>?
          </h1>
          <p className="max-w-lg text-ink-muted md:text-base">
            Tell {GUIDE_NAME} how you feel and what&apos;s due. Talk for about 20 seconds, or type it.
          </p>
        </header>
      ) : (
        <h1 className="sr-only">Clarity check-in with {GUIDE_NAME}</h1>
      )}

      {/* Conversation */}
      <ol className="flex flex-col gap-6" aria-live="polite" aria-busy={pending}>
        {entries.map((e, i) => (
          <li key={i} className="animate-rise-in">
            {e.role === "user" ? (
              <GlassCard className="ml-auto max-w-[90%] rounded-md p-4">
                <p className="mb-1 flex items-center gap-1.5 type-body-sm text-ink-muted">
                  {e.mode === "voice" ? (
                    <>
                      <Mic className="size-3.5 stroke-[1.5]" aria-hidden="true" /> Voice note
                      {e.seconds ? ` · ${formatSeconds(e.seconds)}` : ""}
                    </>
                  ) : (
                    "You"
                  )}
                </p>
                <p>{e.content}</p>
              </GlassCard>
            ) : (
              <div className="flex flex-col gap-4">
                <LunaBadge />
                <p className="font-display text-[28px] leading-[32px] md:text-[32px] md:leading-[36px]">
                  {e.turn.reply}
                </p>
                {e.turn.kind === "clarify" && e.turn.questions.length ? (
                  <ul className="flex flex-col gap-2">
                    {e.turn.questions.map((q) => (
                      <li key={q} className="rounded-md border border-line bg-surface-glass px-4 py-3">
                        {q}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {e.turn.kind === "support" ? <SupportResources headingLevel={3} /> : null}
              </div>
            )}
          </li>
        ))}
        {pending ? (
          <li className="flex items-center gap-3 text-ink-muted" role="status">
            <SignatureOrb size={18} aria-hidden="true" className="animate-pulse motion-reduce:animate-none" />
            {GUIDE_NAME} is thinking…
          </li>
        ) : null}
      </ol>

      {/* Plan */}
      {latest?.kind === "plan" && tasks.length ? (
        <div className="flex animate-rise-in flex-col gap-4">
          <PlanCard
            tasks={tasks}
            deadlineLabel={latest.deadline_label}
            editing={editing}
            onChange={setTasks}
            availableMinutes={availableMinutes}
            breakMinutes={breakMinutes}
          />
          {error ? (
            <p role="alert" className="type-body-sm text-critical">
              {error}
            </p>
          ) : null}
          <Button
            size="lg"
            block
            disabled={starting || tasks.some((t) => !t.title.trim())}
            onClick={() => begin(latest.suggest_reset)}
          >
            {starting
              ? "Opening your first block…"
              : latest.suggest_reset
                ? "Start with a 2-minute reset"
                : "Start my first block"}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setEditing((v) => !v)}
              aria-pressed={editing}
            >
              {editing ? "Done editing" : "Edit plan"}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              disabled={starting}
              onClick={() => begin(!latest.suggest_reset)}
            >
              {latest.suggest_reset ? "Skip the reset" : "2-minute reset first"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Composer */}
      {blocked ? (
        <GlassCard className="p-5" role="status">
          <p>{blocked}</p>
        </GlassCard>
      ) : !finished ? (
        <div className="flex flex-col gap-4">
          {isFirst ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <button
                type="button"
                disabled={busy || !canRecord}
                onClick={recording ? voice.stop : voice.start}
                aria-label={recording ? "Stop recording" : "Record a voice note"}
                className={cn(
                  "relative rounded-pill focus-ring transition-transform duration-300 disabled:opacity-60",
                  !recording && "hover:scale-[1.03] motion-reduce:hover:scale-100",
                )}
              >
                {recording ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 animate-ping rounded-pill bg-violet/30 motion-reduce:animate-none"
                  />
                ) : null}
                <SignatureOrb
                  size={120}
                  halo
                  icon={
                    recording ? (
                      <Square className="size-9 fill-current" aria-hidden="true" />
                    ) : (
                      <Mic className="size-10" aria-hidden="true" />
                    )
                  }
                />
              </button>
              <p className="type-body-sm text-ink-muted tabular-nums" aria-live="polite">
                {recording
                  ? `Listening… ${formatSeconds(voice.seconds)} / ${formatSeconds(voice.maxSeconds)} · tap to stop`
                  : voice.status === "transcribing"
                    ? "Turning your voice note into text…"
                    : canRecord
                      ? "Tap to talk"
                      : "Voice notes aren't available in this browser"}
              </p>
            </div>
          ) : null}

          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft, "text");
            }}
          >
            <label htmlFor="checkin-text" className="type-body-sm text-ink">
              {isFirst ? "Or type it" : `Reply to ${GUIDE_NAME}`}
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id="checkin-text"
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(draft, "text");
                  }
                }}
                rows={isFirst ? 3 : 2}
                placeholder={
                  isFirst ? "I woke up foggy and I have to finish the client report by 5…" : "Your answer"
                }
                aria-describedby={error && !latest ? "checkin-error" : undefined}
                className="min-h-12 flex-1 resize-none rounded-md border border-line bg-surface-deep px-4 py-3 text-ink focus-ring placeholder:text-ink-muted/70"
              />
              <Button
                type="submit"
                size="icon"
                className="size-12"
                aria-label="Send"
                disabled={busy || recording}
              >
                <Send aria-hidden="true" />
              </Button>
            </div>
            {error || voice.error ? (
              <p id="checkin-error" role="alert" className="type-body-sm text-critical">
                {error ?? voice.error}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}

      <LunaDisclaimer />
    </div>
  );
}
