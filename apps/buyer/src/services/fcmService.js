import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from '../firebase/config';
import { db } from '../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const messaging = getMessaging(app);

let messagingSwRegistrationPromise = null;

const registerMessagingServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.reject(new Error('Service workers not supported'));
  }

  if (!messagingSwRegistrationPromise) {
    messagingSwRegistrationPromise = navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Firebase messaging service worker registered');
        return registration;
      })
      .catch((error) => {
        messagingSwRegistrationPromise = null;
        console.warn('Failed to register Firebase messaging service worker:', error);
        throw error;
      });
  }

  return messagingSwRegistrationPromise;
};

// VAPID key for web push (optional - FCM will work without it for basic functionality)
const VAPID_KEY = 'BEl62iUYgUivLOI6SIKpGzlDq5y2p-4jlbVuBHTj-c0'; // Demo VAPID key for testing

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
export const getFCMToken = async (userId) => {
  try {
    // Skip FCM if VAPID key is not configured
    if (!VAPID_KEY) {
      console.log('FCM disabled - VAPID key not configured');
      return null;
    }

    console.log('Getting FCM token for user:', userId);
    
    // Check if permission granted
    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    let serviceWorkerRegistration = null;
    try {
      serviceWorkerRegistration = await registerMessagingServiceWorker();
    } catch (err) {
      console.warn('FCM service worker registration failed (non-critical):', err.message);
    }

    // Get token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: serviceWorkerRegistration || undefined
    });

    if (token) {
      console.log('FCM token obtained:', token.substring(0, 20) + '...');
      
      // Save token to Firestore
      await saveFCMToken(userId, token);
      
      return token;
    } else {
      console.log('No FCM token available');
      return null;
    }
  } catch (error) {
    // Silently handle FCM token errors (not critical for app functionality)
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.warn('FCM token error (non-critical):', error.code || error.message);
    }
    
    // Handle specific errors silently
    if (error.code === 'messaging/permission-blocked') {
      // User blocked notifications - this is fine
    } else if (error.code === 'messaging/failed-service-worker-registration') {
      // Service worker issue - not critical
    } else if (error.code === 'messaging/token-subscribe-failed') {
      // FCM not fully configured - not critical
    }
    
    return null;
  }
};

/**
 * Save FCM token to Firestore user document
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
const saveFCMToken = async (userId, token) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
      fcmTokenUpdatedAt: serverTimestamp()
    });
    
    console.log('FCM token saved to Firestore');
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw error;
  }
};

/**
 * Subscribe to notification topic
 * @param {string} topic - Topic name
 * @param {string} token - FCM token
 * @returns {Promise<void>}
 */
export const subscribeToTopic = async (topic, token) => {
  try {
    console.log(`Subscribing to topic: ${topic}`);
    
    // Note: Topic subscription is typically done on the backend
    // via Cloud Functions for security reasons
    // This is just a placeholder for the client-side API
    
    console.log('Topic subscription should be handled by backend');
  } catch (error) {
    console.error('Error subscribing to topic:', error);
  }
};

/**
 * Unsubscribe from notification topic
 * @param {string} topic - Topic name
 * @param {string} token - FCM token
 * @returns {Promise<void>}
 */
export const unsubscribeFromTopic = async (topic, token) => {
  try {
    console.log(`Unsubscribing from topic: ${topic}`);
    
    // Note: Topic unsubscription is typically done on the backend
    console.log('Topic unsubscription should be handled by backend');
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
  }
};

/**
 * Handle foreground messages
 * @param {Function} callback - Callback to handle message
 * @returns {Function} - Unsubscribe function
 */
export const handleForegroundMessage = (callback) => {
  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Call callback with payload
      if (callback && typeof callback === 'function') {
        callback(payload);
      }
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        const { notification, data } = payload;
        
        const notificationOptions = {
          body: notification?.body || '',
          icon: notification?.icon || '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: data?.notificationId || 'default',
          data: data,
          requireInteraction: data?.priority === 'urgent'
        };
        
        new Notification(notification?.title || 'New Notification', notificationOptions);
      }
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up foreground message handler:', error);
    return () => {}; // Return empty function
  }
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
    // Skip FCM if VAPID key is not configured
    if (!VAPID_KEY) {
      console.log('FCM disabled - VAPID key not configured');
      return null;
    }

    console.log('Initializing FCM...');
    
    // Check if FCM supported
    if (!isFCMSupported()) {
      console.log('FCM not supported in this browser');
      return null;
    }
    
    // Request permission
    const permissionGranted = await requestNotificationPermission();
    
    if (!permissionGranted) {
      console.log('Notification permission not granted');
      return null;
    }
    
    // Get FCM token
    const token = await getFCMToken(userId);
    
    return token;
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
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: null,
      fcmTokenUpdatedAt: serverTimestamp()
    });
    
    console.log('FCM token removed from Firestore');
  } catch (error) {
    console.error('Error removing FCM token:', error);
  }
};

export default {
  requestNotificationPermission,
  getFCMToken,
  subscribeToTopic,
  unsubscribeFromTopic,
  handleForegroundMessage,
  isFCMSupported,
  getPermissionStatus,
  initializeFCM,
  removeFCMToken
};

