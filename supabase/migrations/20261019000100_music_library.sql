-- Music library for demos and testing: ten synthesized tracks (scripts/music/render.py) and
-- editorial playlists. Playlists are curated by the team (admin tools later); users can only read.

-- The demo audio is generated in-house from code, so it carries no third-party rights.
insert into public.tracks (slug, title, category, style, file_url, duration_seconds, source, license_record) values
  ('second-cup', 'Second Cup', 'deep-focus', 'lofi', '/audio/second-cup.mp3', 150,
   'Synthesized in-house (scripts/music/render.py)', 'Original audio generated from code for this app; no third-party rights. Demo content: replace or keep after review before launch.'),
  ('rainy-bookstore-jazz', 'Rainy Bookstore Jazz', 'calm-mind', 'jazz', '/audio/rainy-bookstore-jazz.mp3', 150,
   'Synthesized in-house (scripts/music/render.py)', 'Original audio generated from code for this app; no third-party rights. Demo content: replace or keep after review before launch.'),
  ('reading-room-rain', 'Rain on the Reading Room Window', 'deep-focus', 'ambient', '/audio/reading-room-rain.mp3', 150,
   'Synthesized in-house (scripts/music/render.py)', 'Original audio generated from code for this app; no third-party rights. Demo content: replace or keep after review before launch.'),
  ('lagos-glass', 'Lagos Glass', 'creative-flow', 'afro-lounge', '/audio/lagos-glass.mp3', 150,
   'Synthesized in-house (scripts/music/render.py)', 'Original audio generated from code for this app; no third-party rights. Demo content: replace or keep after review before launch.'),
  ('morning-pages', 'Morning Pages Piano', 'clear-the-fog', 'piano', '/audio/morning-pages.mp3', 150,
   'Synthesized in-house (scripts/music/render.py)', 'Original audio generated from code for this app; no third-party rights. Demo content: replace or keep after review before launch.'),
  ('slow-tide', 'Slow Tide', 'wind-down', 'ambient', '/audio/slow-tide.mp3', 150,
   'Synthesized in-house (scripts/music/render.py)', 'Original audio generated from code for this app; no third-party rights. Demo content: replace or keep after review before launch.'),
  ('glass-hours', 'Glass Hours', 'deep-focus', 'ambient', '/audio/glass-hours.mp3', 150,
   'Synthesized in-house (scripts/music/render.py)', 'Original audio generated from code for this app; no third-party rights. Demo content: replace or keep after review before launch.'),
  ('night-rain', 'Night Rain', 'clear-the-fog', 'ambient', '/audio/night-rain.mp3', 150,
   'Synthesized in-house (scripts/music/render.py)', 'Original audio generated from code for this app; no third-party rights. Demo content: replace or keep after review before launch.'),
  ('blue-hour', 'Blue Hour', 'wind-down', 'lofi', '/audio/blue-hour.mp3', 150,
   'Synthesized in-house (scripts/music/render.py)', 'Original audio generated from code for this app; no third-party rights. Demo content: replace or keep after review before launch.'),
  ('deep-current', 'Deep Current', 'deep-focus', 'binaural', '/audio/deep-current.mp3', 150,
   'Synthesized in-house (scripts/music/render.py)', 'Original audio generated from code for this app; no third-party rights. Demo content: replace or keep after review before launch.')
on conflict (slug) do update set
  title = excluded.title, category = excluded.category, style = excluded.style, file_url = excluded.file_url,
  duration_seconds = excluded.duration_seconds, source = excluded.source, license_record = excluded.license_record;

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 280),
  category text not null check (category in ('deep-focus', 'calm-mind', 'clear-the-fog', 'creative-flow', 'wind-down')),
  -- Which of the three home-screen states it belongs to.
  state text not null check (state in ('focus', 'calm', 'clear')),
  is_premium boolean not null default false,
  featured boolean not null default false,
  position integer not null default 0,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create table public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null default 0,
  primary key (playlist_id, track_id)
);

alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
create policy "Signed-in users read published playlists" on public.playlists for select to authenticated
  using (status = 'published');
create policy "Signed-in users read playlist tracks" on public.playlist_tracks for select to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.status = 'published'));
revoke all on public.playlists, public.playlist_tracks from anon, authenticated;
grant select on public.playlists, public.playlist_tracks to authenticated;

insert into public.playlists (slug, title, description, category, state, featured, position) values
  ('second-cup', 'Second Cup', 'Dusty Rhodes and a lazy beat for the second hour of work.', 'deep-focus', 'focus', true, 1),
  ('rainy-bookstore-jazz', 'Rainy Bookstore Jazz', 'Brushed drums, walking bass and rain on the glass.', 'calm-mind', 'calm', true, 0),
  ('reading-room-rain', 'Rain on the Reading Room Window', 'Steady rain, a warm pad and nothing to distract you.', 'deep-focus', 'focus', true, 2),
  ('lagos-glass', 'Lagos Glass', 'An easy Afro-lounge groove to keep ideas moving.', 'creative-flow', 'clear', true, 3),
  ('morning-pages', 'Morning Pages Piano', 'Flowing solo piano for a clear start.', 'clear-the-fog', 'clear', true, 4),
  ('slow-tide', 'Slow Tide', 'Waves, long pads and low piano to wind down.', 'wind-down', 'calm', true, 5),
  ('deep-current', 'Deep Current', 'A soft binaural tone under ambient pads. Best with headphones.', 'deep-focus', 'focus', false, 6);

insert into public.playlist_tracks (playlist_id, track_id, position)
select p.id, t.id, x.pos
from (values
  ('second-cup', 'second-cup', 0), ('second-cup', 'blue-hour', 1), ('second-cup', 'glass-hours', 2),
  ('rainy-bookstore-jazz', 'rainy-bookstore-jazz', 0), ('rainy-bookstore-jazz', 'blue-hour', 1), ('rainy-bookstore-jazz', 'reading-room-rain', 2),
  ('reading-room-rain', 'reading-room-rain', 0), ('reading-room-rain', 'night-rain', 1), ('reading-room-rain', 'deep-current', 2),
  ('lagos-glass', 'lagos-glass', 0), ('lagos-glass', 'second-cup', 1), ('lagos-glass', 'morning-pages', 2),
  ('morning-pages', 'morning-pages', 0), ('morning-pages', 'glass-hours', 1), ('morning-pages', 'slow-tide', 2),
  ('slow-tide', 'slow-tide', 0), ('slow-tide', 'blue-hour', 1), ('slow-tide', 'night-rain', 2),
  ('deep-current', 'deep-current', 0), ('deep-current', 'glass-hours', 1), ('deep-current', 'reading-room-rain', 2)
) as x(playlist, track, pos)
join public.playlists p on p.slug = x.playlist
join public.tracks t on t.slug = x.track;

-- Give the team rooms the new music.
update public.rooms set track_id = (select id from public.tracks where slug = 'second-cup')
  where host_id is null and title = 'Deep work sprint';
