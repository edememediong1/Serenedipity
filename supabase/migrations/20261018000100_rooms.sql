-- Focus rooms (PRD 4.5): scheduled sessions with a shared timer and music, optional mic/camera,
-- break-only chat, report and block. Plus a minimal tracks table (PRD 4.7: rights record required).

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (category in ('deep-focus', 'calm-mind', 'clear-the-fog', 'creative-flow', 'wind-down')),
  style text check (style in ('piano', 'jazz', 'lofi', 'afro-lounge', 'ambient', 'binaural')),
  file_url text not null,
  duration_seconds integer not null check (duration_seconds > 0),
  is_premium boolean not null default false,
  -- A track can't be published without a source and licence record (PRD 4.7).
  source text not null check (char_length(source) > 0),
  license_record text not null check (char_length(license_record) > 0),
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

alter table public.tracks enable row level security;
create policy "Signed-in users read published tracks" on public.tracks for select to authenticated
  using (status = 'published');
revoke all on public.tracks from anon, authenticated;
grant select on public.tracks to authenticated;

insert into public.tracks (slug, title, category, style, file_url, duration_seconds, source, license_record) values
  ('glass-hours', 'Glass Hours', 'deep-focus', 'ambient', '/audio/glass-hours.mp3', 180,
   'Generated in-house for testing', 'Original synthetic audio created for this app; no third-party rights. Replace before launch.'),
  ('slow-tide', 'Slow Tide', 'calm-mind', 'ambient', '/audio/slow-tide.mp3', 180,
   'Generated in-house for testing', 'Original synthetic audio created for this app; no third-party rights. Replace before launch.'),
  ('night-rain', 'Night Rain', 'clear-the-fog', 'ambient', '/audio/night-rain.mp3', 180,
   'Generated in-house for testing', 'Original synthetic audio created for this app; no third-party rights. Replace before launch.');

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 80),
  description text check (char_length(description) <= 280),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  invite_code text unique check (invite_code ~ '^[a-z0-9]{10}$'),
  -- null host = scheduled by the team (admins); otherwise the Pro user who created it.
  host_id uuid references auth.users (id) on delete cascade,
  schedule text not null default 'hourly' check (schedule in ('once', 'hourly', 'daily', 'weekdays')),
  starts_at timestamptz not null,
  session_minutes integer not null default 50 check (session_minutes between 10 and 180),
  focus_minutes integer not null default 25 check (focus_minutes between 5 and 120),
  break_minutes integer not null default 5 check (break_minutes between 1 and 30),
  capacity integer not null default 20 check (capacity between 2 and 50),
  track_id uuid references public.tracks (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  check ((visibility = 'private') = (invite_code is not null)),
  check (schedule <> 'hourly' or session_minutes <= 60)
);
create index rooms_status on public.rooms (status, visibility);

create table public.room_participants (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Set when someone leaves; cleared when they come back. The row stays (it counts toward the free trial room).
  left_at timestamptz,
  -- Set by an admin to remove someone; they can't rejoin that room.
  removed boolean not null default false,
  primary key (room_id, user_id)
);

create table public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index room_messages_room_created on public.room_messages (room_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  reason text not null check (reason in ('harassment', 'inappropriate_video', 'spam', 'hate', 'underage', 'other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.room_messages enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

-- Helper (security definer, avoids recursive RLS): is the caller an active participant of this room?
create or replace function public.is_room_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_participants
    where room_id = p_room and user_id = (select auth.uid()) and not removed
  );
$$;
revoke all on function public.is_room_member(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;

-- Rooms: public active rooms for everyone signed in; private rooms for their host and members.
create policy "See public rooms" on public.rooms for select to authenticated
  using (status = 'active' and visibility = 'public');
create policy "See own or joined private rooms" on public.rooms for select to authenticated
  using (host_id = (select auth.uid()) or public.is_room_member(id));
-- Writes go through server actions (service role) after plan/admin checks.

-- Participants: members see who else is in their rooms.
create policy "Members see participants" on public.room_participants for select to authenticated
  using (public.is_room_member(room_id) or user_id = (select auth.uid()));

-- Messages: members read their room's chat. Writes go through a server action (break-only rule).
create policy "Members read room chat" on public.room_messages for select to authenticated
  using (public.is_room_member(room_id));

-- Reports: write-only for users; reviewed by admins with the service role.
create policy "File reports" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- Blocks: users manage their own list.
create policy "Own blocks" on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

revoke all on public.rooms, public.room_participants, public.room_messages, public.reports, public.blocks from anon, authenticated;
grant select on public.rooms, public.room_participants, public.room_messages to authenticated;
grant insert (reporter_id, reported_user_id, room_id, reason, details) on public.reports to authenticated;
grant select, insert, delete on public.blocks to authenticated;

-- Presence for a room runs on a private Realtime channel "room:<id>", open to its members only.
create policy "Room members read room channels" on realtime.messages for select to authenticated
  using (
    case when (select realtime.topic()) ~ '^room:[0-9a-f-]{36}$'
      then public.is_room_member(substring((select realtime.topic()) from 6)::uuid)
      else false end
  );
create policy "Room members write room channels" on realtime.messages for insert to authenticated
  with check (
    case when (select realtime.topic()) ~ '^room:[0-9a-f-]{36}$'
      then public.is_room_member(substring((select realtime.topic()) from 6)::uuid)
      else false end
  );

-- Live chat and removals stream to clients (RLS still applies to what each client receives).
alter publication supabase_realtime add table public.room_messages;
alter publication supabase_realtime add table public.room_participants;

-- Two team-scheduled rooms to start with.
insert into public.rooms (title, description, schedule, starts_at, session_minutes, focus_minutes, break_minutes, track_id)
select 'Deep work sprint', 'Every hour on the hour: 25 on, 5 off, twice.', 'hourly',
       date_trunc('hour', now()), 55, 25, 5, (select id from public.tracks where slug = 'glass-hours');
insert into public.rooms (title, description, schedule, starts_at, session_minutes, focus_minutes, break_minutes, track_id)
select 'Morning focus', 'A calm start to the day: two 50-minute blocks.', 'daily',
       date_trunc('day', now()) + interval '13 hours', 110, 50, 10, (select id from public.tracks where slug = 'slow-tide');
