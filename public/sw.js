const CACHE_NAME = 'banh-bao-dau-v1';

// We don't cache anything to ensure the app always fetches the latest version
// But a service worker is required for PWA installability
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle the request normally
  return;
});
