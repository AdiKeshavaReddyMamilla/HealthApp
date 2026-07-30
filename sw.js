/*
 * sw.js — service worker for offline use + home-screen install.
 * Caches the app shell so Pulse opens instantly and works without a connection.
 * Bump CACHE when you change any shell file so clients pick up the update.
 */
var CACHE = 'pulse-v2';
var SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/recovery.js',
  './js/storage.js',
  './js/ingest.js',
  './js/summary.js',
  './js/charts.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // Network-first for navigations (so updates land), cache fallback offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }
  // Cache-first for static assets.
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return hit; });
    })
  );
});
