# Security model

Written after reading back through the implementation, not from a checklist.
It describes what actually holds, and — in the second half — what does not.

## The shape of it

There is no server of ours. The browser talks straight to Supabase using a key
that every visitor has. So the only meaningful security boundary is inside
Postgres, and the React code is a convenience layer that a determined person can
simply skip by opening a console and calling `supabase.from('skins').update(...)`
themselves.

Everything below is written on that assumption: **assume the attacker is running
their own client.**

Three mechanisms do the work, and they are deliberately overlapping:

1. **Row Level Security** — which *rows* a role may read or write.
2. **Column-level `GRANT`s** — which *columns*. RLS alone would let an owner
   update their own skin's `upvote_count`, because it is their own row. The
   grant is what closes that.
3. **`BEFORE` triggers** — invariants that outlive a mistake in either of the
   above (ownership never changes, counters only move from inside
   `SECURITY DEFINER` code).

## Credentials

- The frontend only ever holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  Both are compiled into the public bundle. That is fine: the anon key asserts
  "an anonymous visitor" and nothing else.
- The `service_role` key bypasses RLS completely. It appears nowhere in this
  repository, in no `VITE_` variable, and in no Actions step. The deploy
  workflow greps `dist/` for it and fails the build on a hit.
- Passwords are never seen by this application. `supabase.auth.signUp` and
  `signInWithPassword` are the only paths, hashes live in the `auth` schema, and
  there is no custom hashing anywhere. Nothing in `public.*` stores a credential.
- Sessions are held by the Supabase client in `localStorage` with auto-refresh.
  `onAuthStateChange` clears state when a token turns out to be expired.

## Counters cannot be forged

`upvote_count`, `downvote_count` and `download_count` are caches. The client has
**no `INSERT` or `UPDATE` grant on any of those columns**, so this:

```js
supabase.from('skins').update({ upvote_count: 999999 }).eq('id', id)
```

is rejected by Postgres before RLS is even consulted. On top of that,
`skins_before_write()` copies the old values back over any attempted change
unless `app.internal_counter_write` is set, which only `apply_vote_delta()`,
`record_download()` and `recount_skin_totals()` do — and those are
`SECURITY DEFINER`, so a client cannot set that flag itself.

Votes move totals through a trigger on `skin_votes`, using relative deltas
(`count = count + 1`) inside a single statement. Two people voting at once
serialise on the row lock rather than overwriting each other's read. Switching
upvote to downvote applies `-1` and `+1` in one statement, so a skin at three
upvotes becomes two up / one down — the arithmetic you asked for.

`recount_skin_totals()` rebuilds every total from `skin_votes` if a counter is
ever suspected of drifting.

## One vote per person

The primary key on `skin_votes (skin_id, user_id)` makes double-voting
impossible at the storage layer. Insert and update policies both require
`user_id = auth.uid()`, so votes cannot be cast on someone else's behalf, and
`skin_owner(skin_id) is distinct from auth.uid()` blocks self-voting.

`skin_owner()` is `SECURITY DEFINER` on purpose: written as a plain subquery, the
check would read `skins` through the reader's own RLS, and a hidden skin would
return no row, quietly turning "not my skin" into true. Reading the owner with
elevated rights avoids that.

Ballots are readable only by the person who cast them.

## Uploads

The file a user picks is parsed in the browser and **thrown away**. What is
stored is a file this application generated from the parsed colour values. The
bucket therefore contains no attacker-supplied bytes at all — the strongest
version of "validate the upload" is not to keep it.

Layered on that: `.ini`/`.txt` extension check, 50 KB limit, a control-character
scan that rejects anything binary, per-value `0–255` integer parsing, a
`text/plain` MIME allowlist on the bucket, and a 51200-byte limit enforced by
Supabase rather than by the page.

Avatars *are* user bytes, and they are the sharper edge: PNG, JPEG and WebP only,
2 MB cap, both enforced on the bucket. **SVG is excluded deliberately** — an SVG
served from your own origin is a script execution primitive.

### Path traversal

Storage keys are built from `auth.uid()` and a freshly generated UUID. The
uploaded filename is stored as a display string and never used to build a path.
Three independent things enforce that:

- `skins.file_path` has a CHECK matching exactly `<uuid>/<uuid>.txt`, anchored,
  so `../` cannot be written into the column at all;
- a second CHECK requires the first segment to equal the row's own `user_id`, so
  a skin row cannot be pointed at a file in someone else's folder;
- the storage policies require `(storage.foldername(name))[1] = auth.uid()::text`
  with exactly one folder level.

## Injection

All database access goes through PostgREST or `rpc()`, which bind parameters.
`search_skins()` contains no dynamic SQL — the sort is a `CASE` over a bound
parameter, and the username search escapes `%`, `_` and `\` before an `ILIKE`, so
a search for `100%` is literal rather than a wildcard.

For XSS: nothing in the codebase calls `dangerouslySetInnerHTML`, and no user
string is ever put into an `href` unescaped. `profiles.avatar_url` is
constrained to `^https://…`, which rules out `javascript:` and `data:` URLs in an
`<img src>`. Usernames are validated to `[A-Za-z0-9_-]{3,24}` in the browser, in
a CHECK constraint, and again in `username_is_allowed()` — so they are safe in a
URL path and cannot carry markup.

## Ownership

`user_id` and `created_at` are forced back to their old values on every update by
`skins_before_write()`, so a skin cannot be reassigned even by its owner, even if
an RLS policy were loosened by mistake. Profiles get the same treatment for `id`,
`role` and `is_banned` — the last two are also absent from the update grant, so
privilege escalation needs SQL-editor access, not a crafted request.

Profile rows can only be created by the `handle_new_user()` trigger. There is no
`INSERT` policy on `profiles` at all.

---

# What this does *not* protect against

## Anonymous download counts are inflatable

`record_download()` de-duplicates per signed-in user per day. Anonymous
downloads cannot be de-duplicated — there is no identity to key on, and a static
site has no server-side IP handling. Someone can call the RPC in a loop and run
a skin's counter up.

Nothing in the app trusts that number for anything but sorting, and every event
is logged in `skin_downloads`, so inflation is detectable after the fact. If it
becomes a real problem, the fix is a Supabase Edge Function that sees the client
IP and rate-limits before calling the RPC. That is the one place where "no
custom backend" genuinely costs something.

## Vote farming

One account, one vote. But accounts are free, and the only barrier is a
confirmable email address. A determined person with a catch-all domain can farm
votes. Turning on hCaptcha under **Authentication ▸ Settings** raises the cost;
so does requiring an account to be a day old before it can vote, which is a
policy change of about three lines.

## Storage abuse by authenticated users

A signed-in user can write `.txt` files into their own folder without ever
creating a skin row. Each is capped at 50 KB, but nothing caps the *number*.
Supabase has no per-user storage quota. A cheap mitigation is a periodic query
for objects in the `skins` bucket with no matching row, deleting the orphans.

## Content moderation

The username blocklist in `public.blocked_words` is a starter list — extend it
before opening signups. Skin names, descriptions and tags are length-limited,
character-constrained (tags) and escaped on render, but they are **not** filtered
for content. Moderators can delete anything; there is no automated filter and no
reporting flow yet. The schema has room for both (`status`, `role`,
`is_featured`) without a migration.

## No Content-Security-Policy by default

GitHub Pages cannot set response headers, so a CSP has to be a `<meta>` tag.
A tested-shaped policy is commented into `index.html` with your project URL to
fill in. Without it, an XSS bug anywhere would have full run of the page,
including the session token in `localStorage`. Worth turning on.

## Other things worth knowing

- **Avatar URLs point anywhere on the public internet.** They are set by this app
  to Supabase Storage URLs, but the column accepts any `https://` URL, so a
  crafted request could point one at an external tracker that sees visitors' IPs.
  Constraining the prefix to your project's storage URL closes it.
- **Email addresses are not exposed** by any policy or view. `profiles` contains
  no email column at all.
- **Deleting a skin removes the row first, then the file.** If the second step
  fails you get an orphaned object, never a live row with a dead link. Votes go
  with the row by cascade.
- **`profiles` is world-readable**, including `role` and `is_banned`. That is
  intentional (moderator badges later) but means "who are the admins" is public.
- **Rate limits on auth** are Supabase's defaults. Check them before launch day.

## Before going public

- [ ] Confirm every table in `public` reports `rowsecurity = true`.
- [ ] Confirm the `skins` bucket is `text/plain` only and `avatars` excludes SVG.
- [ ] Extend `blocked_words`.
- [ ] Turn on the CSP meta tag and retest upload plus the 3D preview.
- [ ] Enable hCaptcha on signup.
- [ ] Make yourself an admin (see ADMIN_SETUP.md) and confirm a second account
      cannot edit your skin — try it from the browser console, not the UI.
