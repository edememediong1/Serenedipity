"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Clock, MoreHorizontal, Plus } from "lucide-react";
import { addTodo, removeTodo, setTodoDone, updateTodo } from "@/app/app/tasks/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlassCard } from "@/components/ui/glass-card";
import { inputClassName } from "@/components/ui/input";
import { isOverdue, openMinutes, type Todo } from "@/lib/tasks/todos";
import { formatLocalTime, localHHMM } from "@/lib/time";
import { cn } from "@/lib/utils";

const ESTIMATES = [10, 15, 25, 45, 60, 90];

function TodoRow({ t, tz, now }: { t: Todo; tz: string | null; now: number }) {
  const [editingTime, setEditingTime] = useState(false);
  const [time, setTime] = useState(t.due_at ? localHHMM(t.due_at, tz) : "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const done = t.status === "done";
  const overdue = isOverdue(t, now);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg(res.ok ? null : (res.message ?? "Something went wrong."));
    });

  return (
    <li className="flex flex-col gap-1 border-b border-line py-2.5 last:border-0">
      <div className="flex items-center gap-3">
        <Checkbox
          id={`todo-${t.id}`}
          checked={done}
          disabled={pending}
          onCheckedChange={(v) => run(() => setTodoDone(t.id, v === true))}
        />
        <label
          htmlFor={`todo-${t.id}`}
          className={cn("min-w-0 flex-1 cursor-pointer", done && "text-ink-muted line-through")}
        >
          <span className="block truncate">{t.title}</span>
          <span className="block type-body-sm text-ink-muted no-underline">
            {done && t.completed_at ? (
              <>Done at {formatLocalTime(t.completed_at, tz)}</>
            ) : (
              <>
                {t.due_at ? (
                  <span className={cn("inline-flex items-center gap-1", overdue && "text-orange")}>
                    <Clock className="size-3.5 stroke-[1.5]" aria-hidden="true" />
                    {formatLocalTime(t.due_at, tz)}
                    {overdue ? " · past due" : ""}
                  </span>
                ) : (
                  "Anytime"
                )}
                {" · "}
                {t.estimate_minutes} min{t.source === "luna" ? " · from your plan" : ""}
              </>
            )}
          </span>
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Options for ${t.title}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-muted focus-ring hover:bg-white/[0.06] hover:text-ink"
          >
            <MoreHorizontal className="size-5 stroke-[1.5]" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {!done ? (
              <DropdownMenuItem onSelect={() => setEditingTime(true)}>
                {t.due_at ? "Change time" : "Add a time"}
              </DropdownMenuItem>
            ) : null}
            {!done && t.due_at ? (
              <DropdownMenuItem onSelect={() => run(() => updateTodo({ id: t.id, time: null }))}>
                Remove time
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => run(() => removeTodo(t.id))}>
              {t.source === "manual" ? "Delete" : "Remove from today"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {editingTime ? (
        <form
          className="flex items-center gap-2 pl-9"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const res = await updateTodo({ id: t.id, time: time || null });
              if (res.ok) setEditingTime(false);
              return res;
            });
          }}
        >
          <label htmlFor={`todo-time-${t.id}`} className="sr-only">
            Time for {t.title}
          </label>
          <input
            id={`todo-time-${t.id}`}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={cn(inputClassName, "min-h-11 w-36")}
          />
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTime(false)}>
            Cancel
          </Button>
        </form>
      ) : null}
      {msg ? (
        <p role="alert" className="pl-9 type-body-sm text-orange">
          {msg}
        </p>
      ) : null}
    </li>
  );
}

/** Today's to-dos: add your own (with an optional time), tick off, retime. Luna's plan tasks appear here too. */
export function TodoCard({ todos, timezone, now }: { todos: Todo[]; timezone: string | null; now: number }) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [estimate, setEstimate] = useState("25");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const open = todos.filter((t) => t.status === "todo");
  const minutes = openMinutes(todos);

  return (
    <GlassCard className="flex flex-col gap-4 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="todos-heading" className="type-h2">
          Your to-dos
        </h2>
        <p className="type-body-sm text-ink-muted">
          {open.length
            ? `${open.length} open · about ${minutes} min`
            : todos.length
              ? "All done for today"
              : "Nothing yet"}
        </p>
      </div>

      <form
        aria-labelledby="todos-heading"
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await addTodo({ title, time: time || null, estimateMinutes: Number(estimate) });
            if (res.ok) {
              setTitle("");
              setTime("");
              setMsg(null);
            } else setMsg(res.message);
          });
        }}
      >
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="todo-title" className="type-body-sm">
            Add a task
          </label>
          <input
            id="todo-title"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Email the client"
            className={inputClassName}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
            <label htmlFor="todo-time" className="type-body-sm">
              Time <span className="text-ink-muted">(optional)</span>
            </label>
            <input
              id="todo-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={cn(inputClassName, "w-full sm:w-36")}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
            <label htmlFor="todo-estimate" className="type-body-sm">
              Length
            </label>
            <select
              id="todo-estimate"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              className={cn(inputClassName, "w-full sm:w-28")}
            >
              {ESTIMATES.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            size="icon"
            className="mt-auto size-12 shrink-0"
            aria-label="Add task"
            disabled={pending || !title.trim()}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </form>
      {msg ? (
        <p role="alert" className="type-body-sm text-orange">
          {msg}
        </p>
      ) : null}

      {todos.length ? (
        <ul aria-label="Today's tasks" className="flex flex-col">
          {todos.map((t) => (
            <TodoRow key={t.id} t={t} tz={timezone} now={now} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">
          Add what you want to get done today, with a time if it helps. They&apos;ll be waiting in the focus
          timer too.
        </p>
      )}

      {open.length ? (
        <Link
          href="/app/focus"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
        >
          Focus on the next one <ArrowRight className="size-4 stroke-[1.5]" aria-hidden="true" />
        </Link>
      ) : null}
    </GlassCard>
  );
}
