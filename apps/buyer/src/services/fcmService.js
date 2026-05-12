let messagingSwRegistrationPromise = null;

const registerMessagingServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.reject(new Error('Service workers not supported'));
  }

  if (!messagingSwRegistrationPromise) {
    messagingSwRegistrationPromise = navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Messaging service worker registered');
        return registration;
      })
      .catch((error) => {
        messagingSwRegistrationPromise = null;
        console.warn('Failed to register messaging service worker:', error);
        throw error;
      });
  }

  return messagingSwRegistrationPromise;
};

// Try to get VAPID public key from global or backend
const fetchVapidPublicKey = async () => {
  if (typeof window !== 'undefined' && window.__VAPID_PUBLIC_KEY__) {
    return window.__VAPID_PUBLIC_KEY__;
  }

  try {
    const res = await fetch('/api/push/vapidPublicKey');
    if (res.ok) {
      const json = await res.json();
      return json.vapidPublicKey;
    }
  } catch (err) {
    console.warn('Failed to fetch VAPID public key from backend:', err.message || err);
  }

  return null;
};

/**
 * Request notification permission from user
 * @returns {Promise<boolean>} - True if permission granted
 */
export const requestNotificationPermission = async () => {
  try {
    console.log('Requesting notification permission...');
    
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      throw new Error('This browser does not support notifications');
    }

    if (Notification.permission === 'granted') {
      console.log('Notification permission already granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('Notification permission denied');
      // Don't throw error, just return false and let the app continue
      console.warn('⚠️ Notification permission was previously denied. User needs to enable it manually in browser settings.');
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      return true;
    } else {
      console.log('❌ Notification permission denied by user');
      // Don't throw error, just return false and let the app continue
      console.warn('⚠️ Notification permission was denied. User can enable it manually in browser settings.');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    // Don't throw error for permission issues - just return false
    console.warn('⚠️ FCM initialization failed (non-critical):', error.message);
    return false;
  }
};

/**
 * Get FCM token and save to Firestore
 * @param {string} userId - User ID to associate token with
 * @returns {Promise<string|null>} - FCM token or null
 */
export const getPushSubscription = async (userId) => {
  try {
    const vapidKey = await fetchVapidPublicKey();
    if (!vapidKey) {
      console.log('Push disabled - VAPID key not configured');
      return null;
    }

    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    const registration = await registerMessagingServiceWorker();

    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    const convertedKey = urlBase64ToUint8Array(vapidKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    // Send subscription to backend
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription })
    }).catch(err => console.warn('Failed to save subscription to backend:', err));

    return subscription;
  } catch (err) {
    console.warn('getPushSubscription error:', err.message || err);
    return null;
  }
};

/**
 * Save FCM token to Firestore user document
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
const saveSubscriptionToBackend = async (userId, subscription) => {
  try {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription })
    });
  } catch (err) {
    console.warn('Failed to save subscription to backend:', err);
  }
};

/**
 * Subscribe to notification topic
 * @param {string} topic - Topic name
 * @param {string} token - FCM token
 * @returns {Promise<void>}
 */
export const subscribeToTopic = async (topic) => {
  try {
    // Forward topic subscription to backend
    await fetch('/api/push/subscribe-topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });
  } catch (err) {
    console.warn('subscribeToTopic failed:', err);
  }
};

/**
 * Unsubscribe from notification topic
 * @param {string} topic - Topic name
 * @param {string} token - FCM token
 * @returns {Promise<void>}
 */
export const unsubscribeFromTopic = async (topic) => {
  try {
    await fetch('/api/push/unsubscribe-topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });
  } catch (err) {
    console.warn('unsubscribeFromTopic failed:', err);
  }
};

/**
 * Handle foreground messages
 * @param {Function} callback - Callback to handle message
 * @returns {Function} - Unsubscribe function
 */
export const handleForegroundMessage = (callback) => {
  // Foreground delivery can be implemented via WebSocket/SSE. For now, fallback to no-op.
  console.warn('Foreground messages not supported by push shim. Implement WebSocket or SSE for real-time foreground messages.');
  return () => {};
};

/**
 * Check if FCM is supported in this browser
 * @returns {boolean}
 */
export const isFCMSupported = () => {
  return 'Notification' in window && 
         'serviceWorker' in navigator && 
         'PushManager' in window;
};

/**
 * Get notification permission status
 * @returns {string} - 'granted', 'denied', 'default'
 */
export const getPermissionStatus = () => {
  if ('Notification' in window) {
    return Notification.permission;
  }
  return 'unsupported';
};

/**
 * Initialize FCM for a user
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} - FCM token or null
 */
export const initializeFCM = async (userId) => {
  try {
    console.log('Initializing push support...');

    if (!isFCMSupported()) {
      console.log('Push not supported in this browser');
      return null;
    }

    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) return null;

    const subscription = await getPushSubscription(userId);
    return subscription;
  } catch (error) {
    // Silently handle FCM initialization errors (not critical)
    if (process.env.NODE_ENV === 'development') {
      console.warn('FCM initialization error (non-critical):', error.code || error.message);
    }
    return null;
  }
};

/**
 * Remove FCM token from Firestore (on logout)
 * @param {string} userId - User ID
 */
export const removeFCMToken = async (userId) => {
  try {
    // Tell backend to remove subscription for this user
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    console.log('Push subscription removed via backend');
  } catch (error) {
    console.error('Error removing FCM token:', error);
  }
};

export default {
  requestNotificationPermission,
  getPushSubscription,
  subscribeToTopic,
  unsubscribeFromTopic,
  handleForegroundMessage,
  isFCMSupported,
  getPermissionStatus,
  initializeFCM,
  removeFCMToken
};

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

