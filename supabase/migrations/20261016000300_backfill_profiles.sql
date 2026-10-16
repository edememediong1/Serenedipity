-- The profile trigger only sees users created after it is installed. Backfill accounts
-- that already existed when the profiles migration was first applied (for example,
-- accounts created while setting up a remote Supabase project).

insert into public.profiles (id, display_name)
select
  users.id,
  nullif(
    left(
      coalesce(
        users.raw_user_meta_data ->> 'given_name',
        split_part(
          coalesce(
            users.raw_user_meta_data ->> 'full_name',
            users.raw_user_meta_data ->> 'name',
            ''
          ),
          ' ',
          1
        )
      ),
      60
    ),
    ''
  )
from auth.users as users
on conflict (id) do nothing;
