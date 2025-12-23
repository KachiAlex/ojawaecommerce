// Firebase Messaging Service Worker (kept lightweight post-PWA removal)
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: "AIzaSyDV7ri3eu2M5apQqhhxoX9yhKXWXuqpsYc",
  authDomain: "ojawa-ecommerce.firebaseapp.com",
  projectId: "ojawa-ecommerce",
  storageBucket: "ojawa-ecommerce.firebasestorage.app",
  messagingSenderId: "630985044975",
  appId: "1:630985044975:web:3b421d368eea0c56ac3c1a",
  measurementId: "G-W3PF1KBMPN"
}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

const DEFAULT_ICON = '/logos/ojawa-logo.png'

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)

  const { notification = {}, data = {} } = payload

  const notificationOptions = {
    body: notification.body,
    icon: notification.icon || DEFAULT_ICON,
    badge: DEFAULT_ICON,
    tag: data.notificationId || 'default',
    requireInteraction: data.priority === 'urgent',
    actions: getNotificationActions(data.type),
    data,
    vibrate: data.priority === 'urgent' ? [200, 100, 200] : [200],
    silent: data.priority === 'low'
  }

  return self.registration.showNotification(notification.title, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)

  event.notification.close()

  const { data } = event.notification
  const { type, orderId, url, action } = data

  // Determine URL to open
  let targetUrl = '/'
  
  if (url) {
    targetUrl = url
  } else {
    switch (type) {
      case 'order_update':
        targetUrl = orderId ? `/orders/${orderId}` : '/buyer'
        break
      case 'payment_success':
        targetUrl = '/buyer'
        break
      case 'shipment_update':
        targetUrl = orderId ? `/tracking/${orderId}` : '/tracking'
        break
      case 'dispute_alert':
        targetUrl = '/buyer?tab=disputes'
        break
      default:
        targetUrl = '/buyer'
    }
  }

  // Handle action buttons
  if (event.action) {
    switch (event.action) {
      case 'view_order':
        targetUrl = orderId ? `/orders/${orderId}` : '/buyer'
        break
      case 'track_order':
        targetUrl = orderId ? `/tracking/${orderId}` : '/tracking'
        break
      case 'view_receipt':
        targetUrl = '/buyer'
        break
      case 'resolve_dispute':
        targetUrl = '/buyer?tab=disputes'
        break
    }
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event)
  
  // Track notification dismissal
  if (event.notification.data?.trackDismissal) {
    // Send analytics event
    fetch('/api/analytics/notification-dismissed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: event.notification.data.notificationId,
        type: event.notification.data.type,
        timestamp: new Date().toISOString()
      })
    }).catch(error => {
      console.error('Failed to track notification dismissal:', error)
    })
  }
})

// Get notification actions based on type
function getNotificationActions(type) {
  const actions = []
  
  switch (type) {
    case 'order_update':
      actions.push(
        { action: 'view_order', title: 'View Order' },
        { action: 'track_order', title: 'Track Order' }
      )
      break
    case 'payment_success':
      actions.push(
        { action: 'view_receipt', title: 'View Receipt' },
        { action: 'continue_shopping', title: 'Continue Shopping' }
      )
      break
    case 'shipment_update':
      actions.push(
        { action: 'track_shipment', title: 'Track Shipment' },
        { action: 'view_details', title: 'View Details' }
      )
      break
    case 'dispute_alert':
      actions.push(
        { action: 'resolve_dispute', title: 'Resolve Dispute' },
        { action: 'contact_support', title: 'Contact Support' }
      )
      break
  }
  
  return actions
}

// Handle push events
self.addEventListener('push', (event) => {
  console.log('Push event received:', event)

  if (event.data) {
    try {
      const payload = event.data.json()
      console.log('Push payload:', payload)
      
      // Handle different push types
      if (payload.type === 'notification') {
        handleNotificationPush(payload)
      } else if (payload.type === 'data') {
        handleDataPush(payload)
      }
    } catch (error) {
      console.error('Error parsing push data:', error)
    }
  }
})

// Handle notification push
function handleNotificationPush(payload) {
  const { title, body, icon, badge, data = {}, actions } = payload
  
  const notificationOptions = {
    body,
    icon: icon || DEFAULT_ICON,
    badge: badge || DEFAULT_ICON,
    tag: data.notificationId || 'default',
    requireInteraction: data.priority === 'urgent',
    actions: actions || getNotificationActions(data.type),
    data,
    vibrate: data.priority === 'urgent' ? [200, 100, 200] : [200],
    silent: data.priority === 'low'
  }

  return self.registration.showNotification(title, notificationOptions)
}

// Handle data push
function handleDataPush(payload) {
  // Handle silent data pushes
  console.log('Data push received:', payload)
  
  // Update app state or cache
  if (payload.action === 'update_cache') {
    updateCache(payload.data)
  } else if (payload.action === 'sync_data') {
    syncData(payload.data)
  }
}

// Update cache
function updateCache(data) {
  // Implementation for cache updates
  console.log('Updating cache with:', data)
}

// Sync data
function syncData(data) {
  // Implementation for data synchronization
  console.log('Syncing data:', data)
}

// Handle service worker updates
self.addEventListener('message', (event) => {
  console.log('Service worker message:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service worker activated')
  
  event.waitUntil(
    clients.claim().then(() => {
      console.log('Service worker claimed clients')
    })
  )
})

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('Service worker installed')
  
  // Skip waiting to activate immediately
  self.skipWaiting()
})
