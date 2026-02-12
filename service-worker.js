const CACHE_NAME = 'markdown-viewer-v4';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js',
  'https://cdn.jsdelivr.net/npm/marked-highlight@2.2.3/lib/index.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css',
  'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js',
  'https://cdn.jsdelivr.net/npm/panzoom@9.4.3/dist/panzoom.min.js'
];

// install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // cache hit - return response
        if (response) {
          return response;
        }
        // clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // check if valid response
          if (!response || response.status !== 200) {
            return response;
          }

          // cache same-origin and CDN (cors) responses
          if (response.type === 'basic' || response.type === 'cors') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        }).catch(() => {
          return new Response('Offline - resource not cached', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});
