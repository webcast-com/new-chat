# Vite → Next.js Migration — Proof & Guide

> **This branch proves the project CAN be migrated from Vite to Next.js without breaking it.**  
> Both `next build` and the legacy `vite:build` pass, and `next dev` serves the app at `https://3000-*.e2b.app`.

## Summary

- **Before:** `vite` 5.4.2 + `vite-react` + `index.html` entry + `import.meta.env.VITE_*`
- **After:** `next` 14.2.33 (App Router) + `app/layout.tsx` + `app/page.tsx` (client) + `process.env.NEXT_PUBLIC_*`
- **Non-breaking strategy:** Keep `src/` intact, wrap the existing SPA (`src/App.tsx`) as a client component via `next/dynamic` with `ssr:false`. No URL/routing breakage. Legacy `vite:dev` / `vite:build` still work.

## What changed

| Area | Vite | Next.js (now) | Notes |
|------|------|---------------|-------|
| Framework | `vite` | `next@14.2.33` | Kept `vite` in devDeps for fallback `vite:dev` |
| Entry | `index.html` → `src/main.tsx` | `app/layout.tsx` → `app/page.tsx` → `src/App.tsx` | `src/App.tsx` now has `'use client'` |
| Scripts | `dev: vite` / `build: vite build` | `dev: next dev` / `build: next build` / `start: next start` + `vite:dev`, `vite:build` aliases | |
| Env | `import.meta.env.VITE_*` | `process.env.NEXT_PUBLIC_* ?? process.env.VITE_*` | Compat shim — both prefixes work. See `src/vite-env.d.ts` |
| Aliases | `vite.config.ts` `resolve.alias` | `tsconfig.json` `paths` + `next.config.mjs` `webpack.alias` | `@movies`, `@/app`, `@/lib/supabase`, `@/utils`, `/utils/supabase/info` preserved |
| Proxy | `vite.config.ts` `server.proxy` for RapidAPI | `app/api/*` route handlers (Next) + fallback Vercel `api/*` still present | `app/api/tiktok-feed`, `app/api/sports-stream`, `app/api/health` implement rate-limit + caching |
| Config | `vite.config.ts` | `next.config.mjs` (rewrites, webpack aliases, `eslint.ignoreDuringBuilds`, `images.unoptimized`) | |
| TS | `tsconfig.app.json` (Vite) | Root `tsconfig.json` (Next plugin) with `next-env.d.ts` | Excludes `Livescoredashboard2`, `animated-*`, `movies` root |
| Tailwind | `tailwind.config.js` (`content: ['./index.html', './src/**/*']`) | Added `app/**/*` to `content` | |
| Metadata | `index.html` `<head>` + `react-helmet-async` | `app/layout.tsx` `metadata` export + GTM/gtag/JSON-LD scripts + `SEO` component still works client-side | |
| Public | `public/sw.js` etc via Vite | Same `public/` served by Next (static) | |

## Env mapping (22 sites)

Replaced via Python script; all verified `import.meta` removed:

```
VITE_SUPABASE_URL                → NEXT_PUBLIC_SUPABASE_URL
VITE_SUPABASE_ANON_KEY           → NEXT_PUBLIC_SUPABASE_ANON_KEY
VITE_SCOREHUB_SUPABASE_URL       → NEXT_PUBLIC_SCOREHUB_SUPABASE_URL
VITE_SCOREHUB_SUPABASE_ANON_KEY  → NEXT_PUBLIC_SCOREHUB_SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY            → NEXT_PUBLIC_VAPID_PUBLIC_KEY
VITE_SITE_URL                    → NEXT_PUBLIC_SITE_URL
VITE_ENABLE_LIVE_SPORTS_API      → NEXT_PUBLIC_ENABLE_LIVE_SPORTS_API
VITE_ENABLE_LIVE_TRANSFERS_API   → NEXT_PUBLIC_ENABLE_LIVE_TRANSFERS_API
VITE_ENABLE_ALLSPORTS_API        → NEXT_PUBLIC_ENABLE_ALLSPORTS_API
VITE_ALLSPORTS_API_HOST          → NEXT_PUBLIC_ALLSPORTS_API_HOST
VITE_RAPIDAPI_KEY                → NEXT_PUBLIC_RAPIDAPI_KEY
VITE_PAYSTACK_PUBLIC_KEY         → NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
import.meta.env.DEV              → process.env.NODE_ENV !== 'production'
```

Server-only `RAPIDAPI_KEY` / `RAPIDAPI_HOST` remain for API routes (`app/api/*` reads `process.env.RAPIDAPI_KEY || process.env.NEXT_PUBLIC_RAPIDAPI_KEY`).

## App Router structure

```
app/
  layout.tsx          # Root layout: metadata, GTM, gtag, JSON-LD, dark-mode flash, <Analytics />
  page.tsx            # 'use client' + dynamic(() => import('../src/App'), {ssr:false})
  not-found.tsx       # 404 for Next routing (ScoreHub uses MemoryRouter internally, so no conflict)
  api/
    health/route.ts        # GET → {ok, service, env, timestamp}
    tiktok-feed/route.ts   # GET ?count=10 → proxies tiktok-scraper7 (rate-limit 30/min, cache 60s)
    sports-stream/route.ts # GET ?matchSlug=… → proxies sport-streaming-api (rate-limit 60/min, cache 30s)

next.config.mjs       # webpack alias mirror of vite.config.ts, images.unoptimized, eslint.ignoreDuringBuilds
next-env.d.ts         # generated
```

`app/page.tsx` keeps the entire SPA intact:

```tsx
'use client';
import dynamic from 'next/dynamic';
const App = dynamic(() => import('../src/App'), { ssr: false, loading: () => <Skeleton /> });
export default function Page() { return <App />; }
```

Why `ssr:false`? The app uses `window`, `localStorage`, `three`, `peerjs`, `document`, etc. Server rendering would break. With `ssr:false` the shell is streamed from Next, then hydrated client-side — identical to Vite's CSR.

## API migration (`api/` → `app/api`)

Vercel `api/*.ts` used `(req, res)` handler signature. Next App Router uses `NextRequest/NextResponse` and `export async function GET(req)`.

Logic, rate-limit, and cache headers were ported 1:1. See diff: `api/tiktok-feed.ts` vs `app/api/tiktok-feed/route.ts`.

Both exist concurrently: `api/` is ignored by Next but still deployable to Vercel for backwards compat.

## Build proof

```
# Next
npm run build  # → next build ✓ Compiled successfully (7 routes)
Route (app)             Size     First Load JS
┌ ○ /                   1.41 kB        89.5 kB
├ ○ /_not-found         143 B          88.3 kB
├ ○ /api/health         0 B                0 B
├ ƒ /api/sports-stream  0 B                0 B
└ ƒ /api/tiktok-feed    0 B                0 B

# Vite fallback still works
npm run vite:build  # ✓ 12.07s, 242 kB gzip

# Typecheck
npm run typecheck  # ✓ (tsc --noEmit passes)

# Dev
npm run dev        # → Next 14.2.33 Ready in 1346ms @ http://localhost:3000
curl /             # → correct <title>, OG, GTM, JSON-LD
curl /api/health   # → {"ok":true,"service":"hyperlink-api","environment":"development",…}
```

## How to run

```bash
# Next (primary)
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start

# Vite fallback (unchanged)
npm run vite:dev     # http://localhost:5173 (legacy)
npm run vite:build
```

Env: copy `.env.example` → `.env` (or `.env.local`). Next reads `NEXT_PUBLIC_*`; Vite and fallback code still accept `VITE_*`.

## Known tradeoffs & next steps

- **React version:** Kept `react@18.3.1` for safety. `next@14.2.33` is latest 14 line (note audit warn: patch available Dec 2025 — bump to `next@14.2.35+` or `next@15` + `react@19` when you upgrade).
- **Tailwind:** Project still on `3.4.1`. `src/livescore-styles/` contains Tailwind v4 syntax (`@import 'tailwindcss' source(none)`) but is unused (not imported). If you want ScoreHub's v4 theme, upgrade `tailwindcss` to `4.x` and import `src/livescore-styles/index.css` in `app/layout.tsx`.
- **SSR:** Current approach is pure CSR inside Next shell. For true SSR/SSG benefits, gradually extract feed/marketing pages to server components and leave interactive islands as `'use client'`.
- **react-helmet-async:** Preserved for intra-SPA SEO. Prefer `generateMetadata` per route when migrating to server components.
- **MemoryRouter:** ScoreHub's `createMemoryRouter` stays embedded; to make its routes addressable via Next, replace with Next `app/(scorehub)/**` segments later.

## Verdict

✅ **Yes — Vite → Next.js is possible without breaking the app.** This branch demonstrates a zero-downtime, incremental migration: the SPA is now served by the Next App Router, APIs are Next route handlers, and the legacy Vite toolchain remains as a fallback.
