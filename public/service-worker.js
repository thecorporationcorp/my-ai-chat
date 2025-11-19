// CheatCodez Service Worker - PWA & Offline Support
// $400 billion budget: instant loads, offline fallback, smart caching

const CACHE_VERSION = 'cheatcodez-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Files to cache immediately (critical for offline)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/toast.js',
  '/video-background.js',
  '/manifest.json'
];

// ============================================================================
// INSTALL - Cache static assets
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Cache failed:', error);
      })
  );
});

// ============================================================================
// ACTIVATE - Clean up old caches
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName.startsWith('cheatcodez-') && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// ============================================================================
// FETCH - Network first, cache fallback (with offline support)
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (API calls, videos, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip API endpoints (always fetch fresh)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Offline fallback for API
          return new Response(
            JSON.stringify({
              error: 'You are offline. Please check your connection.',
              offline: true
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // STRATEGY: Network first, cache fallback (for static assets)
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone response (can only read once)
        const responseClone = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone);
            });
        }

        return response;
      })
      .catch(() => {
        // Network failed - try cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', request.url);
              return cachedResponse;
            }

            // No cache - return offline page
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }

            // For other resources, return error
            return new Response('Offline - resource not cached', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ============================================================================
// MESSAGE - Handle messages from app
// ============================================================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('cheatcodez-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// ============================================================================
// BACKGROUND SYNC (future feature - retry failed requests)
// ============================================================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-optimizations') {
    console.log('[SW] Background sync triggered');
    // Could retry failed optimization requests here
  }
});

// ============================================================================
// PUSH NOTIFICATIONS (future feature)
// ============================================================================

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'New update available!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'cheatcodez-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'CheatCodez', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});
