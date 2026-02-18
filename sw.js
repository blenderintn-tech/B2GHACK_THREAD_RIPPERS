const CACHE_NAME = 'univ-verse-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/firebase-config.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// Install - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch - cache first for static, network first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // For API calls, try network first
  if (url.pathname.includes('/api/') || url.hostname.includes('firestore')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // For static assets, cache first
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});