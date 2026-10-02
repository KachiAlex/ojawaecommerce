// Service worker handling push notifications from Render backend.
// Firebase messaging removed after migration.

const DEFAULT_ICON = '/logos/ojawa-logo.png'

function sanitizeAppUrl(candidate) {
  if (!candidate || typeof candidate !== 'string') return '/buyer'

  try {
    const resolved = new URL(candidate, self.location.origin)
    if (resolved.origin !== self.location.origin) {
      return '/buyer'
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}` || '/buyer'
  } catch (_) {
    return candidate.startsWith('/') ? candidate : '/buyer'
  }
}

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

function handleNotificationPush(payload) {
  const { title = 'Notification', body = '', icon = DEFAULT_ICON, badge, data = {}, actions } = payload

  const notificationOptions = {
    body,
    icon,
    badge: badge || icon || DEFAULT_ICON,
    tag: data.notificationId || 'default',
    requireInteraction: data.priority === 'urgent',
    actions: actions || getNotificationActions(data.type),
    data,
    vibrate: data.priority === 'urgent' ? [200, 100, 200] : [200],
    silent: data.priority === 'low'
  }

  return self.registration.showNotification(title, notificationOptions)
}

function handleDataPush(payload) {
  console.log('Data push received:', payload)

  if (payload.action === 'update_cache') {
    updateCache(payload.data)
  } else if (payload.action === 'sync_data') {
    syncData(payload.data)
  }
}

function updateCache(data) {
  console.log('Updating cache with:', data)
}

function syncData(data) {
  console.log('Syncing data:', data)
}

// Listen for push events and display notifications using payloads sent by the Render backend.
self.addEventListener('push', (event) => {
  console.log('Push event received (backend):', event);

  if (!event.data) return;

  try {
    const payload = event.data.json();
    event.waitUntil(
      payload.type === 'data'
        ? Promise.resolve(handleDataPush(payload))
        : handleNotificationPush(payload)
    );
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)

  event.notification.close()

  const { data } = event.notification
  const { type, orderId, url, action } = data

  // Determine URL to open
  let targetUrl = '/'
  
  if (url) {
    targetUrl = sanitizeAppUrl(url)
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
          client.navigate(sanitizeAppUrl(targetUrl))
          return client.focus()
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(sanitizeAppUrl(targetUrl))
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
