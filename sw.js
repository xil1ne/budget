// Service worker for "Карманный бюджет": keeps the app working without internet.
// When you publish a new version of index.html, change the number in CACHE (v1 -> v2).
const CACHE = 'pocket-budget-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (url.origin === self.location.origin) {
    // App files: answer from the cache at once, refresh the cache in the background.
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          const refresh = fetch(req)
            .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
            .catch(() => hit || cache.match('index.html'));
          return hit || refresh;
        })
      )
    );
  } else if (isFont) {
    // Fonts: keep a copy after the first load so the look stays the same offline.
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((hit) =>
          hit || fetch(req).then((res) => { cache.put(req, res.clone()); return res; })
        )
      )
    );
  }
});
