// Service Worker for Ojawa E-commerce PWA - Minimal Version
const CACHE_NAME = 'ojawa-v3.0.0';
const STATIC_CACHE = 'ojawa-static-v3.0.0';
const DYNAMIC_CACHE = 'ojawa-dynamic-v3.0.0';
const IMAGE_CACHE = 'ojawa-images-v3.0.0';

// Critical files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache critical files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v3.0.0...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching critical files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Critical files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v3.0.0...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated v3.0.0');
      return self.clients.claim();
    })
  );
});

// Simple cache-first strategy for static assets only
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle requests from our own domain
  if (url.origin !== self.location.origin) {
    // Let external requests pass through without service worker interference
    return;
  }
  
  // Only cache static assets (images, CSS, JS)
  if (event.request.destination === 'image' || 
      event.request.url.includes('.css') || 
      event.request.url.includes('.js')) {
    
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(event.request).then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the response
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            
            return response;
          });
        })
    );
  }
});

// Handle errors gracefully
self.addEventListener('error', (event) => {
  console.warn('Service Worker: Error occurred', event);
});

self.addEventListener('unhandledrejection', (event) => {
  console.warn('Service Worker: Unhandled rejection', event);
});

console.log('Service Worker: Loaded v3.0.0 - Minimal version');