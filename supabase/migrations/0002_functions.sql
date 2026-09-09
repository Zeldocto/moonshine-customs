-- =====================================================================
-- Moonshine Skins — 0002 functions, triggers, views, RPCs
-- =====================================================================

-- ---------------------------------------------------------------------
-- Username moderation list. Kept as a table so it can be edited from the
-- dashboard (or a future admin panel) without a code deploy.
-- Seeded with a deliberately small starter list — extend it with a
-- maintained wordlist before opening signups to the public.
-- ---------------------------------------------------------------------
create table if not exists public.blocked_words (
  word text primary key,
  created_at timestamptz not null default now()
);

revoke all on public.blocked_words from anon, authenticated;

insert into public.blocked_words (word) values
  ('fuck'), ('shit'), ('cunt'), ('bitch'), ('rape'), ('nazi'),
  ('admin'), ('moderator'), ('moonshine'), ('official'), ('support'), ('system')
on conflict do nothing;

-- Normalises common letter/number substitutions before matching, so "sh1t"
-- is caught along with "shit".
create or replace function public.normalise_for_moderation(p_text text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select translate(lower(coalesce(p_text, '')), '0134578@$!', 'oleastbasi');
$$;

create or replace function public.username_is_allowed(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_username ~ '^[A-Za-z0-9_-]{3,24}$'
     and not exists (
       select 1 from public.blocked_words b
       where public.normalise_for_moderation(p_username) like '%' || b.word || '%'
     );
$$;

grant execute on function public.username_is_allowed(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Reads a skin's owner while bypassing RLS. Used inside policies so that
-- "you cannot vote on your own skin" holds even for rows the voter cannot
-- otherwise see.
create or replace function public.skin_owner(p_skin_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select user_id from public.skins where id = p_skin_id;
$$;

grant execute on function public.skin_owner(uuid) to anon, authenticated;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

grant execute on function public.is_staff() to anon, authenticated;

-- ---------------------------------------------------------------------
-- New auth user -> profile row.
-- Runs as SECURITY DEFINER because the user has no INSERT grant on
-- profiles: a profile can only ever come into existence this way, so
-- there is no path for a client to create a profile it does not own.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  candidate text;
  attempt   int := 0;
begin
  candidate := requested;

  if candidate is null or not public.username_is_allowed(candidate) then
    candidate := 'runner' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  -- Resolve collisions rather than failing signup outright.
  while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
    attempt := attempt + 1;
    exit when attempt > 20;
    candidate := substr(coalesce(requested, 'runner'), 1, 18) || attempt::text;
    if not public.username_is_allowed(candidate) then
      candidate := 'runner' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    end if;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, candidate)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- profiles guards
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Immutable regardless of grants.
  new.id         := old.id;
  new.created_at := old.created_at;

  if new.username is distinct from old.username
     and not public.username_is_allowed(new.username) then
    raise exception 'username_not_allowed' using errcode = 'check_violation';
  end if;

  -- Privilege fields are only writable by roles that bypass this trigger's
  -- guard (service_role / dashboard), never through the anon key.
  if current_setting('app.privileged_write', true) is distinct from '1' then
    new.role      := old.role;
    new.is_banned := old.is_banned;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------
-- skins guards + derived columns
-- ---------------------------------------------------------------------
create or replace function public.skins_before_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Trim/normalise tags: lowercase, deduplicated, short, no whitespace tricks.
  if new.tags is not null then
    new.tags := (
      select coalesce(array_agg(distinct t), '{}')
      from (
        select left(lower(trim(unnest)), 24) as t
        from unnest(new.tags)
      ) s
      where t ~ '^[a-z0-9][a-z0-9 _-]{0,23}$'
    );
  end if;

  new.search_vector :=
      setweight(to_tsvector('simple', coalesce(new.name, '')), 'A')
   || setweight(to_tsvector('simple', array_to_string(coalesce(new.tags, '{}'), ' ')), 'B')
   || setweight(to_tsvector('simple', coalesce(new.description, '')), 'C');

  if tg_op = 'UPDATE' then
    -- Ownership and creation time can never move.
    new.user_id    := old.user_id;
    new.created_at := old.created_at;

    -- Counters are only writable from the SECURITY DEFINER routines below,
    -- which set app.internal_counter_write for the duration of the statement.
    if current_setting('app.internal_counter_write', true) is distinct from '1' then
      new.upvote_count   := old.upvote_count;
      new.downvote_count := old.downvote_count;
      new.download_count := old.download_count;
    end if;

    if current_setting('app.privileged_write', true) is distinct from '1' then
      new.is_featured := old.is_featured;
    end if;

    new.updated_at := now();
  else
    new.upvote_count   := 0;
    new.downvote_count := 0;
    new.download_count := 0;
    new.is_featured    := false;
  end if;

  return new;
end;
$$;

drop trigger if exists skins_before_write on public.skins;
create trigger skins_before_write
  before insert or update on public.skins
  for each row execute function public.skins_before_write();

-- ---------------------------------------------------------------------
-- Vote counters.
--
-- Correctness under concurrency: every branch is a single UPDATE with a
-- relative delta (count = count + 1), which takes a row lock and re-reads
-- the current value. Two simultaneous votes on the same skin serialise on
-- that lock instead of overwriting each other.
-- ---------------------------------------------------------------------
create or replace function public.apply_vote_delta(p_skin_id uuid, p_up int, p_down int)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.internal_counter_write', '1', true);
  update public.skins
     set upvote_count   = greatest(0, upvote_count + p_up),
         downvote_count = greatest(0, downvote_count + p_down)
   where id = p_skin_id;
  perform set_config('app.internal_counter_write', '0', true);
end;
$$;

create or replace function public.on_vote_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.apply_vote_delta(
      new.skin_id,
      case when new.vote = 1 then 1 else 0 end,
      case when new.vote = -1 then 1 else 0 end
    );
  elsif tg_op = 'UPDATE' then
    if new.vote is distinct from old.vote then
      -- Switching upvote -> downvote removes the up and adds the down in one
      -- statement, so a 3-upvote skin becomes 2 up / 1 down, not 3 / 1.
      perform public.apply_vote_delta(
        new.skin_id,
        (case when new.vote = 1 then 1 else 0 end) - (case when old.vote = 1 then 1 else 0 end),
        (case when new.vote = -1 then 1 else 0 end) - (case when old.vote = -1 then 1 else 0 end)
      );
    end if;
  else
    perform public.apply_vote_delta(
      old.skin_id,
      case when old.vote = 1 then -1 else 0 end,
      case when old.vote = -1 then -1 else 0 end
    );
  end if;

  return null;
end;
$$;

drop trigger if exists skin_votes_counter on public.skin_votes;
create trigger skin_votes_counter
  after insert or update or delete on public.skin_votes
  for each row execute function public.on_vote_change();

drop trigger if exists skin_votes_touch on public.skin_votes;
create trigger skin_votes_touch
  before update on public.skin_votes
  for each row execute function public.touch_updated_at();

-- Recomputes every cached counter from the source tables. Cheap enough to
-- run from the dashboard if a counter is ever suspected of drifting.
create or replace function public.recount_skin_totals()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.internal_counter_write', '1', true);
  update public.skins s
     set upvote_count   = coalesce(v.up, 0),
         downvote_count = coalesce(v.down, 0)
    from (
      select skin_id,
             count(*) filter (where vote = 1)  as up,
             count(*) filter (where vote = -1) as down
        from public.skin_votes group by skin_id
    ) v
   where v.skin_id = s.id;
  perform set_config('app.internal_counter_write', '0', true);
end;
$$;

-- ---------------------------------------------------------------------
-- Downloads.
-- The client never writes download_count. It calls this function, which
-- logs the event and bumps the cache in one transaction.
-- ---------------------------------------------------------------------
create or replace function public.record_download(p_skin_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_counted boolean := true;
  v_total   bigint;
begin
  if not exists (select 1 from public.skins where id = p_skin_id and status = 'published') then
    raise exception 'skin_not_available' using errcode = 'no_data_found';
  end if;

  if v_uid is null then
    -- Anonymous download: logged, but not de-duplicated (see SECURITY.md).
    insert into public.skin_downloads (skin_id, user_id) values (p_skin_id, null);
  else
    insert into public.skin_downloads (skin_id, user_id) values (p_skin_id, v_uid)
    on conflict (skin_id, user_id, day) do nothing;
    -- Already downloaded today: don't count it twice.
    if not found then
      v_counted := false;
    end if;
  end if;

  if v_counted then
    perform set_config('app.internal_counter_write', '1', true);
    update public.skins
       set download_count = download_count + 1
     where id = p_skin_id
    returning download_count into v_total;
    perform set_config('app.internal_counter_write', '0', true);
  else
    select download_count into v_total from public.skins where id = p_skin_id;
  end if;

  return v_total;
end;
$$;

revoke all on function public.record_download(uuid) from public;
grant execute on function public.record_download(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Read model.
-- security_invoker keeps the caller's RLS in force, so the view cannot be
-- used to read rows the underlying policies would hide.
-- ---------------------------------------------------------------------
create or replace view public.skins_with_author
with (security_invoker = true) as
  select
    s.id, s.user_id, s.name, s.description, s.tags, s.mod_version,
    s.format_version, s.colors, s.file_path, s.file_size, s.original_filename,
    s.status, s.is_featured, s.upvote_count, s.downvote_count, s.score,
    s.download_count, s.search_vector, s.created_at, s.updated_at,
    p.username   as author_username,
    p.avatar_url as author_avatar_url
  from public.skins s
  join public.profiles p on p.id = s.user_id;

grant select on public.skins_with_author to anon, authenticated;

-- ---------------------------------------------------------------------
-- Browse / search / sort / paginate in one query.
-- SECURITY INVOKER (the default): RLS still applies to every row read.
-- All user input arrives as bound parameters — there is no dynamic SQL
-- anywhere in this function, so there is nothing for an injection to hit.
-- ---------------------------------------------------------------------
create or replace function public.search_skins(
  p_query   text default null,
  p_sort    text default 'top',
  p_limit   int  default 20,
  p_offset  int  default 0,
  p_author  uuid default null,
  p_tag     text default null
)
returns table (
  id uuid,
  user_id uuid,
  name text,
  description text,
  tags text[],
  mod_version text,
  format_version smallint,
  colors jsonb,
  file_path text,
  file_size integer,
  original_filename text,
  status text,
  is_featured boolean,
  upvote_count integer,
  downvote_count integer,
  score integer,
  download_count bigint,
  created_at timestamptz,
  updated_at timestamptz,
  author_username text,
  author_avatar_url text,
  total_count bigint
)
language plpgsql
stable
as $$
#variable_conflict use_column
declare
  v_limit  int := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_query  text := nullif(trim(coalesce(p_query, '')), '');
  v_like   text;
begin
  -- Escape LIKE metacharacters so a username search for "100%" is literal.
  v_like := '%' || replace(replace(replace(coalesce(v_query, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  with filtered as (
    select v.*, count(*) over () as total_count
      from public.skins_with_author v
     where v.status = 'published'
       and (p_author is null or v.user_id = p_author)
       and (p_tag is null or p_tag = any (v.tags))
       and (
         v_query is null
         or v.search_vector @@ websearch_to_tsquery('simple', v_query)
         or v.author_username ilike v_like escape '\'
       )
  )
  select f.id, f.user_id, f.name, f.description, f.tags, f.mod_version,
         f.format_version, f.colors, f.file_path, f.file_size, f.original_filename,
         f.status, f.is_featured, f.upvote_count, f.downvote_count, f.score,
         f.download_count, f.created_at, f.updated_at,
         f.author_username, f.author_avatar_url, f.total_count
    from filtered f
   order by
     case when p_sort = 'top'       then f.score end desc nulls last,
     case when p_sort = 'downloads' then f.download_count end desc nulls last,
     case when p_sort = 'new'       then f.created_at end desc nulls last,
     case when p_sort = 'old'       then f.created_at end asc  nulls last,
     case when p_sort = 'updated'   then f.updated_at end desc nulls last,
     f.created_at desc
   limit v_limit offset v_offset;
end;
$$;

grant execute on function public.search_skins(text, text, int, int, uuid, text) to anon, authenticated;

-- Small aggregate for the community page. One round trip, no row transfer.
create or replace function public.community_stats()
returns table (skin_count bigint, creator_count bigint, download_total bigint, vote_total bigint)
language sql
stable
as $$
  select
    (select count(*) from public.skins where status = 'published'),
    (select count(distinct user_id) from public.skins where status = 'published'),
    (select coalesce(sum(download_count), 0) from public.skins where status = 'published'),
    (select count(*) from public.skin_votes);
$$;

grant execute on function public.community_stats() to anon, authenticated;
