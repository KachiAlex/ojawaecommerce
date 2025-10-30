import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDV7ri3eu2M5apQqhhxoX9yhKXWXuqpsYc",
  authDomain: "ojawa-ecommerce.firebaseapp.com",
  projectId: "ojawa-ecommerce",
  storageBucket: "ojawa-ecommerce.firebasestorage.app",
  messagingSenderId: "630985044975",
  appId: "1:630985044975:web:3b421d368eea0c56ac3c1a",
  measurementId: "G-W3PF1KBMPN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Configure auth settings for better reliability
auth.settings.appVerificationDisabledForTesting = false;

// Enable offline persistence for Firestore with error handling
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db)
    .then(() => {
      console.log('✅ Firebase: Offline persistence enabled (multi-tab)');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('⚠️ Firebase: Persistence failed - multiple tabs open');
        // Try single-tab persistence as fallback
        enableIndexedDbPersistence(db)
          .then(() => {
            console.log('✅ Firebase: Offline persistence enabled (single-tab)');
          })
          .catch((error) => {
            console.warn('⚠️ Firebase: Single-tab persistence also failed:', error.code);
          });
      } else if (err.code === 'unimplemented') {
        // The current browser doesn't support persistence
        console.warn('⚠️ Firebase: Persistence not supported in this browser');
      } else {
        console.error('❌ Firebase: Persistence error:', err);
      }
    });
}

// Initialize messaging if supported
let messaging = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.log('Messaging not supported in this environment:', error.message);
}

export { messaging };

// Configure network timeout and retry settings
const NETWORK_TIMEOUT = 10000; // 10 seconds
const MAX_RETRY_ATTEMPTS = 3;

// Global Firebase error handler
const setupFirebaseErrorHandling = () => {
  // Monitor connection state
  if (typeof window !== 'undefined') {
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;
    
    window.addEventListener('online', () => {
      console.log('🌐 Firebase: Network connection restored');
      consecutiveErrors = 0;
    });
    
    window.addEventListener('offline', () => {
      console.log('📴 Firebase: Network connection lost - using cached data');
    });
    
    // Intercept fetch for Firebase requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0];
      
      // Check if it's a Firebase request
      if (typeof url === 'string' && (
        url.includes('firestore.googleapis.com') ||
        url.includes('firebase.googleapis.com')
      )) {
        try {
          const response = await originalFetch(...args);
          consecutiveErrors = 0;
          return response;
        } catch (error) {
          consecutiveErrors++;
          
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.error('🔥 Firebase: Multiple consecutive network errors detected');
            consecutiveErrors = 0; // Reset to avoid spam
          }
          
          throw error;
        }
      }
      
      return originalFetch(...args);
    };
  }
};

setupFirebaseErrorHandling();

// Using cloud-based services only
console.log('✅ Firebase: Cloud services initialized with offline support');

export default app;
