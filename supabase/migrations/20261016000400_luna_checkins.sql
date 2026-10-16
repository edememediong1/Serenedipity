-- Luna, the AI focus guide: check-ins, plans, tasks and a minimal safety log (PRD sections 4.4 and 5).

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- What the user said or typed. Voice audio is never stored; only its transcript.
  transcript text check (char_length(transcript) <= 20000),
  input_mode text not null default 'text' check (input_mode in ('text', 'voice')),
  mood_summary text check (char_length(mood_summary) <= 200),
  safety_flag boolean not null default false,
  created_at timestamptz not null default now()
);
create index checkins_user_created on public.checkins (user_id, created_at desc);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checkin_id uuid references public.checkins (id) on delete set null,
  deadline timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz not null default now()
);
create index plans_user_created on public.plans (user_id, created_at desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  estimate_minutes integer not null check (estimate_minutes between 5 and 240),
  music_category text check (music_category in ('deep-focus', 'calm-mind', 'clear-the-fog', 'creative-flow', 'wind-down')),
  position integer not null,
  status text not null default 'todo' check (status in ('todo', 'done', 'skipped')),
  created_at timestamptz not null default now()
);
create index tasks_plan_position on public.tasks (plan_id, position);

-- Safety review log: records THAT a check-in was flagged and the category, never the conversation.
create table public.safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checkin_id uuid references public.checkins (id) on delete set null,
  category text not null check (category in ('self_harm', 'harm_to_others', 'severe_distress', 'other')),
  source text not null check (source in ('keyword', 'model')),
  created_at timestamptz not null default now()
);

alter table public.checkins enable row level security;
alter table public.plans enable row level security;
alter table public.tasks enable row level security;
alter table public.safety_events enable row level security;

-- Users fully own their check-ins, plans and tasks (including deleting their history).
create policy "Own check-ins" on public.checkins for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own plans" on public.plans for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own tasks" on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Safety events: users can write their own (from the server action), but nobody reads them from the client.
create policy "Insert own safety events" on public.safety_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.checkins, public.plans, public.tasks, public.safety_events from anon;
grant select, insert, update, delete on public.checkins, public.plans, public.tasks to authenticated;
revoke all on public.safety_events from authenticated;
grant insert (user_id, checkin_id, category, source) on public.safety_events to authenticated;
