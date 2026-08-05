import React from 'react';
import { Star, Plus, Check, Play } from 'lucide-react';
import { Movie } from '@/data/movies';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  movie: Movie;
  onClick: () => void;
  onRequireAuth?: () => void;
}

const MovieCard: React.FC<Props> = ({ movie, onClick, onRequireAuth }) => {
  const { toggleWatchlist, isInWatchlist } = useWatchlist();
  const { user } = useAuth();
  const saved = isInWatchlist(movie.id);


  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-neutral-900 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-red-900/30"
    >
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={movie.poster}
          alt={movie.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/500x750/1a1a1a/f5c518?text=${encodeURIComponent(movie.title)}`; }}
        />
      </div>

      {/* Rating badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-black/80 px-2 py-1 backdrop-blur">
        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
        <span className="text-xs font-bold text-white">{movie.rating.toFixed(1)}</span>
      </div>

      {/* Watchlist toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!user && onRequireAuth) { onRequireAuth(); return; }
          toggleWatchlist(movie.id);
        }}
        className={`absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition ${
          saved ? 'bg-red-600 text-white' : 'bg-black/70 text-white hover:bg-red-600'
        }`}
        aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        {saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>


      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/80 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="mb-2 flex items-center gap-2 text-xs text-neutral-300">
          <span>{movie.year}</span>
          <span>•</span>
          <span>{movie.duration}</span>
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
          {movie.genre.slice(0, 2).map(g => (
            <span key={g} className="rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">{g}</span>
          ))}
        </div>
        <button className="flex items-center justify-center gap-2 rounded-lg bg-white py-2 text-sm font-bold text-black hover:bg-yellow-400 transition">
          <Play className="h-4 w-4 fill-black" /> View Details
        </button>
      </div>

      {/* Bottom info (always visible) */}
      <div className="p-3 group-hover:opacity-0 transition-opacity">
        <h3 className="truncate font-bold text-white">{movie.title}</h3>
        <p className="text-sm text-neutral-400">{movie.year} • {movie.genre[0]}</p>
      </div>
    </div>
  );
};

export default MovieCard;
