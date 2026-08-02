/* Hyperlink Social Connect — fallback service worker for embedded ScoreHub Web Push.
 * Registered by src/livescore/hooks/usePushNotifications when no PWA service
 * worker is present. Handles background push display + notification clicks.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let title = 'ScoreHub';
  let body = 'You have a new ScoreHub update!';
  let icon = '/favicon.svg';
  let badge = '/favicon.svg';
  let tag;
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
      url = data.url || (data.data && data.data.url) || url;
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
