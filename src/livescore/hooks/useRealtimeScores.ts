/**
 * Phase 3: Supabase Realtime for live scores
 * Listens to broadcast channel for instant score updates
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { LiveMatch } from '@/app/data/sportsData';

interface RealtimeScoreUpdate {
  matchId: number;
  homeScore: number;
  awayScore: number;
  time: string;
  status: 'live' | 'halftime' | 'final';
}

export function useRealtimeScores(initialMatches: LiveMatch[] = []) {
  const [matches, setMatches] = useState<LiveMatch[]>(initialMatches);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Update matches when initialMatches change (from polling)
  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  const handleRealtimeUpdate = useCallback((update: RealtimeScoreUpdate) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === update.matchId) {
          return {
            ...m,
            homeScore: update.homeScore,
            awayScore: update.awayScore,
            time: update.time,
            status: update.status,
          };
        }
        return m;
      })
    );
    setLastUpdate(new Date());
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Realtime] Score update:', update);
    }
  }, []);

  useEffect(() => {
    // Subscribe to broadcast channel for live scores
    const channel = supabase
      .channel('live-scores-realtime')
      .on('broadcast', { event: 'score_update' }, ({ payload }) => {
        handleRealtimeUpdate(payload as RealtimeScoreUpdate);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_matches' }, (payload) => {
        // If we had a live_matches table, handle updates here
        const newData = payload.new as any;
        if (newData && newData.id) {
          handleRealtimeUpdate({
            matchId: newData.id,
            homeScore: newData.home_score,
            awayScore: newData.away_score,
            time: newData.time,
            status: newData.status,
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          if (process.env.NODE_ENV !== 'production') console.log('[Realtime] Connected to live-scores channel');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [handleRealtimeUpdate]);

  return { matches, isConnected, lastUpdate, handleRealtimeUpdate };
}
