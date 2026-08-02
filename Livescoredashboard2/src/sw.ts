/// <reference lib="webworker" />
// ScoreHub Service Worker (Phase 5.3): precache + runtime caching + Web Push
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching: images + Supabase API (offline-first)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'scorehub-images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'scorehub-api',
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
    ],
  })
);

// ─── Web Push ──────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let title = 'ScoreHub';
  let body = 'You have a new ScoreHub update!';
  let icon = '/favicon.svg';
  let badge = '/favicon.svg';
  let tag: string | undefined;
  let url = '/';
  let requireInteraction = false;

  try {
    const data = event.data?.json();
    if (data) {
      title = data.title || title;
      body = data.body || body;
      icon = data.icon || icon;
      badge = data.badge || badge;
      tag = data.tag;
      url = data.url || data.data?.url || url;
      requireInteraction = !!data.requireInteraction;
    }
  } catch {
    const text = event.data?.text();
    if (text) body = text;
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: { url },
      requireInteraction,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('navigate' in client) {
          await client.navigate(url);
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});

self.addEventListener('notificationclose', (event) => {
  // Telemetry hook (optional)
  event.notification.close();
});

export {};
