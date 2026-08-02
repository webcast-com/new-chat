import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase, getEdgeFunctionUrl, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { useFavorites } from '@/app/hooks/useFavorites';
import { LiveMatch } from '@/app/data/sportsData';

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface PushNotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  isServerSubscribed: boolean; // saved to push_subscriptions table
  favorites: string[];
}

// Optional VAPID public key (base64url raw 65-byte P-256 point).
// When set, the browser registers a real Web Push subscription and stores it
// in push_subscriptions so the send-push-notification edge function can
// deliver background pushes. When unset, in-app Notification() alerts still work.
const VAPID_PUBLIC_KEY = (import.meta.env?.VITE_VAPID_PUBLIC_KEY as string | undefined) || '';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64WithPadding = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64WithPadding);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function b64urlFromBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  try {
    // Standalone PWA registers /sw.js via vite-plugin-pwa; embedded host uses public/sw.js
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const [state, setState] = useState<PushNotificationState>({
    permission: 'default',
    isSupported: false,
    isSubscribed: false,
    isServerSubscribed: false,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  const checkSubscription = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('user_preferences').select('push_notifications').eq('user_id', user.id).maybeSingle();
      const prefEnabled = data?.push_notifications ?? false;

      // Also check if a real push subscription row exists
      let serverSubscribed = false;
      const { count } = await supabase
        .from('push_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);
      serverSubscribed = (count ?? 0) > 0;

      setState(prev => ({
        ...prev,
        isSubscribed: prefEnabled,
        isServerSubscribed: serverSubscribed,
      }));
    } catch {
      // ignore
    }
  };

  const saveServerSubscription = async (registration: ServiceWorkerRegistration): Promise<boolean> => {
    if (!user?.id || !VAPID_PUBLIC_KEY || !registration.pushManager) return false;
    try {
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      if (!p256dh || !auth) return false;

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: b64urlFromBuffer(p256dh),
        auth_key: b64urlFromBuffer(auth),
        user_agent: navigator.userAgent,
        is_active: true,
        last_sent_at: null,
      }, { onConflict: 'user_id,endpoint' });

      if (error) {
        console.warn('Failed to save push subscription', error.message);
        return false;
      }
      setState(prev => ({ ...prev, isServerSubscribed: true }));
      return true;
    } catch (err) {
      console.warn('Push subscribe failed', err);
      return false;
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

        // Register real Web Push subscription (background pushes via edge function)
        const registration = await getServiceWorkerRegistration();
        if (registration) {
          await saveServerSubscription(registration);
        }

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
          metadata: { favorites_count: favorites.length, server_subscription: state.isServerSubscribed },
        }).then(() => {});
      }

      return permission as NotificationPermission;
    } catch (err) {
      console.error('Notification permission error', err);
      throw err;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isSupported, user?.id, favorites.length, VAPID_PUBLIC_KEY]);

  const unsubscribe = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Remove browser subscription
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration?.pushManager?.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove server rows
      await supabase.from('push_subscriptions')
        .update({ is_active: false, last_error: 'unsubscribed' })
        .eq('user_id', user.id)
        .eq('is_active', true);

      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        push_notifications: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      setState(prev => ({ ...prev, isSubscribed: false, isServerSubscribed: false }));
    } catch (e) {
      console.error('Unsubscribe failed', e);
    }
  }, [user?.id]);

  /** Send a test push through the send-push-notification edge function. */
  const sendTestPush = useCallback(async (title?: string, body?: string): Promise<{ delivered: number; failed: number }> => {
    if (!user?.id) throw new Error('Sign in required');
    const session = await supabase.auth.getSession();
    const res = await fetch(getEdgeFunctionUrl('send-push-notification'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session?.access_token || SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'test',
        title: title || 'ScoreHub Test Push ✅',
        body: body || 'Background push works! This was delivered by the send-push-notification edge function.',
        url: '/settings',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Push failed (${res.status})`);
    return { delivered: data.delivered || 0, failed: data.failed || 0 };
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
      });
    } catch (e) {
      console.warn('Notification failed', e);
    }
  }, [state, favorites]);

  const notifyMatchStart = useCallback((match: LiveMatch) => {
    if (!state.isSupported || state.permission !== 'granted' || !state.isSubscribed) return;

    const title = `🔔 Match Starting: ${match.homeTeam} vs ${match.awayTeam}`;
    const body = `${match.league} · Starting now`;

    try {
      new Notification(title, { body, icon: '/favicon.svg', tag: `start-${match.id}` });
    } catch { /* ignore */ }
  }, [state]);

  return {
    ...state,
    requestPermission,
    unsubscribe,
    sendTestPush,
    notifyFavoriteGoal,
    notifyMatchStart,
    canNotify: state.isSupported && state.permission === 'granted' && state.isSubscribed,
  };
}
