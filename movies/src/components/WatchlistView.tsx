import React from 'react';
import { Bookmark, Film, LogIn } from 'lucide-react';
import { Movie } from '@/data/movies';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { useAuth } from '@/contexts/AuthContext';
import MovieCard from './MovieCard';

interface Props {
  allMovies: Movie[];
  onOpenMovie: (m: Movie) => void;
  onBrowse: () => void;
  onRequireAuth: () => void;
}


const WatchlistView: React.FC<Props> = ({ allMovies, onOpenMovie, onBrowse, onRequireAuth }) => {
  const { watchlist } = useWatchlist();
  const { user } = useAuth();
  const saved = allMovies.filter(m => watchlist.includes(m.id));

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-600/10">
          <Bookmark className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="mb-2 text-3xl font-black text-white">Sign in to access your watchlist</h1>
        <p className="mb-6 text-neutral-400">
          Create a free account to save movies, write reviews, and sync your collection across devices.
        </p>
        <button
          onClick={onRequireAuth}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700"
        ><LogIn className="h-5 w-5" /> Sign In / Sign Up</button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[60vh] max-w-7xl px-6 py-12">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-800 shadow-lg shadow-red-600/30">
          <Bookmark className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white">My Watchlist</h1>
          <p className="text-neutral-400">{saved.length} {saved.length === 1 ? 'movie' : 'movies'} saved</p>
        </div>
      </div>

      {saved.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-16 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-600/10">
            <Film className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-white">Your watchlist is empty</h3>
          <p className="mb-6 max-w-md text-neutral-400">
            Start building your personal collection. Browse movies and click the plus icon to add them here.
          </p>
          <button
            onClick={onBrowse}
            className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700"
          >Browse Movies</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {saved.map(m => (
            <MovieCard key={m.id} movie={m} onClick={() => onOpenMovie(m)} />
          ))}
        </div>
      )}
    </div>
  );
};


export default WatchlistView;
