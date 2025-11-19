// CheatCodez Service Worker - PWA & Offline Support
// $400 billion budget: instant loads, offline fallback, smart caching

const CACHE_VERSION = 'cheatcodez-v3.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

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
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone response (can only read once)
        const responseClone = response.clone();

        // Cache successful responses (fire and forget)
        caches.open(DYNAMIC_CACHE)
          .then((cache) => {
            // Add timestamp header for cache validation
            const headers = new Headers(responseClone.headers);
            headers.append('sw-cached-date', Date.now().toString());

            cache.put(request, new Response(responseClone.body, {
              status: responseClone.status,
              statusText: responseClone.statusText,
              headers: headers
            }));
          })
          .catch(err => console.error('[SW] Cache write failed:', err));

        return response;
      })
      .catch(() => {
        // Network failed - try cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', request.url);

              // Validate cache age
              const cachedDate = cachedResponse.headers.get('sw-cached-date');
              if (cachedDate) {
                const age = Date.now() - parseInt(cachedDate);
                if (age > CACHE_MAX_AGE) {
                  console.log('[SW] Cache expired, but serving anyway (offline)');
                }
              }

              return cachedResponse;
            }

            // No cache - return offline page
            if (request.destination === 'document') {
              return caches.match('/index.html')
                .then(page => page || createOfflinePage());
            }

            // For other resources, return error
            return createOfflineResponse();
          })
          .catch(err => {
            console.error('[SW] Cache read failed:', err);
            return createOfflineResponse();
          });
      })
  );
});

// Helper: Create offline response
function createOfflineResponse() {
  return new Response('Offline - resource not cached', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Helper: Create offline HTML page
function createOfflinePage() {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CheatCodez - Offline</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          background: #000;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          text-align: center;
          padding: 20px;
        }
        h1 { color: #00ff41; }
        p { color: #aaa; }
      </style>
    </head>
    <body>
      <div>
        <h1>🎮 CheatCodez</h1>
        <p><strong>You're offline</strong></p>
        <p>Please check your internet connection and try again.</p>
      </div>
    </body>
    </html>
  `;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

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
