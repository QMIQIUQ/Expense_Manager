/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
// Restoring /dashboard offline must resolve the cached shell on both hosting base paths.
registerRoute(new NavigationRoute(createHandlerBoundToURL(new URL('index.html', self.registration.scope).pathname)))

// Optional hashed modules remain usable offline after their first successful load.
// Domain data and authentication requests are deliberately outside this asset cache.
registerRoute(
  ({ url, request }) => url.origin === self.location.origin &&
    ['script', 'style', 'worker'].includes(request.destination),
  new CacheFirst({ cacheName: 'expense-optional-assets-v1', plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 })] }),
)
