const CACHE_NAME = 'kelimebaz-v1';
const ASSETS = [
  './',
  './index.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});