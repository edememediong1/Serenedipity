-- Focus techniques and laps, plus saved weekly reflections from Luna.

alter table public.profiles
  add column focus_technique text not null default 'pomodoro'
    check (focus_technique in ('pomodoro', 'deep-work', 'ultradian', '52-17', 'flowtime', 'custom')),
  add column focus_laps integer not null default 4 check (focus_laps between 1 and 12),
  add column long_break_minutes integer not null default 15 check (long_break_minutes between 5 and 60),
  add column long_break_every integer not null default 4 check (long_break_every between 2 and 8);

grant update (focus_technique, focus_laps, long_break_minutes, long_break_every) on public.profiles to authenticated;

alter table public.focus_blocks
  add column technique text check (technique in ('pomodoro', 'deep-work', 'ultradian', '52-17', 'flowtime', 'custom')),
  add column lap integer check (lap between 1 and 50);

-- Luna's weekly reflection, cached per user per week so it isn't regenerated (or re-billed) on every view.
create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period text not null default 'week' check (period in ('week')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, period, period_start)
);

alter table public.reflections enable row level security;
create policy "Own reflections" on public.reflections for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.reflections from anon;
grant select, insert, update, delete on public.reflections to authenticated;
