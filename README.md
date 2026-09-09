# Moonshine Skins

A community skin repository for **Moonshine**, the Super Mario Sunshine practice mod.
Upload the colour set from your `susamune.ini`, see it on a Mario + FLUDD model, and
let other runners vote on it and download it.

Frontend: React + TypeScript + Vite + Tailwind, hosted on GitHub Pages.
Backend: Supabase (Postgres, Auth, Storage) — no server of our own.

Live at `https://zeldocto.github.io/moonshine-customs/`

---

## What a skin is

Moonshine writes a settings file. Buried in its `[creation_jp]` / `[creation_us]`
sections are seventeen colour keys:

```
mario_cap_rgb = 255,255,255
mario_shirt_rgb = 255,255,255
...
mario_colors_enabled = 64
fludd_paint_rgb = 255,255,255
...
fludd_colors_enabled = 0
```

The site parses **only those keys** out of the uploaded file, in the browser. ISO
paths, key binds, timer layout and every other setting are discarded before
anything is sent to the server. What gets stored is the colour data and a small
generated `.txt` containing the same values.

All of that lives in one place — [`src/lib/skin-format/slots.ts`](src/lib/skin-format/slots.ts).
If Moonshine renames a key or adds a colour, edit that table and the parser,
download file, RGB list and 3D preview all follow.

## Quick start

```bash
git clone https://github.com/zeldocto/moonshine-customs.git
cd moonshine-customs
npm install
cp .env.example .env      # fill in the two values from your Supabase project
npm run dev
```

Full first-time setup — Supabase project, tables, policies, buckets, deployment —
is in **[ADMIN_SETUP.md](ADMIN_SETUP.md)**.

## Credentials

| Value | Where it goes | Public? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env`, Actions variable | Yes |
| `VITE_SUPABASE_ANON_KEY` | `.env`, Actions variable | Yes — by design |
| `service_role` key | Supabase dashboard only | **No. Never.** |
| Database password | Supabase dashboard only | **No. Never.** |

Anything prefixed `VITE_` is compiled into the JavaScript bundle and readable by
every visitor. The anon key is built for that: it authenticates a request as
"anonymous" and nothing more, and Row Level Security decides what that is allowed
to do. The service-role key bypasses RLS entirely, so putting it in a `VITE_`
variable would hand every visitor full database access. The deploy workflow greps
the built bundle for one and fails the build if it finds it.

## Layout

```
src/
├── components/
│   ├── preview/            3D: viewer, placeholder model, glTF loader,
│   │                       applySkinToModel(), model configuration
│   ├── SkinCard, SkinGrid, SkinPreview, SkinSilhouette, SkinForm
│   ├── VoteButtons, DownloadButton, ColorList, Pagination
│   └── Navbar, Avatar, Toaster, ErrorBoundary, ProtectedRoute
├── pages/                  Home, Browse, SkinDetail, Upload, EditSkin,
│                           Profile, Settings, Login, Register, …
├── lib/
│   ├── skin-format/        slots.ts, parser.ts, serializer.ts
│   ├── supabase.ts  auth.tsx  skins.ts  votes.ts  downloads.ts
│   └── profiles.ts  validation.ts  errors.ts
├── hooks/  types/  utils/
supabase/migrations/        0001 schema · 0002 functions · 0003 RLS · 0004 storage
```

## The preview pipeline

```
SkinPreview                 lazy-loads WebGL only when scrolled into view
  └─ MarioViewer            canvas, lights, OrbitControls, idle bob
       └─ PlaceholderMario  original geometry, each mesh tagged with a slot id
          GltfMario         the real model, once you supply one
            └─ applySkinToModel(skinData, object3D)
```

Grid cards deliberately use a flat SVG (`SkinSilhouette`) instead of a canvas:
twenty live WebGL contexts on one page is not something a phone should be asked
to do, and the SVG reads the colours just as clearly. The 3D viewer appears on
the home hero, the skin page and the upload preview, where it earns its cost.

The real model is not included — see [public/models/README.md](public/models/README.md).

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server at <http://localhost:5173> |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Typecheck only |

Check the parser against a real settings file:

```bash
npx esbuild scripts/verify-parser.ts --bundle --platform=node --format=esm --outfile=/tmp/v.mjs
node /tmp/v.mjs path/to/susamune.ini
```

## Security

The security model, what it does and does not cover, and the known gaps are
written up in **[SECURITY.md](SECURITY.md)**. Worth reading before the site is
public.

Not affiliated with Nintendo. No game assets are distributed here.
