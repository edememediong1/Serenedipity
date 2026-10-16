-- Admin role, admin-editable app settings, and Stripe subscriptions.

-- Roles. Users can never change their own role (not in the column-level update grant).
alter table public.profiles
  add column role text not null default 'user' check (role in ('user', 'admin'));

-- Admin-editable settings (limits and switches). Readable by signed-in users; written only by the
-- server with the service role after an admin check.
create table public.app_settings (
  key text primary key check (key in ('free_daily_checkins', 'premium_daily_checkins', 'luna_enabled')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.app_settings (key, value) values
  ('free_daily_checkins', '1'::jsonb),       -- a number, or "unlimited"
  ('premium_daily_checkins', '"unlimited"'::jsonb),
  ('luna_enabled', 'true'::jsonb);

alter table public.app_settings enable row level security;
create policy "Signed-in users can read settings" on public.app_settings for select to authenticated using (true);
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to authenticated;

-- Stripe subscriptions (PRD data model). Written only by the Stripe webhook (service role).
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'none'
    check (status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  price_id text,
  billing_interval text check (billing_interval in ('month', 'year')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "Users read their own subscription" on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
