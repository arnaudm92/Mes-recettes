const CACHE_NAME = 'mes-recettes-v2';
const ASSETS = [
  './mes-recettes.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ne pas cacher les appels API Anthropic
  if (url.hostname === 'api.anthropic.com') return;

  // Ne pas cacher les appels Wikipedia (photos auto)
  if (url.hostname.includes('wikipedia.org') || url.hostname.includes('wikimedia.org')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Network first pour le HTML principal, cache first pour le reste
      if (e.request.mode === 'navigate') {
        return fetch(e.request)
          .then(response => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            return response;
          })
          .catch(() => cached);
      }
      return cached || fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
