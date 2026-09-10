import { Film, Play, Star } from 'lucide-react';
import type { Movie } from '../../movies/data/movies';

interface FeedMovieCardProps {
  movie: Movie;
  onBrowseMovies?: () => void;
}

/** Facebook-style "Suggested movie" unit interleaved into the community feed. */
export default function FeedMovieCard({ movie, onBrowseMovies }: FeedMovieCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm">
      <header className="flex items-center gap-2.5 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white shadow-md">
          <Film className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Suggested movie</p>
          <p className="truncate text-xs text-zinc-400">Hyperlink Movies · Watch Movies</p>
        </div>
      </header>

      <div className="relative aspect-video bg-zinc-800">
        <img
          src={movie.backdrop}
          alt={movie.title}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = `https://placehold.co/640x360/1a1a1a/f5c518?text=${encodeURIComponent(movie.title)}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-1 text-xs font-semibold text-white backdrop-blur">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          {movie.rating.toFixed(1)}
        </div>
        <h3 className="absolute bottom-3 left-3 right-3 truncate text-lg font-bold text-white">{movie.title}</h3>
      </div>

      <div className="px-4 py-3">
        <p className="text-xs text-zinc-400">
          {movie.year} · {movie.genre.slice(0, 2).join(' / ')} · {movie.duration}
        </p>
        <p className="mt-1.5 line-clamp-2 text-sm text-zinc-300">{movie.synopsis}</p>
        <button
          type="button"
          onClick={onBrowseMovies}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow transition hover:from-indigo-700 hover:to-fuchsia-600 active:scale-[0.99]"
        >
          <Play className="h-4 w-4" />
          Watch now
        </button>
      </div>
    </article>
  );
}
