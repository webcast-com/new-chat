import React, { useState } from 'react';
import { Search, Film, Bookmark, Menu, X, LogOut } from 'lucide-react';
import { useWatchlist } from '@movies/contexts/WatchlistContext';
import { useAuth } from '@movies/contexts/AuthContext';

interface Props {
  view: 'home' | 'watchlist';
  setView: (v: 'home' | 'watchlist') => void;
  search: string;
  setSearch: (s: string) => void;
  onGenreClick: (g: string) => void;
  genres: string[];
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

const Header: React.FC<Props> = ({ view, setView, search, setSearch, onGenreClick, genres, onOpenAuth }) => {
  const { watchlist } = useWatchlist();
  const { user, displayName, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const avatarLetter = (displayName || 'U')[0].toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <button onClick={() => setView('home')} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800 shadow-lg shadow-red-600/30">
            <Film className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">CINE<span className="text-red-500">VERSE</span></span>
        </button>

        <nav className="hidden items-center gap-1 lg:flex">
          <button
            onClick={() => setView('home')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${view === 'home' ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
          >Browse</button>
          <div className="relative">
            <button
              onClick={() => setGenreOpen(o => !o)}
              onBlur={() => setTimeout(() => setGenreOpen(false), 150)}
              className="rounded-md px-4 py-2 text-sm font-semibold text-neutral-400 transition hover:text-white"
            >Genres ▾</button>
            {genreOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 rounded-lg border border-white/10 bg-neutral-900 p-2 shadow-xl">
                {genres.map(g => (
                  <button
                    key={g}
                    onMouseDown={() => { onGenreClick(g); setView('home'); setGenreOpen(false); }}
                    className="block w-full rounded px-3 py-2 text-left text-sm text-neutral-300 hover:bg-red-600 hover:text-white"
                  >{g}</button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => { onGenreClick('all'); setView('home'); }}
            className="rounded-md px-4 py-2 text-sm font-semibold text-neutral-400 transition hover:text-white"
          >Top Rated</button>
        </nav>

        <div className="hidden flex-1 max-w-md md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setView('home'); }}
              className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('watchlist')}
            className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              view === 'watchlist' ? 'bg-red-600 text-white' : 'bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Watchlist</span>
            {watchlist.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1.5 text-xs font-bold text-black">
                {watchlist.length}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
                className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3 hover:bg-white/10"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-800 font-bold text-white text-sm">
                  {avatarLetter}
                </div>
                <span className="hidden max-w-[120px] truncate text-sm font-semibold text-white sm:inline">{displayName}</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-lg border border-white/10 bg-neutral-900 shadow-xl">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-xs text-neutral-500">Signed in as</p>
                    <p className="truncate text-sm font-semibold text-white">{user.email}</p>
                  </div>
                  <button
                    onMouseDown={() => { setView('watchlist'); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-neutral-300 hover:bg-white/5"
                  ><Bookmark className="h-4 w-4" /> My Watchlist</button>
                  <button
                    onMouseDown={() => { signOut(); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-400 hover:bg-red-600/10"
                  ><LogOut className="h-4 w-4" /> Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                onClick={() => onOpenAuth('signin')}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >Sign In</button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >Sign Up</button>
            </div>
          )}

          <button className="lg:hidden text-white" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-black/95 p-4 lg:hidden">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white"
            />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {genres.map(g => (
              <button
                key={g}
                onClick={() => { onGenreClick(g); setView('home'); setMenuOpen(false); }}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-red-600"
              >{g}</button>
            ))}
          </div>
          {!user && (
            <div className="flex gap-2">
              <button
                onClick={() => { onOpenAuth('signin'); setMenuOpen(false); }}
                className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-semibold text-white"
              >Sign In</button>
              <button
                onClick={() => { onOpenAuth('signup'); setMenuOpen(false); }}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold text-white"
              >Sign Up</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
