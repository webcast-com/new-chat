/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Kept for backwards compatibility with Vite tooling (`vite:dev` / `vite:build`)
// In Next.js, env vars are accessed via `process.env.NEXT_PUBLIC_*`
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SCOREHUB_SUPABASE_URL?: string
  readonly VITE_SCOREHUB_SUPABASE_ANON_KEY?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_ENABLE_LIVE_SPORTS_API?: string
  readonly VITE_ENABLE_ALLSPORTS_API?: string
  readonly VITE_RAPIDAPI_KEY?: string
  readonly [key: string]: string | undefined
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Extend Next's built-in type to include migrated VITE_* fallbacks
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_SUPABASE_URL?: string
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
    readonly NEXT_PUBLIC_SCOREHUB_SUPABASE_URL?: string
    readonly NEXT_PUBLIC_SCOREHUB_SUPABASE_ANON_KEY?: string
    readonly NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string
    readonly NEXT_PUBLIC_SITE_URL?: string
    readonly NEXT_PUBLIC_ENABLE_LIVE_SPORTS_API?: string
    readonly NEXT_PUBLIC_ENABLE_ALLSPORTS_API?: string
    readonly NEXT_PUBLIC_RAPIDAPI_KEY?: string
    readonly VITE_SUPABASE_URL?: string
    readonly VITE_SUPABASE_ANON_KEY?: string
  }
}
