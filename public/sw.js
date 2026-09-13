// Service worker minim: no fem caching real, però cal que existeixi i
// gestioni 'fetch' perquè Chrome/Android consideri l'app instal·lable com a PWA.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
