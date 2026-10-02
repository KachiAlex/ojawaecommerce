import { api } from './api';

let messagingSwRegistrationPromise = null;

const registerMessagingServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.reject(new Error('Service workers not supported'));
  }

  if (!messagingSwRegistrationPromise) {
    messagingSwRegistrationPromise = navigator.serviceWorker
      .register('/push-sw.js')
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
    const res = await api.request('/api/push/vapidPublicKey');
    return res?.vapidPublicKey || null;
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
    console.warn('⚠️ push initialization failed (non-critical):', error.message);
    return false;
  }
};

/**
 * Get push token and save to Firestore
 * @param {string} userId - User ID to associate token with
 * @returns {Promise<string|null>} - push token or null
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
    await api.request('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.warn('Failed to save subscription to backend:', err));

    return subscription;
  } catch (err) {
    console.warn('getPushSubscription error:', err.message || err);
    return null;
  }
};

/**
 * Save push token to Firestore user document
 * @param {string} userId - User ID
 * @param {string} token - push token
 */
const saveSubscriptionToBackend = async (userId, subscription) => {
  try {
    await api.request('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.warn('Failed to save subscription to backend:', err);
  }
};

/**
 * Subscribe to notification topic
 * @param {string} topic - Topic name
 * @param {string} token - push token
 * @returns {Promise<void>}
 */
export const subscribeToTopic = async (topic) => {
  try {
    await api.request('/api/push/subscribe-topic', {
      method: 'POST',
      body: JSON.stringify({ topic }),
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.warn('subscribeToTopic failed:', err);
  }
};

/**
 * Unsubscribe from notification topic
 * @param {string} topic - Topic name
 * @param {string} token - push token
 * @returns {Promise<void>}
 */
export const unsubscribeFromTopic = async (topic) => {
  try {
    await api.request('/api/push/unsubscribe-topic', {
      method: 'POST',
      body: JSON.stringify({ topic }),
      headers: { 'Content-Type': 'application/json' }
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
 * Check if push is supported in this browser
 * @returns {boolean}
 */
export const isPushSupported = () => {
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
 * Initialize push for a user
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} - push token or null
 */
export const initializePush = async (userId) => {
  try {
    console.log('Initializing push support...');

    if (!isPushSupported()) {
      console.log('Push not supported in this browser');
      return null;
    }

    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) return null;

    const subscription = await getPushSubscription(userId);
    return subscription;
  } catch (error) {
    // Silently handle push initialization errors (not critical)
    if (import.meta.env.DEV) {
      console.warn('push initialization error (non-critical):', error.code || error.message);
    }
    return null;
  }
};

/**
 * Remove push token from Firestore (on logout)
 * @param {string} userId - User ID
 */
export const removePushToken = async (userId) => {
  try {
    // Tell backend to remove all subscriptions for this user
    await api.request('/api/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Push subscription removed via backend');
  } catch (error) {
    console.error('Error removing push token:', error);
  }
};

export default {
  requestNotificationPermission,
  getPushSubscription,
  getPushToken: getPushSubscription,
  subscribeToTopic,
  unsubscribeFromTopic,
  handleForegroundMessage,
  isPushSupported,
  getPermissionStatus,
  initializePush,
  removePushToken
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

