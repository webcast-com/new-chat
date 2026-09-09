# Base44 Dev Environment

## What this app is
A Next.js 14 (App Router) app that wraps a Vite/React SPA (`src/App.tsx`) via `app/page.tsx` (lazy-loaded, `ssr: false`). It also keeps a legacy Vite entry (`vite:dev`). Backend is **remote Supabase** (two cloud projects) — there is **no local database**; nothing to run in compose besides the web service.

## Running it
```
docker compose -f docker-compose.base44.yml up -d
```
- Service `web` uses `node:20`, bind-mounts the repo at `/app`, installs deps into a named `node_modules` volume, and runs `npm run dev` (`next dev -H 0.0.0.0 -p 3000`).
- Port 3000 is the public preview entry point.
- Live reload works (Next dev watches the bind-mounted source); no image rebuild needed for edits.

## Environment / secrets
- The committed `.env` already contains the public Supabase anon keys and client config needed to boot — the app starts with **no external secrets**.
- `next.config.mjs` injects the Base44 preview origin into `allowedDevOrigins` from `BASE44_PUBLIC_HOST_SUFFIX` (passed through compose). Without it Next blocks the preview origin's dev-asset/HMR requests.
- Optional server-only integrations (`RAPIDAPI_KEY`, VAPID keys) are empty by default and not required to boot.

## Verifying it works
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → 200
- Title: "Hyperlink Social Connect | Connect, Create, Belong"
- `docker compose -f docker-compose.base44.yml logs web` shows `next dev` compilation.

## Notes
- First boot takes ~45s (npm install + initial compile). Subsequent restarts are fast (node_modules is cached in the named volume).
- `eslint`/`typescript` build errors are ignored during `next dev` only where configured; typecheck with `npm run typecheck`.
