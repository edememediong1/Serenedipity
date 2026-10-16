-- Profiles: one row per auth user, created by trigger on sign-up.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  age_confirmed boolean not null default false,
  age_confirmed_at timestamptz,
  goals text[] not null default '{}',
  work_style text check (work_style in ('morning', 'afternoon', 'evening', 'varies')),
  default_focus_minutes integer not null default 25 check (default_focus_minutes between 5 and 180),
  default_break_minutes integer not null default 5 check (default_break_minutes between 1 and 60),
  music_prefs text[] not null default '{}',
  has_headphones boolean,
  ai_guide_consent boolean not null default false,
  ai_guide_consent_at timestamptz,
  onboarding_step integer not null default 0 check (onboarding_step between 0 and 6),
  onboarding_completed_at timestamptz,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  timezone text check (char_length(timezone) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.onboarding_step is
  'Furthest onboarding step reached: 0 welcome, 1 age, 2 goals, 3 rhythm, 4 sound, 5 guide, 6 all set.';
comment on column public.profiles.age_confirmed_at is
  'When the age question was answered (either answer). age_confirmed=false with a timestamp means under 18.';

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Column-level privileges: users cannot change id, plan or timestamps managed by the server.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (
  display_name, age_confirmed, age_confirmed_at, goals, work_style,
  default_focus_minutes, default_break_minutes, music_prefs, has_headphones,
  ai_guide_consent, ai_guide_consent_at, onboarding_step, onboarding_completed_at, timezone
) on public.profiles to authenticated;

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row for every new user. Prefill the first name from OAuth metadata when present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  full_name text := coalesce(new.raw_user_meta_data ->> 'given_name',
                             split_part(coalesce(new.raw_user_meta_data ->> 'full_name',
                                                 new.raw_user_meta_data ->> 'name', ''), ' ', 1));
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(full_name, 60), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
