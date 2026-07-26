/* KampoStay service worker — relative to scope (works on GitHub Pages /kampostay/) */
const CACHE_VERSION = 'kampostay-v3';
const SCOPE = self.registration.scope;

function scoped(path) {
  const clean = String(path).replace(/^\//, '');
  return new URL(clean, SCOPE).href;
}

const PRECACHE = [
  './',
  './index.html',
  './404.html',
  './manifest.json',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/splash-192.png',
  './icons/splash-512.png',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/pages.css',
  './js/app.js',
  './js/config.js',
  './pages/download.html',
].map(scoped);

const OFFLINE_URL = scoped('./pages/download.html');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match(OFFLINE_URL) || caches.match(scoped('./index.html')));

      return cached || network;
    })
  );
});
