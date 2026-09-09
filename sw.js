/* ═══════════════════════════════════════════════════════════════
   Hands & Head — Service Worker (sw.js)
   Automatic Cache Purge & Clean Decommissioning Worker
   ═══════════════════════════════════════════════════════════════ */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Clear all caches created by legacy service workers
        if (typeof caches !== 'undefined') {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch (err) {
        console.debug('[SW] Cache clearing notice:', err);
      }
      try {
        // Release all controlled clients
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.postMessage({ type: 'SW_UNREGISTERED' });
        }
        // Unregister this worker
        await self.registration.unregister();
      } catch (err) {
        console.debug('[SW] Unregister notice:', err);
      }
    })()
  );
});

// Pass through all network requests directly without interception
self.addEventListener('fetch', () => {
  // Direct network pass-through
});
