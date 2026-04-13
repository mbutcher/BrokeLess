/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[] };

// Background Sync API — not yet in standard TypeScript DOM lib
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

// Activate new service worker immediately on install and claim all open tabs,
// ensuring deployments bust the PWA cache without user interaction.
self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

// API routes: NetworkFirst — serve cached response when offline
registerRoute(
  ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Images: CacheFirst — long-lived cache
registerRoute(
  ({ request }: { request: Request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// Background sync — relay FLUSH_MUTATIONS to all open app windows
self.addEventListener('sync', (rawEvent) => {
  const event = rawEvent as unknown as SyncEvent;
  if (event.tag === 'flush-mutations') {
    event.waitUntil(
      self.clients
        .matchAll({ includeUncontrolled: true, type: 'window' })
        .then((clients) => clients.forEach((c) => c.postMessage({ type: 'FLUSH_MUTATIONS' })))
    );
  }
});

// Push notifications — show a notification when a push message is received
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  interface PushPayload {
    title: string;
    body: string;
    url?: string;
  }

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: 'BudgetApp', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      data: { url: payload.url ?? '/' },
    })
  );
});

// Notification click — focus or open the app at the target URL
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const rawUrl: unknown = (event.notification.data as { url?: unknown }).url;

  // Only navigate to same-origin paths to prevent open redirect / XSS via a
  // compromised push payload. Accept absolute same-origin URLs or relative paths.
  let targetUrl = '/';
  if (typeof rawUrl === 'string') {
    try {
      const parsed = new URL(rawUrl, self.location.origin);
      if (parsed.origin === self.location.origin) {
        targetUrl = parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {
      // rawUrl is a relative path — use as-is if it starts with /
      if (rawUrl.startsWith('/')) targetUrl = rawUrl;
    }
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          void existing.navigate(targetUrl);
          return existing.focus();
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
