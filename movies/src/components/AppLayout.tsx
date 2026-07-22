import React, { useMemo, useState } from 'react';
import { movies, allGenres, Movie } from '@/data/movies';
import { WatchlistProvider } from '@/contexts/WatchlistContext';
import { AuthProvider } from '@/contexts/AuthContext';
import Header from './Header';
import Hero from './Hero';
import FilterBar from './FilterBar';
import MovieCard from './MovieCard';
import MovieModal from './MovieModal';
import WatchlistView from './WatchlistView';
import Footer from './Footer';
import AuthModal from './AuthModal';

const AppLayoutInner: React.FC = () => {
  const [view, setView] = useState<'home' | 'watchlist'>('home');
  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [minYear, setMinYear] = useState(1970);
  const [sortBy, setSortBy] = useState('rating');
  const [selected, setSelected] = useState<Movie | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const featured = useMemo(() => [...movies].sort((a, b) => b.rating - a.rating).slice(0, 5), []);

  const filtered = useMemo(() => {
    let result = movies.filter(m => {
      if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeGenre !== 'all' && !m.genre.includes(activeGenre)) return false;
      if (m.rating < minRating) return false;
      if (m.year < minYear) return false;
      return true;
    });
    switch (sortBy) {
      case 'year-desc': result.sort((a, b) => b.year - a.year); break;
      case 'year-asc': result.sort((a, b) => a.year - b.year); break;
      case 'title': result.sort((a, b) => a.title.localeCompare(b.title)); break;
      default: result.sort((a, b) => b.rating - a.rating);
    }
    return result;
  }, [search, activeGenre, minRating, minYear, sortBy]);

  const reset = () => {
    setSearch(''); setActiveGenre('all'); setMinRating(0); setMinYear(1970); setSortBy('rating');
  };

  const handleGenreClick = (g: string) => {
    setActiveGenre(g === 'all' ? 'all' : g);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Header
        view={view}
        setView={setView}
        search={search}
        setSearch={setSearch}
        onGenreClick={handleGenreClick}
        genres={allGenres}
        onOpenAuth={openAuth}
      />

      {view === 'home' ? (
        <>
          <Hero featured={featured} onOpenMovie={setSelected} onRequireAuth={() => openAuth('signin')} />

          <FilterBar
            genres={allGenres}
            activeGenre={activeGenre}
            setActiveGenre={setActiveGenre}
            minRating={minRating}
            setMinRating={setMinRating}
            minYear={minYear}
            setMinYear={setMinYear}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onReset={reset}
            resultCount={filtered.length}
          />

          <div className="mx-auto max-w-7xl px-6 pb-16">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-16 text-center">
                <h3 className="mb-2 text-2xl font-bold text-white">No movies match your filters</h3>
                <p className="mb-6 text-neutral-400">Try adjusting your search or filters to find what you're looking for.</p>
                <button onClick={reset} className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700">
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filtered.map(m => (
                  <MovieCard key={m.id} movie={m} onClick={() => setSelected(m)} onRequireAuth={() => openAuth('signin')} />
                ))}
              </div>
            )}
          </div>

          <section className="border-t border-white/10 bg-gradient-to-b from-neutral-950 to-black py-16">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-red-500">This Week</p>
                  <h2 className="text-3xl font-black text-white">Trending Now</h2>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
                {[...movies].sort((a, b) => b.rating - a.rating).slice(0, 12).map((m, i) => (
                  <div key={m.id} onClick={() => setSelected(m)} className="group relative flex shrink-0 cursor-pointer items-end">
                    <span className="absolute -left-2 bottom-0 z-0 select-none text-[140px] font-black leading-none text-red-600/30 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]" style={{ WebkitTextStroke: '2px rgb(220 38 38)' }}>
                      {i + 1}
                    </span>
                    <img
                      src={m.poster}
                      alt={m.title}
                      className="relative z-10 ml-16 h-56 w-40 rounded-lg object-cover shadow-xl transition-transform group-hover:scale-105"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/500x750/1a1a1a/f5c518?text=${encodeURIComponent(m.title)}`; }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <WatchlistView
          allMovies={movies}
          onOpenMovie={setSelected}
          onBrowse={() => setView('home')}
          onRequireAuth={() => openAuth('signin')}
        />
      )}

      <Footer genres={allGenres} onGenreClick={(g) => { handleGenreClick(g); setView('home'); }} />

      <MovieModal movie={selected} onClose={() => setSelected(null)} onRequireAuth={() => openAuth('signin')} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </div>
  );
};

const AppLayout: React.FC = () => (
  <AuthProvider>
    <WatchlistProvider>
      <AppLayoutInner />
    </WatchlistProvider>
  </AuthProvider>
);

export default AppLayout;
