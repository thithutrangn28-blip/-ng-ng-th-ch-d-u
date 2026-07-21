const CACHE_PREFIX = 'banh-sua-nho-';
const CACHE_VERSION = 'v3';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache essential files
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/manifest.webmanifest',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
        '/icons/icon-maskable-512x512.png'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Only delete old caches with our prefix, ensuring safe storage
            if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // For API or backend calls, try network first, then cache
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).then(response => {
        if (!response || !response.ok) throw new Error('API failed');
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // For navigation requests (e.g. HTML pages), try network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If the server returns a 502 or 503 (container down) or anything not OK, fallback to cache
          if (!response || !response.ok) {
            throw new Error('Network response was not ok');
          }
          // Cache the latest version
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clonedResponse));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          if (cached) return cached;
          
          // Custom offline page
          return new Response(
            '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;text-align:center;padding:20px;background:#fff;"><div><h2 style="color:#e11d48;margin-bottom:10px;">Ứng dụng đang tải hoặc mất kết nối</h2><p style="color:#666;">Vợ ơi, kiểm tra lại mạng hoặc mở Google AI Studio một lần để tải dữ liệu nha.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // For all other assets (JS, CSS, images, etc.), try cache first, then network, and cache the result
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (Stale-While-Revalidate)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
        }).catch(() => {}); // Ignore network errors in background

        return cachedResponse;
      }

      // If not in cache, fetch from network and cache it
      return fetch(request).then((networkResponse) => {
        // Only cache valid responses (not 502s)
        if (!networkResponse || !networkResponse.ok || networkResponse.type !== 'basic') {
          if (request.url.startsWith('http') && networkResponse && networkResponse.status === 200) {
             const cloned = networkResponse.clone();
             caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
          }
          return networkResponse;
        }

        const clonedResponse = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });

        return networkResponse;
      }).catch((error) => {
        console.error('Fetch failed for', request.url, error);
      });
    })
  );
});
