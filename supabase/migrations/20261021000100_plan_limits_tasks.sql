-- Daily allowances for rooms (admin-configurable) and manual to-dos with times.

-- New settings: rooms a free member can create and join per day (a number, or "unlimited").
alter table public.app_settings drop constraint app_settings_key_check;
alter table public.app_settings add constraint app_settings_key_check check (key in (
  'free_daily_checkins', 'premium_daily_checkins', 'luna_enabled',
  'free_daily_room_creates', 'free_daily_room_joins'
));
insert into public.app_settings (key, value) values
  ('free_daily_room_creates', '2'::jsonb),
  ('free_daily_room_joins', '10'::jsonb)
on conflict (key) do nothing;

-- One row per room a person joins per day (their local date). Rejoining the same room the same
-- day doesn't count twice. Written by the join action (service role); people read their own.
create table public.room_joins (
  user_id uuid not null references auth.users (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  joined_on date not null,
  joined_at timestamptz not null default now(),
  primary key (user_id, room_id, joined_on)
);
create index room_joins_user_day on public.room_joins (user_id, joined_on);
alter table public.room_joins enable row level security;
create policy "Read own room joins" on public.room_joins for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.room_joins from anon, authenticated;
grant select on public.room_joins to authenticated;

-- Rooms record who created them and when, for the daily creation allowance.
create index rooms_host_created on public.rooms (host_id, created_at desc) where host_id is not null;

-- To-dos: an optional time ("2:30 PM") and where the task came from.
alter table public.tasks
  add column due_at timestamptz,
  add column source text not null default 'luna' check (source in ('luna', 'manual'));
create index tasks_user_due on public.tasks (user_id, due_at) where status = 'todo';
