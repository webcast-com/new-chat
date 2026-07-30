import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { z } from 'zod';

export const ActivitySchema = z.object({
  action: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

export type ActivityAction =
  | 'page_view'
  | 'tab_switch'
  | 'sport_filter'
  | 'match_view'
  | 'search'
  | 'favorite_toggle'
  | 'prediction_view'
  | 'premium_view'
  | 'contact_submit';

interface TrackOptions {
  action: ActivityAction | string;
  metadata?: Record<string, any>;
}

export function useActivityTracking() {
  const { user } = useAuth();
  const debounceRef = useRef<Map<string, number>>(new Map());

  const track = useCallback(async ({ action, metadata }: TrackOptions) => {
    try {
      // Debounce identical actions within 2s
      const key = `${action}:${JSON.stringify(metadata || {})}`;
      const now = Date.now();
      const last = debounceRef.current.get(key);
      if (last && now - last < 2000) return;
      debounceRef.current.set(key, now);

      // Validate
      ActivitySchema.parse({ action, metadata });

      const payload = {
        user_id: user?.id || null,
        action,
        metadata: metadata || {},
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      };

      // Fire and forget - don't block UI
      supabase.from('user_activity').insert(payload).then(({ error }) => {
        if (error && import.meta.env.DEV) {
          console.warn('Activity tracking failed', error.message);
        }
      });

      // Also log to console in dev
      if (import.meta.env.DEV) {
        console.log(`[Activity] ${action}`, metadata);
      }
    } catch (e) {
      // ignore validation errors
    }
  }, [user?.id]);

  const trackPageView = useCallback((path: string, additional?: Record<string, any>) => {
    track({ action: 'page_view', metadata: { path, ...additional } });
  }, [track]);

  const trackTabSwitch = useCallback((fromTab: string, toTab: string) => {
    track({ action: 'tab_switch', metadata: { from: fromTab, to: toTab } });
  }, [track]);

  const trackSportFilter = useCallback((sport: string, previous?: string) => {
    track({ action: 'sport_filter', metadata: { sport, previous } });
  }, [track]);

  const trackMatchView = useCallback((matchId: string | number, homeTeam: string, awayTeam: string) => {
    track({ action: 'match_view', metadata: { matchId: String(matchId), homeTeam, awayTeam } });
  }, [track]);

  return { track, trackPageView, trackTabSwitch, trackSportFilter, trackMatchView };
}
