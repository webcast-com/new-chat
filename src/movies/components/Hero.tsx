import React, { useEffect, useState } from 'react';
import { Star, Play, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie } from '@movies/data/movies';
import { useWatchlist } from '@movies/contexts/WatchlistContext';
import { useAuth } from '@movies/contexts/AuthContext';

interface Props {
  featured: Movie[];
  onOpenMovie: (m: Movie) => void;
  onRequireAuth: () => void;
}

const Hero: React.FC<Props> = ({ featured, onOpenMovie, onRequireAuth }) => {
  const [idx, setIdx] = useState(0);
  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const { user } = useAuth();
  const movie = featured[idx];

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % featured.length), 7000);
    return () => clearInterval(t);
  }, [featured.length]);

  if (!movie) return null;
  const saved = isInWatchlist(movie.id);

  return (
    <section className="relative h-[85vh] min-h-[560px] w-full overflow-hidden">
      {featured.map((m, i) => (
        <div
          key={m.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={m.backdrop}
            alt={m.title}
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/1920x1080/0a0a0a/f5c518?text=${encodeURIComponent(m.title)}`; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/40" />
        </div>
      ))}

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-6 pb-20 md:items-center md:pb-0">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-600/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400 ring-1 ring-red-600/40">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Featured Now
          </div>
          <h1 className="mb-4 text-5xl font-black leading-tight text-white drop-shadow-2xl md:text-7xl">
            {movie.title}
          </h1>
          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-neutral-300">
            <div className="flex items-center gap-1.5">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-lg font-bold text-yellow-400">{movie.rating.toFixed(1)}</span>
            </div>
            <span>{movie.year}</span>
            <span>•</span>
            <span>{movie.duration}</span>
            <span>•</span>
            <div className="flex gap-2">
              {movie.genre.map(g => (
                <span key={g} className="rounded bg-white/10 px-2 py-0.5 text-xs backdrop-blur">{g}</span>
              ))}
            </div>
          </div>
          <p className="mb-8 text-lg text-neutral-200 line-clamp-3 md:text-xl">
            {movie.synopsis}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onOpenMovie(movie)}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-7 py-3.5 font-bold text-white shadow-lg shadow-red-600/40 transition hover:bg-red-700 hover:scale-105"
            >
              <Play className="h-5 w-5 fill-white" /> View Details
            </button>
            <button
              onClick={() => { if (!user) { onRequireAuth(); return; } toggleWatchlist(movie.id); }}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-7 py-3.5 font-bold text-white backdrop-blur ring-1 ring-white/30 transition hover:bg-white/20"
            >
              {saved ? <><Check className="h-5 w-5" /> In Watchlist</> : <><Plus className="h-5 w-5" /> My Watchlist</>}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIdx(i => (i - 1 + featured.length) % featured.length)}
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/80"
        aria-label="Previous"
      ><ChevronLeft className="h-6 w-6" /></button>
      <button
        onClick={() => setIdx(i => (i + 1) % featured.length)}
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/80"
        aria-label="Next"
      ><ChevronRight className="h-6 w-6" /></button>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {featured.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-8 bg-red-600' : 'w-4 bg-white/40 hover:bg-white/60'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
