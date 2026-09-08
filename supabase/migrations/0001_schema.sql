-- =====================================================================
-- Moonshine Skins — 0001 schema
-- Run in the Supabase SQL editor (or `supabase db push`) in file order:
--   0001_schema.sql -> 0002_functions.sql -> 0003_rls.sql -> 0004_storage.sql
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- profiles: one row per auth user. Created automatically by a trigger on
-- auth.users (see 0002). Never contains passwords — Supabase Auth owns
-- credentials and they live in the auth schema, hashed, out of our reach.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  avatar_url  text,
  bio         text,
  -- 'user' | 'moderator' | 'admin'. Present from day one so moderation can be
  -- added later without a migration that touches every policy.
  role        text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  is_banned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint username_shape check (username ~ '^[A-Za-z0-9_-]{3,24}$'),
  constraint bio_length check (bio is null or char_length(bio) <= 500),
  constraint avatar_url_shape check (
    avatar_url is null or avatar_url ~ '^https://[A-Za-z0-9._~:/?#@!$&()*+,;=%-]+$'
  )
);

-- Case-insensitive uniqueness without requiring the citext extension.
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

-- ---------------------------------------------------------------------
-- skins
-- `colors` is the canonical skin data: a jsonb map of slot -> [r,g,b].
-- The .txt in Storage is generated from it, so the two cannot drift apart
-- in a way that changes what the preview shows.
-- Counter columns are caches maintained by triggers / SECURITY DEFINER
-- functions. Clients have no INSERT or UPDATE grant on them (see below).
-- ---------------------------------------------------------------------
create table if not exists public.skins (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  name              text not null,
  description       text,
  tags              text[] not null default '{}',
  mod_version       text,
  -- Bumped if the on-disk skin format changes; the parser branches on it.
  format_version    smallint not null default 1,
  colors            jsonb not null,
  file_path         text not null,
  file_size         integer not null default 0,
  original_filename text,
  -- 'published' | 'hidden' (owner-only) | 'removed' (moderation tombstone)
  status            text not null default 'published'
                    check (status in ('published', 'hidden', 'removed')),
  is_featured       boolean not null default false,
  upvote_count      integer not null default 0 check (upvote_count >= 0),
  downvote_count    integer not null default 0 check (downvote_count >= 0),
  download_count    bigint  not null default 0 check (download_count >= 0),
  score             integer generated always as (upvote_count - downvote_count) stored,
  search_vector     tsvector,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint skin_name_length check (char_length(name) between 3 and 60),
  constraint skin_description_length check (description is null or char_length(description) <= 1000),
  constraint skin_version_length check (mod_version is null or char_length(mod_version) <= 32),
  constraint skin_tag_count check (array_length(tags, 1) is null or array_length(tags, 1) <= 8),
  constraint skin_file_size check (file_size >= 0 and file_size <= 51200),
  constraint skin_colors_is_object check (jsonb_typeof(colors) = 'object'),
  -- Storage keys are always "<user uuid>/<skin uuid>.txt". Anchored regex, so
  -- "../" or an absolute path can never be written into this column.
  constraint skin_file_path_shape check (
    file_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.txt$'
  ),
  -- The first path segment must be the owner's own id, so a row cannot be
  -- pointed at a file sitting in someone else's storage folder.
  constraint skin_file_path_owned check (file_path like user_id::text || '/%')
);

create index if not exists skins_score_idx        on public.skins (score desc, created_at desc) where status = 'published';
create index if not exists skins_downloads_idx    on public.skins (download_count desc, created_at desc) where status = 'published';
create index if not exists skins_created_idx      on public.skins (created_at desc) where status = 'published';
create index if not exists skins_updated_idx      on public.skins (updated_at desc) where status = 'published';
create index if not exists skins_user_idx         on public.skins (user_id, created_at desc);
create index if not exists skins_featured_idx     on public.skins (is_featured) where is_featured and status = 'published';
create index if not exists skins_search_idx       on public.skins using gin (search_vector);
create index if not exists skins_tags_idx         on public.skins using gin (tags);

-- ---------------------------------------------------------------------
-- skin_votes: one row per (skin, user). The primary key is the "one active
-- vote per user per skin" rule — it is enforced by the database, not the UI.
-- ---------------------------------------------------------------------
create table if not exists public.skin_votes (
  skin_id    uuid not null references public.skins (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  vote       smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (skin_id, user_id)
);

create index if not exists skin_votes_user_idx on public.skin_votes (user_id);

-- ---------------------------------------------------------------------
-- skin_downloads: an append-only log. The partial unique index makes a
-- signed-in user's download idempotent per day, so holding down the button
-- does not inflate the counter.
-- ---------------------------------------------------------------------
create table if not exists public.skin_downloads (
  id          bigint generated always as identity primary key,
  skin_id     uuid not null references public.skins (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete set null,
  day         date not null default current_date,
  created_at  timestamptz not null default now()
);

create unique index if not exists skin_downloads_once_per_day
  on public.skin_downloads (skin_id, user_id, day)
  where user_id is not null;

create index if not exists skin_downloads_skin_idx on public.skin_downloads (skin_id, created_at desc);

-- =====================================================================
-- Table privileges.
--
-- RLS decides WHICH ROWS a role may touch. Column grants decide WHICH
-- COLUMNS. Both are needed: an RLS policy that allows a user to update
-- their own skin would, on its own, also let them update their own skin's
-- upvote_count. Revoking the grant closes that.
-- =====================================================================
revoke all on public.profiles       from anon, authenticated;
revoke all on public.skins          from anon, authenticated;
revoke all on public.skin_votes     from anon, authenticated;
revoke all on public.skin_downloads from anon, authenticated;

-- profiles: readable by everyone; a user may edit only presentation fields.
-- `role` and `is_banned` are deliberately absent from the update grant.
grant select on public.profiles to anon, authenticated;
grant update (username, avatar_url, bio, updated_at) on public.profiles to authenticated;

-- skins: readable by everyone (rows filtered by RLS).
grant select on public.skins to anon, authenticated;
grant insert (id, user_id, name, description, tags, mod_version, format_version,
              colors, file_path, file_size, original_filename, status)
  on public.skins to authenticated;
grant update (name, description, tags, mod_version, format_version,
              colors, file_path, file_size, original_filename, status, updated_at)
  on public.skins to authenticated;
grant delete on public.skins to authenticated;

-- votes: the client manages its own row directly; counters are trigger-derived.
grant select on public.skin_votes to anon, authenticated;
grant insert (skin_id, user_id, vote) on public.skin_votes to authenticated;
grant update (vote, updated_at) on public.skin_votes to authenticated;
grant delete on public.skin_votes to authenticated;

-- downloads: written only through the record_download() RPC, never directly.
grant select on public.skin_downloads to authenticated;
