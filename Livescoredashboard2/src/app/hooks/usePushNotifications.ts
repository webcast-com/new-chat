import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useFavorites } from '@/app/hooks/useFavorites';
import { LiveMatch } from '@/app/data/sportsData';

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface PushNotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  favorites: string[];
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const [state, setState] = useState<PushNotificationState>({
    permission: 'default',
    isSupported: false,
    isSubscribed: false,
    favorites: [],
  });

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
    const permission = isSupported ? (Notification.permission as NotificationPermission) : 'denied';
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission,
      favorites: favorites.map(f => f.team_name),
    }));

    if (isSupported && permission === 'granted') {
      checkSubscription();
    }
  }, [favorites]);

  const checkSubscription = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('user_preferences').select('push_notifications').eq('user_id', user.id).maybeSingle();
      setState(prev => ({ ...prev, isSubscribed: data?.push_notifications ?? false }));
    } catch {
      // ignore
    }
  };

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      throw new Error('Notifications not supported');
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission: permission as NotificationPermission }));

      if (permission === 'granted' && user?.id) {
        // Save preference
        await supabase.from('user_preferences').upsert({
          user_id: user.id,
          push_notifications: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        setState(prev => ({ ...prev, isSubscribed: true }));

        // Show welcome notification
        new Notification('ScoreHub Notifications Enabled! 🎉', {
          body: `You'll get alerts for ${favorites.length || 'your favorite'} teams`,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
        });

        // Track
        supabase.from('user_activity').insert({
          user_id: user.id,
          action: 'push_notifications_enabled',
          metadata: { favorites_count: favorites.length },
        }).then(() => {});
      }

      return permission as NotificationPermission;
    } catch (err) {
      console.error('Notification permission error', err);
      throw err;
    }
  }, [state.isSupported, user?.id, favorites.length]);

  const unsubscribe = useCallback(async () => {
    if (!user?.id) return;
    try {
      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        push_notifications: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setState(prev => ({ ...prev, isSubscribed: false }));
    } catch (e) {
      console.error('Unsubscribe failed', e);
    }
  }, [user?.id]);

  const notifyFavoriteGoal = useCallback((match: LiveMatch) => {
    if (!state.isSupported || state.permission !== 'granted' || !state.isSubscribed) return;

    const isFav = favorites.some(f => 
      match.homeTeam.includes(f.team_name) || match.awayTeam.includes(f.team_name) || 
      f.team_name.includes(match.homeTeam) || f.team_name.includes(match.awayTeam)
    );

    if (!isFav && favorites.length > 0) return; // Only notify for favorites if user has favorites

    // Check if this is a goal update (score changed)
    const title = `⚽ Goal! ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`;
    const body = `${match.league} · ${match.time} · ${match.status === 'live' ? 'LIVE' : match.status}`;

    try {
      new Notification(title, {
        body,
        icon: match.homeLogo || '/favicon.svg',
        badge: '/favicon.svg',
        tag: `goal-${match.id}`,
        requireInteraction: false,
      } as any);
    } catch (e) {
      console.warn('Notification failed', e);
    }
  }, [state, favorites]);

  const notifyMatchStart = useCallback((match: LiveMatch) => {
    if (!state.isSupported || state.permission !== 'granted' || !state.isSubscribed) return;

    const title = `🔔 Match Starting: ${match.homeTeam} vs ${match.awayTeam}`;
    const body = `${match.league} · Starting now`;

    try {
      new Notification(title, { body, icon: '/favicon.svg', tag: `start-${match.id}` } as any);
    } catch {}
  }, [state]);

  return {
    ...state,
    requestPermission,
    unsubscribe,
    notifyFavoriteGoal,
    notifyMatchStart,
    canNotify: state.isSupported && state.permission === 'granted' && state.isSubscribed,
  };
}
