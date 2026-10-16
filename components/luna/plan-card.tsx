"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { MUSIC_CATEGORIES } from "@/lib/luna/schema";
import { cn } from "@/lib/utils";

export type EditableTask = {
  key: string;
  title: string;
  estimate_minutes: number;
  music_category: (typeof MUSIC_CATEGORIES)[number] | null;
};

const MINUTE_OPTIONS = Array.from({ length: 24 }, (_, i) => (i + 1) * 5);

type Props = {
  tasks: EditableTask[];
  deadlineLabel: string | null;
  editing: boolean;
  onChange: (tasks: EditableTask[]) => void;
  /** Minutes available before the deadline, when known. */
  availableMinutes: number | null;
  breakMinutes: number;
};

/** "Today's plan": numbered tasks with estimates; editable (rename, re-time, reorder, delete, add). */
export function PlanCard({ tasks, deadlineLabel, editing, onChange, availableMinutes, breakMinutes }: Props) {
  const total =
    tasks.reduce((s, t) => s + t.estimate_minutes, 0) + Math.max(0, tasks.length - 1) * breakMinutes;
  const overBy = availableMinutes !== null ? total - availableMinutes : 0;

  const update = (i: number, patch: Partial<EditableTask>) =>
    onChange(tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...tasks];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <GlassCard className="flex flex-col gap-4 p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="type-h2">Today&apos;s plan</h2>
        {deadlineLabel ? <p className="type-body-sm text-ink-muted">Due {deadlineLabel}</p> : null}
      </div>
      <ol className="flex flex-col gap-2">
        {tasks.map((t, i) => (
          <li
            key={t.key}
            className={cn(
              "flex items-center gap-3 rounded-md bg-white/[0.05] px-3 py-3",
              i === 0 && !editing && "bg-white/[0.09]",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-pill text-xs font-semibold",
                i === 0 ? "text-on-brand [background:var(--gradient-primary)]" : "border border-line",
              )}
            >
              {i + 1}
            </span>
            {editing ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                <label className="sr-only" htmlFor={`task-${t.key}`}>
                  Task {i + 1}
                </label>
                <input
                  id={`task-${t.key}`}
                  value={t.title}
                  maxLength={200}
                  onChange={(e) => update(i, { title: e.target.value })}
                  className="min-h-11 min-w-0 flex-1 rounded-sm border border-line bg-surface-deep px-3 text-ink focus-ring"
                />
                <div className="flex items-center gap-1">
                  <label className="sr-only" htmlFor={`min-${t.key}`}>
                    Minutes for task {i + 1}
                  </label>
                  <select
                    id={`min-${t.key}`}
                    value={t.estimate_minutes}
                    onChange={(e) => update(i, { estimate_minutes: Number(e.target.value) })}
                    className="min-h-11 rounded-sm border border-line bg-surface-deep px-2 text-ink focus-ring"
                  >
                    {MINUTE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Move task ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Move task ${i + 1} down`}
                    disabled={i === tasks.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete task ${i + 1}`}
                    disabled={tasks.length === 1}
                    onClick={() => onChange(tasks.filter((_, j) => j !== i))}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <span className="flex-1 text-left">{t.title}</span>
                <span className="type-body-sm text-ink-muted tabular-nums">{t.estimate_minutes} min</span>
              </>
            )}
          </li>
        ))}
      </ol>
      {editing && tasks.length < 12 ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() =>
            onChange([
              ...tasks,
              { key: `new-${Date.now()}`, title: "New task", estimate_minutes: 25, music_category: null },
            ])
          }
        >
          <Plus aria-hidden="true" /> Add a task
        </Button>
      ) : null}
      {overBy > 0 ? (
        <p className="type-body-sm text-ink-muted" role="note">
          This is about {overBy} minutes more than the time left before the deadline. Trim a task or move one
          to later.
        </p>
      ) : null}
    </GlassCard>
  );
}
