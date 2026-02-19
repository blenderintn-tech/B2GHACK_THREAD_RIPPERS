// sw.js – Advanced Service Worker with multiple caching strategies
const CACHE_NAME = 'univ-verse-v2';
const STATIC_CACHE = 'static-v2';
const COURSE_CACHE = 'courses-v2';
const JOB_CACHE = 'jobs-v2';

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
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js',
  '/offline.html' // we'll create this next
];

// Install – cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate – clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== COURSE_CACHE && key !== JOB_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch – intelligent strategy based on request type
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 1. Static assets (CSS, JS, HTML) – Cache First
  if (url.pathname.match(/\.(css|js|html|json)$/) || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  
  // 2. Course videos (YouTube) – Network Only (can't cache cross-origin)
  if (url.hostname.includes('youtube.com') || url.hostname.includes('ytimg.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // 3. Firebase API calls – Network First with fallback to cache
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('firebaseio.com')) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // 4. Images (thumbnails, etc.) – Cache First
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  
  // 5. Everything else – Network First with offline fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for future offline use
        const responseClone = response.clone();
        caches.open(COURSE_CACHE).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // If all fails, show offline page
          return caches.match('/offline.html');
        });
      })
  );
});

// Cache First strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const responseClone = response.clone();
    caches.open(STATIC_CACHE).then(cache => {
      cache.put(request, responseClone);
    });
    return response;
  } catch (error) {
    return caches.match('/offline.html');
  }
}

// Network First strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const responseClone = response.clone();
    caches.open(JOB_CACHE).then(cache => {
      cache.put(request, responseClone);
    });
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/offline.html');
  }
}