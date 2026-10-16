-- Streaks and the activity grid.
-- room_attendance: one row per scheduled room session a person was in, so room time counts toward
-- their streak and grid. Written by room server actions (service role); people read their own rows.

create table public.room_attendance (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Start of the scheduled session (from the room's schedule), identifying the occurrence.
  session_start timestamptz not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id, session_start),
  check (last_seen_at >= joined_at)
);
create index room_attendance_user_joined on public.room_attendance (user_id, joined_at desc);

alter table public.room_attendance enable row level security;
create policy "Read own attendance" on public.room_attendance for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.room_attendance from anon, authenticated;
grant select on public.room_attendance to authenticated;

-- Rest days: missed days per week that don't break a streak. 2 is the gentle default; 0 is strict.
alter table public.profiles
  add column streak_rest_days smallint not null default 2 check (streak_rest_days between 0 and 2);
grant update (streak_rest_days) on public.profiles to authenticated;
