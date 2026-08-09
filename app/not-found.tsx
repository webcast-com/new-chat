export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-slate-950 to-indigo-950 text-white p-6 text-center">
      <h1 className="text-4xl font-extrabold mb-3">404 — Not found</h1>
      <p className="text-zinc-400 mb-6 max-w-md">The page you&apos;re looking for doesn&apos;t exist. ScoreHub&apos;s embedded router handles its own deep links inside the Live Scores view.</p>
      <a
        href="/"
        className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition"
      >
        Go back home
      </a>
    </div>
  );
}
