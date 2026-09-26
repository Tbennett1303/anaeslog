const CACHE = 'inkline-test-v13-campaign-1';
const CORE = [
  '/',
  '/index.html',
  '/gen.js',
  '/icons/inky-180.png',
  '/icons/inky-192.png',
  '/icons/inky-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(CORE); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) { return caches.delete(key); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.indexOf('/api/') === 0) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(function (res) {
      const copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put('/index.html', copy); });
      return res;
    }).catch(function () { return caches.match('/index.html'); }));
    return;
  }
  event.respondWith(caches.match(req).then(function (cached) {
    return cached || fetch(req).then(function (res) {
      if (res.ok) caches.open(CACHE).then(function (cache) { cache.put(req, res.clone()); });
      return res;
    });
  }));
});
