-- Focus blocks from the Pomodoro timer (PRD 4.3). One row per focus block started.

create table public.focus_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  task_title text check (char_length(task_title) <= 200),
  planned_minutes integer not null check (planned_minutes between 1 and 240),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Seconds actually spent focusing (pauses excluded), reported by the timer.
  focused_seconds integer not null default 0 check (focused_seconds between 0 and 14400),
  completed boolean not null default false,
  outcome text check (outcome in ('done', 'more_time', 'stuck', 'skipped', 'reset')),
  created_at timestamptz not null default now()
);
create index focus_blocks_user_started on public.focus_blocks (user_id, started_at desc);

alter table public.focus_blocks enable row level security;

create policy "Own focus blocks" on public.focus_blocks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.focus_blocks from anon;
grant select, insert, update, delete on public.focus_blocks to authenticated;
