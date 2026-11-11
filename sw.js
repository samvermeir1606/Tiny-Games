// Network-first so updates show up; falls back to the cache so everything works offline.
const V = 'tiny-arcade-v1';
const FILES = [
  './', 'index.html', 'shared.css', 'shared.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png',
  'games/band.html', 'games/artist.html', 'games/stickers.html', 'games/memory.html', 'games/bubbles.html', 'games/maze.html',
  'games/whack.html', 'games/colors.html', 'games/animals.html', 'games/tictactoe.html', 'games/connect4.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copy = r.clone(); caches.open(V).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./')))
  );
});
