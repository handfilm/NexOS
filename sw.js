/* ═══════════════════════════════════════════════════════════════
   Hands & Head — Service Worker (sw.js)
   Offline Caching Engine · App Shell · Catalog Images & Order Data
   ═══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'v4.1.0';
const STATIC_CACHE_NAME = `hh-static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `hh-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `hh-images-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `hh-data-${CACHE_VERSION}`;

// Core application assets for pre-caching
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/theme.css',
  '/js/firebase-config.js',
  '/js/firebase-auth.js',
  '/js/firebase-products.js',
  '/js/firebase-customers.js',
  '/js/firebase-orders.js',
  '/js/api.js',
  '/js/app.js',
  '/js/modules.js',
  '/js/firebase-modules-patch.js',
  '/metadata.json'
];

// External CDN dependencies (Firebase SDKs, Google Fonts)
const EXTERNAL_STATIC_ASSETS = [
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-storage-compat.js',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Anton&family=JetBrains+Mono:wght@300;400;500;700&display=swap'
];

// Fallback SVG image for offline image requests
const OFFLINE_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <rect width="400" height="300" fill="#141414"/>
  <rect x="20" y="20" width="360" height="260" rx="8" fill="#1c1c1c" stroke="#333" stroke-dasharray="4 4"/>
  <circle cx="200" cy="130" r="36" fill="none" stroke="#c9a84c" stroke-width="2" opacity="0.6"/>
  <path d="M185 130h30M200 115v30" stroke="#c9a84c" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  <text x="200" y="195" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#a89f94" text-anchor="middle" letter-spacing="1">HANDS &amp; HEAD</text>
  <text x="200" y="215" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#5a5450" text-anchor="middle">Cached Offline Asset</text>
</svg>`;

/* ── Install Event: Pre-cache App Shell ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Precache local core assets
      const staticCache = await caches.open(STATIC_CACHE_NAME);
      try {
        await staticCache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('[SW] Some local assets failed initial precache:', err);
        // Resilient fallback: cache one-by-one so missing asset doesn't fail SW installation
        for (const url of PRECACHE_ASSETS) {
          try {
            await staticCache.add(url);
          } catch (e) {
            console.debug('[SW] Could not cache individual asset:', url);
          }
        }
      }

      // 2. Precache external CDN dependencies
      const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
      await Promise.allSettled(
        EXTERNAL_STATIC_ASSETS.map(url =>
          fetch(url, { mode: 'cors' })
            .then(res => {
              if (res.ok) return runtimeCache.put(url, res);
            })
            .catch(e => console.debug('[SW] Pre-caching external asset note:', url))
        )
      );

      // Instantly activate new service worker
      return self.skipWaiting();
    })()
  );
});

/* ── Activate Event: Clean Outdated Caches ── */
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE_NAME, RUNTIME_CACHE_NAME, IMAGE_CACHE_NAME, DATA_CACHE_NAME];

  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (!currentCaches.includes(key)) {
            console.log('[SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
      // Take control of all clients immediately
      await self.clients.claim();

      // Broadcast to all active clients that Service Worker is ready
      const allClients = await self.clients.matchAll({ type: 'window' });
      for (const client of allClients) {
        client.postMessage({ type: 'SW_READY', version: CACHE_VERSION });
      }
    })()
  );
});

/* ── Fetch Event: Intelligent Strategy Routing ── */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests; pass mutations (POST, PUT, DELETE) straight to network
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: Navigation Requests (HTML Page loads) -> Network First with App Shell Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
        } catch (error) {
          console.debug('[SW] Network navigation failed, serving cached shell:', request.url);
        }
        // Fallback to cached index.html or root
        const cached = await caches.match('/index.html') || await caches.match('/') || await caches.match(request);
        if (cached) return cached;

        return new Response('<h1>Offline</h1><p>Hands & Head is operating in offline mode.</p>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })()
    );
    return;
  }

  // Strategy 2: Product Catalog Images (Unsplash, local media, product thumbnails) -> Cache First with Network Fallback
  const isImage = request.destination === 'image' ||
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('gstatic.com') ||
    /\.(png|jpg|jpeg|svg|webp|gif|ico)(\?.*)?$/i.test(url.pathname);

  if (isImage) {
    event.respondWith(
      (async () => {
        const imageCache = await caches.open(IMAGE_CACHE_NAME);
        const cachedResponse = await imageCache.match(request);
        if (cachedResponse) {
          // Return cached image immediately, refresh in background if online
          fetch(request)
            .then(netRes => {
              if (netRes && (netRes.ok || netRes.type === 'opaque')) {
                imageCache.put(request, netRes.clone());
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            imageCache.put(request, networkResponse.clone());
            return networkResponse;
          }
        } catch (e) {
          console.debug('[SW] Image fetch failed offline:', request.url);
        }

        // Return offline SVG fallback for failed image
        return new Response(OFFLINE_IMAGE_SVG, {
          headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' }
        });
      })()
    );
    return;
  }

  // Strategy 3: Static CSS / JS / Fonts (Local and CDNs) -> Network-First for local, Stale-While-Revalidate for CDNs
  const isStaticAsset = url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('www.gstatic.com');

  if (isStaticAsset) {
    // If local asset (theme.css, app.js, modules.js), fetch latest from network first so UI updates immediately
    if (url.origin === self.location.origin) {
      event.respondWith(
        (async () => {
          const staticCache = await caches.open(STATIC_CACHE_NAME);
          try {
            const networkResponse = await fetch(request);
            if (networkResponse && networkResponse.ok) {
              staticCache.put(request, networkResponse.clone());
              return networkResponse;
            }
          } catch (err) {
            console.debug('[SW] Local static asset network fetch failed, using cache:', request.url);
          }
          const cachedResponse = await staticCache.match(request) || await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return fetch(request);
        })()
      );
      return;
    }

    event.respondWith(
      (async () => {
        const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
        const cachedResponse = await runtimeCache.match(request) || await caches.match(request);

        const fetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
              runtimeCache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            console.debug('[SW] CDN asset fetch offline:', request.url);
            return cachedResponse;
          });

        return cachedResponse || fetchPromise;
      })()
    );
    return;
  }

  // Strategy 4: External Data / API Calls (e.g. FX rates, metadata) -> Network First with Cache Fallback
  event.respondWith(
    (async () => {
      const dataCache = await caches.open(DATA_CACHE_NAME);
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
          dataCache.put(request, networkResponse.clone());
          return networkResponse;
        }
      } catch (err) {
        console.debug('[SW] Data fetch offline fallback:', request.url);
      }

      const cachedData = await dataCache.match(request);
      if (cachedData) return cachedData;

      return new Response(JSON.stringify({ offline: true, error: 'Network unavailable', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    })()
  );
});

/* ── Push Notifications ── */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Hands & Head Nexus', body: 'New commerce update received' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data
    })
  );
});

/* ── Notification Click ── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

/* ── Message Receiver: Dynamic Cache Management ── */
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Pre-cache product catalog images provided dynamically by the application
  if (type === 'CACHE_CATALOG_IMAGES' && Array.isArray(payload)) {
    const imageCache = await caches.open(IMAGE_CACHE_NAME);
    for (const imgUrl of payload) {
      if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
        try {
          const match = await imageCache.match(imgUrl);
          if (!match) {
            const res = await fetch(imgUrl, { mode: 'no-cors' });
            if (res) await imageCache.put(imgUrl, res);
          }
        } catch (e) {
          console.debug('[SW] Pre-caching product image note:', imgUrl);
        }
      }
    }
  }

  // Clear all caches on demand
  if (type === 'CLEAR_CACHES') {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    if (event.source) {
      event.source.postMessage({ type: 'CACHES_CLEARED' });
    }
  }
});
