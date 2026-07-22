import React, { useState } from 'react';
import { Film, Twitter, Facebook, Instagram, Youtube, Mail } from 'lucide-react';

interface Props {
  genres: string[];
  onGenreClick: (g: string) => void;
}

const Footer: React.FC<Props> = ({ genres, onGenreClick }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="mt-20 border-t border-white/10 bg-black">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800">
                <Film className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-black text-white">CINE<span className="text-red-500">VERSE</span></span>
            </div>
            <p className="text-sm text-neutral-400">
              Your ultimate destination for discovering, reviewing, and tracking the films you love.
            </p>
            <div className="mt-4 flex gap-3">
              {[Twitter, Facebook, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-neutral-400 transition hover:bg-red-600 hover:text-white">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Browse Genres</h4>
            <ul className="space-y-2 text-sm">
              {genres.map(g => (
                <li key={g}>
                  <button onClick={() => onGenreClick(g)} className="text-neutral-400 transition hover:text-red-500">{g}</button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Company</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><a href="#" className="transition hover:text-red-500">About Us</a></li>
              <li><a href="#" className="transition hover:text-red-500">Careers</a></li>
              <li><a href="#" className="transition hover:text-red-500">Press</a></li>
              <li><a href="#" className="transition hover:text-red-500">Contact</a></li>
              <li><a href="#" className="transition hover:text-red-500">Privacy Policy</a></li>
              <li><a href="#" className="transition hover:text-red-500">Terms of Service</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Stay Updated</h4>
            <p className="mb-3 text-sm text-neutral-400">Get weekly recommendations and new release alerts.</p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:border-red-500 focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full rounded-lg bg-red-600 py-2 text-sm font-bold text-white transition hover:bg-red-700">
                Subscribe
              </button>
              {subscribed && <p className="text-xs text-green-400">✓ Thanks for subscribing!</p>}
            </form>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-sm text-neutral-500 md:flex-row">
          <p>© {new Date().getFullYear()} CineVerse. All rights reserved.</p>
          <p>Poster images via TMDB. For demo purposes only.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
