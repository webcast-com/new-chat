import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@movies/lib/supabase';
import { useAuth } from './AuthContext';

export interface DBReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
  user_id?: string;
}

interface WatchlistContextType {
  watchlist: number[];
  toggleWatchlist: (id: number) => Promise<void>;
  isInWatchlist: (id: number) => boolean;
  userReviews: Record<number, DBReview[]>;
  addReview: (movieId: number, rating: number, text: string) => Promise<{ error: string | null }>;
  loadReviewsForMovie: (movieId: number) => Promise<void>;
  requireAuth: () => boolean;
  onAuthRequired?: () => void;
  setOnAuthRequired: (cb: () => void) => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, displayName } = useAuth();
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [userReviews, setUserReviews] = useState<Record<number, DBReview[]>>({});
  const [authCb, setAuthCb] = useState<(() => void) | undefined>();

  // Load watchlist when user changes
  useEffect(() => {
    if (!user) { setWatchlist([]); setUserReviews({}); return; }
    (async () => {
      const { data } = await supabase
        .from('watchlists')
        .select('movie_id')
        .eq('user_id', user.id);
      setWatchlist((data || []).map((r: { movie_id: number }) => r.movie_id));
    })();
  }, [user]);

  const loadReviewsForMovie = useCallback(async (movieId: number) => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('movie_id', movieId)
      .order('created_at', { ascending: false });
    if (error) {
      setUserReviews(prev => ({ ...prev, [movieId]: [] }));
      return;
    }
    const mapped: DBReview[] = (data || []).map((r: any) => ({
      id: String(r.id),
      author: r.author_name,
      rating: r.rating,
      date: new Date(r.created_at).toISOString().split('T')[0],
      text: r.text,
      user_id: r.user_id,
    }));
    setUserReviews(prev => ({ ...prev, [movieId]: mapped }));
  }, []);

  const requireAuth = () => {
    if (!user) { authCb?.(); return false; }
    return true;
  };

  const toggleWatchlist = async (id: number) => {
    if (!requireAuth() || !user) return;
    if (watchlist.includes(id)) {
      setWatchlist(prev => prev.filter(i => i !== id));
      await supabase.from('watchlists').delete().match({ user_id: user.id, movie_id: id });
    } else {
      setWatchlist(prev => [...prev, id]);
      await supabase.from('watchlists').insert({ user_id: user.id, movie_id: id });
    }
  };

  const isInWatchlist = (id: number) => watchlist.includes(id);

  const addReview = async (movieId: number, rating: number, text: string) => {
    if (!user) { authCb?.(); return { error: 'Please sign in to review' }; }
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        movie_id: movieId,
        rating,
        text,
        author_name: displayName || 'Anonymous',
      })
      .select()
      .single();
    if (error) {
      const unavailable = error.message.includes('schema cache') || error.message.includes('does not exist');
      return { error: unavailable ? 'Public reviews are temporarily unavailable. Please try again shortly.' : error.message };
    }
    if (data) {
      const newReview: DBReview = {
        id: String(data.id),
        author: data.author_name,
        rating: data.rating,
        date: new Date(data.created_at).toISOString().split('T')[0],
        text: data.text,
        user_id: data.user_id,
      };
      setUserReviews(prev => ({
        ...prev,
        [movieId]: [newReview, ...(prev[movieId] || [])],
      }));
    }
    return { error: null };
  };

  return (
    <WatchlistContext.Provider value={{
      watchlist, toggleWatchlist, isInWatchlist,
      userReviews, addReview, loadReviewsForMovie,
      requireAuth, onAuthRequired: authCb, setOnAuthRequired: (cb) => setAuthCb(() => cb),
    }}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within WatchlistProvider');
  return ctx;
};
