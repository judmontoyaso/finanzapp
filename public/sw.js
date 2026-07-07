const CACHE_NAME = 'arca-pwa-cache-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Instalar SW y almacenar activos estáticos principales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Omitir peticiones que no sean del propio origen (API de Supabase, etc.)
  if (!req.url.startsWith(self.location.origin)) {
    return;
  }

  // manifest.json siempre fresco (network-first) para que icono/nombre actualicen
  if (req.url.includes('/manifest.json')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Cache-First para archivos estáticos versionados por Next (JS, CSS, imágenes)
  const isStaticAsset =
    req.url.includes('/_next/') ||
    req.url.endsWith('.js') ||
    req.url.endsWith('.css') ||
    req.url.endsWith('.png') ||
    req.url.endsWith('.svg') ||
    req.url.endsWith('.ico');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
          return networkResponse;
        });
      })
    );
  } else {
    // Network-First con fallback de caché para HTML/datos
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
          return networkResponse;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/'))
        )
    );
  }
});
