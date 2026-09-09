-- =====================================================================
-- Moonshine Skins — 0003 Row Level Security
--
-- Every table below denies everything by default once RLS is enabled;
-- the policies re-open exactly what the app needs. Combined with the
-- column grants in 0001, this is the app's real security boundary — the
-- React code is only a convenience layer on top of it.
-- =====================================================================

create or replace function public.is_banned()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select is_banned from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_banned() to anon, authenticated;

alter table public.profiles       enable row level security;
alter table public.skins          enable row level security;
alter table public.skin_votes     enable row level security;
alter table public.skin_downloads enable row level security;
alter table public.blocked_words  enable row level security;

-- ------------------------------ profiles ------------------------------
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No INSERT or DELETE policy: profiles are created by the auth trigger and
-- removed by the cascade from auth.users. A client cannot do either.

-- -------------------------------- skins --------------------------------
drop policy if exists skins_select_public on public.skins;
create policy skins_select_public
  on public.skins for select
  to anon, authenticated
  using (
    status = 'published'
    or user_id = (select auth.uid())
    or public.is_staff()
  );

drop policy if exists skins_insert_own on public.skins;
create policy skins_insert_own
  on public.skins for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.is_banned()
    and status in ('published', 'hidden')
  );

drop policy if exists skins_update_own on public.skins;
create policy skins_update_own
  on public.skins for update
  to authenticated
  using (user_id = (select auth.uid()) or public.is_staff())
  with check (user_id = (select auth.uid()) or public.is_staff());

drop policy if exists skins_delete_own on public.skins;
create policy skins_delete_own
  on public.skins for delete
  to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

-- ------------------------------ skin_votes -----------------------------
-- A user can read only their own votes. Aggregate totals come from the
-- cached counters on skins, so nothing is lost by keeping ballots private.
drop policy if exists skin_votes_select_own on public.skin_votes;
create policy skin_votes_select_own
  on public.skin_votes for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

drop policy if exists skin_votes_insert_own on public.skin_votes;
create policy skin_votes_insert_own
  on public.skin_votes for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.is_banned()
    and public.skin_owner(skin_id) is distinct from (select auth.uid())
  );

drop policy if exists skin_votes_update_own on public.skin_votes;
create policy skin_votes_update_own
  on public.skin_votes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.skin_owner(skin_id) is distinct from (select auth.uid())
  );

drop policy if exists skin_votes_delete_own on public.skin_votes;
create policy skin_votes_delete_own
  on public.skin_votes for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------- skin_downloads ---------------------------
-- Written only by record_download() (SECURITY DEFINER). No INSERT policy
-- exists, so a client cannot forge download events even with a valid JWT.
drop policy if exists skin_downloads_select_own on public.skin_downloads;
create policy skin_downloads_select_own
  on public.skin_downloads for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

-- ---------------------------- blocked_words ----------------------------
-- RLS on with zero policies = readable by nobody through the API. The
-- word list is only consulted inside SECURITY DEFINER functions.
