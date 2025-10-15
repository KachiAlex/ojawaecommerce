// Service Worker for Ojawa E-commerce PWA - Optimized
const CACHE_NAME = 'ojawa-v2.0.1';
const STATIC_CACHE = 'ojawa-static-v2.0.1';
const DYNAMIC_CACHE = 'ojawa-dynamic-v2.0.1';
const IMAGE_CACHE = 'ojawa-images-v2.0.1';

// Critical files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Non-critical files to cache after initial load
const SECONDARY_FILES = [
  '/vite.svg',
  '/icons/icon-32x32.png',
  '/icons/icon-16x16.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/products/,
  /\/api\/orders/,
  /\/api\/wallet/,
  /\/api\/notifications/
];

// Install event - cache critical files first, then secondary files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching critical files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Critical files cached');
        // Cache secondary files in background
        return caches.open(STATIC_CACHE).then(cache => {
          return cache.addAll(SECONDARY_FILES).catch(err => {
            console.warn('Service Worker: Some secondary files failed to cache', err);
          });
        });
      })
      .then(() => {
        console.log('Service Worker: All files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache files', error);
      })
  );
});

// Activate event - clean up old caches and manage cache size
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
      .then(() => {
        // Clean up old dynamic cache entries
        return cleanupOldCacheEntries();
      })
  );
});

// Fetch event - optimized caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests with different strategies
  if (url.origin === self.location.origin) {
    // Same-origin requests
    if (url.pathname.startsWith('/assets/')) {
      // Vite assets - cache first, then network
      event.respondWith(cacheFirstStrategy(request));
    } else if (isImageRequest(url)) {
      // Images - cache first with fallback
      event.respondWith(imageCacheStrategy(request));
    } else if (isApiRequest(url.pathname)) {
      // API requests - network first, then cache
      event.respondWith(networkFirstStrategy(request));
    } else {
      // HTML pages - cache first, then network
      event.respondWith(cacheFirstStrategy(request));
    }
  } else {
    // Cross-origin requests - let network handle them
    return;
  }
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    return new Response('', { status: 504, statusText: 'Gateway Timeout' });
  }
}

// Network-first strategy for API requests
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Network-first strategy failed:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('', { status: 504, statusText: 'Gateway Timeout' });
  }
}

// Image caching strategy
async function imageCacheStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Image cache strategy failed:', error);
    // Return a placeholder image or fallback
    return new Response('', { status: 404, statusText: 'Not Found' });
  }
}

// Helper function to detect image requests
function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOrders());
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Ojawa',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-24x24.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-24x24.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Ojawa E-commerce', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          if (clientList.length > 0) {
            return clientList[0].focus();
          }
          return clients.openWindow('/');
        })
    );
  }
});

// Helper functions
function isApiRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

async function syncOrders() {
  try {
    // Get pending orders from IndexedDB
    const pendingOrders = await getPendingOrders();
    
    for (const order of pendingOrders) {
      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(order)
        });
        
        // Remove from pending orders
        await removePendingOrder(order.id);
      } catch (error) {
        console.error('Failed to sync order:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncNotifications() {
  try {
    // Sync notifications when back online
    const response = await fetch('/api/notifications');
    const notifications = await response.json();
    
    // Update local storage
    localStorage.setItem('notifications', JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to sync notifications:', error);
  }
}

async function getPendingOrders() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

async function removePendingOrder(orderId) {
  // Remove from IndexedDB
  console.log('Removing pending order:', orderId);
}

// Clean up old cache entries to manage storage
async function cleanupOldCacheEntries() {
  const maxCacheSize = 50; // Maximum number of entries per cache
  
  try {
    const dynamicCache = await caches.open(DYNAMIC_CACHE);
    const requests = await dynamicCache.keys();
    
    if (requests.length > maxCacheSize) {
      // Remove oldest entries (simple FIFO)
      const entriesToDelete = requests.slice(0, requests.length - maxCacheSize);
      await Promise.all(
        entriesToDelete.map(request => dynamicCache.delete(request))
      );
      console.log(`Service Worker: Cleaned up ${entriesToDelete.length} old cache entries`);
    }
    
    const imageCache = await caches.open(IMAGE_CACHE);
    const imageRequests = await imageCache.keys();
    
    if (imageRequests.length > maxCacheSize) {
      const imagesToDelete = imageRequests.slice(0, imageRequests.length - maxCacheSize);
      await Promise.all(
        imagesToDelete.map(request => imageCache.delete(request))
      );
      console.log(`Service Worker: Cleaned up ${imagesToDelete.length} old image cache entries`);
    }
  } catch (error) {
    console.error('Service Worker: Failed to cleanup cache entries', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker: Loaded');
