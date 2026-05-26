const CACHE_NAME = 'dungeon-dex-v1.3.38-progression-clarity-pass';
const ASSETS = ['./','./index.html','./styles.css?build=1.3.38-progression-clarity-pass','./app.js?build=1.3.38-progression-clarity-pass','./manifest.json'];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(ASSETS.map(asset => cache.add(asset).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(found => found || fetch(event.request)));
});
