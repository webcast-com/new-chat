import { Code2, Heart, Lightbulb, ShieldCheck, Sparkles } from 'lucide-react';

const highlights = [
  {
    icon: Code2,
    title: 'Built with intention',
    description: 'A social space designed to make sharing, discovery, and connection feel simple and welcoming.',
  },
  {
    icon: Lightbulb,
    title: 'Always evolving',
    description: 'New ideas, tools, and playful experiences can grow alongside the community using the platform.',
  },
  {
    icon: ShieldCheck,
    title: 'Community first',
    description: 'The experience is shaped around respectful interactions, user control, and a safe place to belong.',
  },
];

export default function CreatorAbout() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-br from-indigo-950 via-violet-950 to-fuchsia-950 p-6 text-white shadow-2xl sm:p-10">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl shadow-lg ring-1 ring-white/20">
          <span aria-hidden="true">🎅</span>
        </div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">Meet the creator</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Welcome to hyperlink</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-indigo-100 sm:text-lg">
          This project was created by <strong className="text-white">Hyperlink</strong> for Zoza Nation — a place to connect, create, discover, and belong.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-white/10 px-4 py-2 text-sm font-medium text-violet-100">
          <Heart className="h-4 w-4 fill-current text-fuchsia-300" />
          Built for the community
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 shadow-xl sm:flex">
        <img
          src="https://images.pexels.com/photos/33176070/pexels-photo-33176070.jpeg"
          alt="Creative developer working on a project"
          className="h-56 w-full object-cover sm:h-auto sm:w-2/5"
          loading="lazy"
        />
        <div className="p-6 sm:flex-1 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-400">Creator spotlight</p>
          <h2 className="mt-2 text-2xl font-bold text-zinc-100">Steve Nganga</h2>
          <p className="mt-3 leading-7 text-zinc-400">
            Steve Nganga created hyperlink with a focus on bringing people together through thoughtful design and useful community tools.
          </p>
          <p className="mt-4 text-sm font-medium text-violet-300">Creator of hyperlink</p>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100">About the developer</h2>
            <p className="mt-2 max-w-3xl leading-7 text-zinc-400">
              Hyperlink is the builder and developer behind this experience, bringing together the product vision, interface, and interactive features that power Zoza Nation.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg">
            <Icon className="h-6 w-6 text-violet-400" />
            <h2 className="mt-4 font-bold text-zinc-100">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
          </article>
        ))}
      </section>

      <p className="pb-4 text-center text-sm text-zinc-500">Thank you for being part of Zoza Nation.</p>
    </div>
  );
}
