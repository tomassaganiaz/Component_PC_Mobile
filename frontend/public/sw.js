/* TechShield PWA service worker
 * Offline app shell + runtime caching.
 * - Navegación: network-first, con fallback al index.html cacheado (modo offline).
 * - Assets same-origin: stale-while-revalidate (usa caché, actualiza en segundo plano).
 * - Requests a la API e imágenes remotas: pasan directo (nunca se cachean).
 */
const VERSION = 'techshield-v2';
const SHELL = ['/', '/manifest.json', '/logo192.png', '/logo512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Nunca cachear el bundle/HMR de Metro (evita servir codigo viejo en dev).
  if (
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('.bundle') ||
    url.pathname.includes('@react-refresh') ||
    url.pathname.includes('/_expo/') ||
    url.search.includes('platform=')
  ) {
    return;
  }

  const isNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});