-- Study groups: persistent communities with members and roles, a feed of posts and comments,
-- reactions, and group-only focus rooms. Reads are governed by RLS below; every write goes through
-- server actions (app/app/groups/actions.ts) that check membership, role, rate limits and run the
-- content screen before writing with the service role.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,64}$'),
  name text not null check (char_length(name) between 3 and 60),
  description text check (char_length(description) <= 500),
  topic text not null default 'other'
    check (topic in ('exams', 'coding', 'writing', 'languages', 'work', 'creative', 'research', 'other')),
  -- public: anyone 18+ joins; request: moderators approve; private: invite link only (not listed).
  visibility text not null default 'public' check (visibility in ('public', 'request', 'private')),
  -- Invite links work for every group type and skip approval. Hidden from members' reads (see grants).
  invite_code text not null unique check (invite_code ~ '^[a-z0-9]{10}$'),
  rules text check (char_length(rules) <= 1000),
  owner_id uuid references auth.users (id) on delete set null,
  -- frozen: read-only (set by admins); deleted: hidden everywhere.
  status text not null default 'active' check (status in ('active', 'frozen', 'deleted')),
  member_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index groups_listing on public.groups (status, visibility, member_count desc);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  status text not null default 'active' check (status in ('active', 'pending', 'banned')),
  joined_at timestamptz not null default now(),
  -- Muted members can read but not post or comment until this time.
  muted_until timestamptz,
  primary key (group_id, user_id)
);
create index group_members_user on public.group_members (user_id, status);

create table public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'update' check (kind in ('update', 'question', 'resource', 'win')),
  body text not null check (char_length(body) between 1 and 2000),
  link_url text check (link_url ~ '^https?://' and char_length(link_url) <= 500),
  -- For "win" posts: a snapshot of the author's streak and focus minutes when posted.
  win jsonb,
  solved boolean not null default false,
  pinned boolean not null default false,
  -- held: caught by the content screen, waiting for a moderator; removed: taken down.
  status text not null default 'visible' check (status in ('visible', 'held', 'removed')),
  held_reason text,
  comment_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index group_posts_feed on public.group_posts (group_id, status, pinned desc, created_at desc);
create index group_posts_author on public.group_posts (author_id, created_at desc);

create table public.group_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.group_posts (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  -- One level of replies: a reply's parent is always a top-level comment (checked in the action).
  parent_id uuid references public.group_comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'visible' check (status in ('visible', 'held', 'removed')),
  held_reason text,
  created_at timestamptz not null default now()
);
create index group_comments_post on public.group_comments (post_id, created_at);
create index group_comments_author on public.group_comments (author_id, created_at desc);

create table public.group_reactions (
  post_id uuid not null references public.group_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction text not null check (reaction in ('clap', 'fire', 'heart')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction)
);

-- Rooms can belong to a group (members only).
alter table public.rooms drop constraint rooms_visibility_check;
alter table public.rooms add constraint rooms_visibility_check check (visibility in ('public', 'private', 'group'));
alter table public.rooms add column group_id uuid references public.groups (id) on delete cascade;
alter table public.rooms add constraint rooms_group_check check ((visibility = 'group') = (group_id is not null));
create index rooms_group on public.rooms (group_id) where group_id is not null;

-- Reports can point at a post, comment or group as well as a room.
alter table public.reports
  add column group_id uuid references public.groups (id) on delete set null,
  add column post_id uuid references public.group_posts (id) on delete set null,
  add column comment_id uuid references public.group_comments (id) on delete set null;
grant insert (group_id, post_id, comment_id) on public.reports to authenticated;

-- ---------------------------------------------------------------- helpers

-- The caller's role in a group if they're an active member, else null. Security definer so
-- policies can use it without recursing through group_members' own RLS.
create or replace function public.group_role(p_group uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.group_members
  where group_id = p_group and user_id = (select auth.uid()) and status = 'active';
$$;

create or replace function public.is_group_member(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.group_role(p_group) is not null;
$$;
revoke all on function public.group_role(uuid), public.is_group_member(uuid) from public, anon;
grant execute on function public.group_role(uuid), public.is_group_member(uuid) to authenticated;

-- Keep groups.member_count and group_posts.comment_count in step.
create or replace function public.sync_group_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  g uuid := coalesce(new.group_id, old.group_id);
begin
  update public.groups set member_count = (
    select count(*) from public.group_members where group_id = g and status = 'active'
  ) where id = g;
  return null;
end;
$$;
create trigger group_members_count after insert or update or delete on public.group_members
  for each row execute function public.sync_group_counts();

create or replace function public.sync_comment_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p uuid := coalesce(new.post_id, old.post_id);
begin
  update public.group_posts set comment_count = (
    select count(*) from public.group_comments where post_id = p and status = 'visible'
  ) where id = p;
  return null;
end;
$$;
create trigger group_comments_count after insert or update or delete on public.group_comments
  for each row execute function public.sync_comment_counts();
revoke all on function public.sync_group_counts(), public.sync_comment_counts() from public, anon, authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_posts enable row level security;
alter table public.group_comments enable row level security;
alter table public.group_reactions enable row level security;

-- Listed groups are visible to everyone signed in; private and frozen groups to their members.
create policy "See listed or own groups" on public.groups for select to authenticated
  using (
    status <> 'deleted'
    and ((status = 'active' and visibility in ('public', 'request')) or public.is_group_member(id))
  );

create policy "Members see the member list" on public.group_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_group_member(group_id));

-- Members read visible posts; authors also see their own held posts; moderators see everything.
create policy "Members read posts" on public.group_posts for select to authenticated
  using (
    public.is_group_member(group_id)
    and (status = 'visible' or author_id = (select auth.uid()) or public.group_role(group_id) in ('owner', 'moderator'))
  );

create policy "Members read comments" on public.group_comments for select to authenticated
  using (
    public.is_group_member(group_id)
    and (status = 'visible' or author_id = (select auth.uid()) or public.group_role(group_id) in ('owner', 'moderator'))
  );

create policy "Members read reactions" on public.group_reactions for select to authenticated
  using (exists (
    select 1 from public.group_posts p where p.id = post_id and public.is_group_member(p.group_id)
  ));

create policy "Group members see group rooms" on public.rooms for select to authenticated
  using (group_id is not null and status = 'active' and public.is_group_member(group_id));

revoke all on public.groups, public.group_members, public.group_posts, public.group_comments, public.group_reactions
  from anon, authenticated;
-- Every groups column except invite_code (moderators get it through the server).
grant select (id, slug, name, description, topic, visibility, rules, owner_id, status, member_count, created_at)
  on public.groups to authenticated;
grant select on public.group_members, public.group_posts, public.group_comments, public.group_reactions to authenticated;
