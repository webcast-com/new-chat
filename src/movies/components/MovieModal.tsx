import React, { useEffect, useState } from 'react';
import { X, Star, Plus, Check, Clock, Calendar, User, LogIn } from 'lucide-react';
import { Movie } from '@movies/data/movies';
import { useWatchlist, DBReview } from '@movies/contexts/WatchlistContext';
import { useAuth } from '@movies/contexts/AuthContext';

interface Props {
  movie: Movie | null;
  onClose: () => void;
  onRequireAuth: () => void;
}

const StarRating: React.FC<{ value: number; onChange?: (v: number) => void; size?: number; readonly?: boolean }> = ({ value, onChange, size = 5, readonly }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange?.(i)}
          className={readonly ? 'cursor-default' : 'cursor-pointer transition-transform hover:scale-110'}
        >
          <Star
            className={`transition ${(hover || value) >= i ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-600'}`}
            style={{ width: size * 4, height: size * 4 }}
          />
        </button>
      ))}
    </div>
  );
};

const MovieModal: React.FC<Props> = ({ movie, onClose, onRequireAuth }) => {
  const { toggleWatchlist, isInWatchlist, userReviews, addReview, loadReviewsForMovie } = useWatchlist();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (movie) {
      document.body.style.overflow = 'hidden';
      setRating(0); setReviewText(''); setSubmitted(false); setError(null);
      loadReviewsForMovie(movie.id);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [movie, loadReviewsForMovie]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!movie) return null;

  const saved = isInWatchlist(movie.id);
  const dbReviews = userReviews[movie.id] || [];
  const sampleAsDB: DBReview[] = movie.reviews.map(r => ({ ...r }));
  const allReviews = [...dbReviews, ...sampleAsDB];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) { onRequireAuth(); return; }
    if (!rating || !reviewText.trim()) return;
    const res = await addReview(movie.id, rating, reviewText.trim());
    if (res.error) { setError(res.error); return; }
    setSubmitted(true);
    setRating(0); setReviewText('');
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleWatchlist = () => {
    if (!user) { onRequireAuth(); return; }
    toggleWatchlist(movie.id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="relative mx-auto my-4 max-w-5xl overflow-hidden rounded-2xl bg-neutral-950 shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur hover:bg-red-600"
          aria-label="Close"
        ><X className="h-5 w-5" /></button>

        <div className="relative h-64 md:h-96">
          <img
            src={movie.backdrop}
            alt={movie.title}
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/1920x1080/0a0a0a/f5c518?text=${encodeURIComponent(movie.title)}`; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
        </div>

        <div className="relative -mt-24 grid gap-6 px-6 pb-6 md:-mt-32 md:grid-cols-[200px_1fr] md:gap-8 md:px-8">
          <img
            src={movie.poster}
            alt={movie.title}
            className="hidden h-fit w-48 rounded-xl shadow-2xl ring-1 ring-white/10 md:block"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/500x750/1a1a1a/f5c518?text=${encodeURIComponent(movie.title)}`; }}
          />
          <div className="min-w-0">
            <h2 className="text-3xl font-black text-white md:text-5xl">{movie.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
              <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> <span className="font-bold text-yellow-400">{movie.rating.toFixed(1)}</span></div>
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{movie.year}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{movie.duration}</span>
              <span className="flex items-center gap-1"><User className="h-4 w-4" />{movie.director}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {movie.genre.map(g => (
                <span key={g} className="rounded-full bg-red-600/20 px-3 py-1 text-xs font-semibold text-red-400 ring-1 ring-red-600/30">{g}</span>
              ))}
            </div>
            <p className="mt-5 text-neutral-300 leading-relaxed">{movie.synopsis}</p>

            <div className="mt-4">
              <span className="text-sm font-semibold text-neutral-500">Cast: </span>
              <span className="text-sm text-neutral-300">{movie.cast.join(', ')}</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleWatchlist}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-bold transition ${
                  saved ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {saved ? <><Check className="h-5 w-5" /> In Watchlist</> : <><Plus className="h-5 w-5" /> Add to Watchlist</>}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-6 py-6 md:px-8">
          <h3 className="mb-4 text-xl font-bold text-white">Official Trailer</h3>
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${movie.trailerId}`}
              title={`${movie.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        <div className="border-t border-white/10 px-6 py-6 md:px-8">
          <h3 className="mb-4 text-xl font-bold text-white">Reviews ({allReviews.length})</h3>

          {user ? (
            <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-white/10 bg-neutral-900 p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-sm font-semibold text-white">Your Rating:</span>
                <StarRating value={rating} onChange={setRating} size={6} />
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value.slice(0, 500))}
                placeholder="Share your thoughts about this movie..."
                rows={3}
                className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-red-500 focus:outline-none"
              />
              {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-neutral-500">{reviewText.length}/500</span>
                <div className="flex items-center gap-3">
                  {submitted && <span className="text-sm font-semibold text-green-400">Review posted!</span>}
                  <button
                    type="submit"
                    disabled={!rating || !reviewText.trim()}
                    className="rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-700"
                  >Post Review</button>
                </div>
              </div>
            </form>
          ) : (
            <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-neutral-900/50 p-6 text-center">
              <p className="text-neutral-300">Sign in to write a review and save this movie to your watchlist.</p>
              <button
                onClick={onRequireAuth}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700"
              ><LogIn className="h-4 w-4" /> Sign In to Review</button>
            </div>
          )}

          <div className="space-y-4">
            {allReviews.map(r => (
              <div key={r.id} className="rounded-xl border border-white/10 bg-neutral-900/50 p-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-800 font-bold text-white">
                      {r.author[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{r.author}</p>
                      <p className="text-xs text-neutral-500">{r.date}</p>
                    </div>
                  </div>
                  <StarRating value={r.rating} readonly size={4} />
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieModal;
