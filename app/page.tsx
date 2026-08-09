'use client';

import dynamic from 'next/dynamic';

// The entire Vite SPA (src/App.tsx) is kept as a client component.
// In Next.js, the App Router's `app/page.tsx` is the entry for "/".
// We lazy-load the original App to keep bundle splitting identical to Vite's lazy() behaviour.

const App = dynamic(() => import('../src/App'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-indigo-950 flex items-center justify-center">
      <div className="animate-pulse text-center space-y-3">
        <div className="h-10 w-10 mx-auto rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-fuchsia-500 animate-pulse" />
        <p className="text-sm text-zinc-400">Loading Hyperlink…</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <App />;
}
