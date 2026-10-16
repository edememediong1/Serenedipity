-- Waitlist: anonymous visitors can join; nobody can read the table from the client.

create extension if not exists citext with schema extensions;

create table public.waitlist (
  id bigint generated always as identity primary key,
  email extensions.citext not null unique
    check (char_length(email::text) between 3 and 320 and email::text ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source text check (char_length(source) <= 64),
  utm_source text check (char_length(utm_source) <= 128),
  utm_medium text check (char_length(utm_medium) <= 128),
  utm_campaign text check (char_length(utm_campaign) <= 128),
  utm_term text check (char_length(utm_term) <= 128),
  utm_content text check (char_length(utm_content) <= 128),
  created_at timestamptz not null default now()
);

comment on table public.waitlist is 'Launch waitlist. Insert-only for anon/authenticated; read via service role or dashboard.';

alter table public.waitlist enable row level security;

-- Insert only. No select, update or delete policies, so the client can never read rows back.
create policy "Anyone can join the waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

revoke all on public.waitlist from anon, authenticated;
grant insert (email, source, utm_source, utm_medium, utm_campaign, utm_term, utm_content)
  on public.waitlist to anon, authenticated;

-- Basic rate limiting for public forms. Keys are salted hashes (never raw IPs).
create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_hits_lookup on public.rate_limit_hits (bucket, key_hash, created_at desc);

alter table public.rate_limit_hits enable row level security;
-- No policies: only the security-definer function below touches this table.
revoke all on public.rate_limit_hits from anon, authenticated;

-- Records a hit and returns true when the caller is over the limit.
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_key_hash text,
  p_max integer default 5,
  p_window_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  if p_bucket is null or p_key_hash is null or char_length(p_key_hash) > 128 or char_length(p_bucket) > 32 then
    return true;
  end if;

  -- Opportunistic cleanup of old hits for this key.
  delete from public.rate_limit_hits
   where bucket = p_bucket and key_hash = p_key_hash
     and created_at < now() - interval '1 day';

  select count(*) into recent
    from public.rate_limit_hits
   where bucket = p_bucket and key_hash = p_key_hash
     and created_at > now() - make_interval(secs => p_window_seconds);

  if recent >= p_max then
    return true;
  end if;

  insert into public.rate_limit_hits (bucket, key_hash) values (p_bucket, p_key_hash);
  return false;
end;
$$;

revoke all on function public.rate_limit_hit(text, text, integer, integer) from public;
grant execute on function public.rate_limit_hit(text, text, integer, integer) to anon, authenticated;
