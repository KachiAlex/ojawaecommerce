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
// Use a singleton pattern to ensure persistence is only enabled once
let persistenceEnabled = false;

if (typeof window !== 'undefined' && !persistenceEnabled) {
  // Suppress "Failed to obtain primary lease" warnings during initialization
  // These are harmless internal Firebase logs when multiple tabs compete for primary lease
  const suppressedPattern = /Failed to obtain primary lease for action/;
  const originalLog = console.log.bind(console);
  const originalWarn = console.warn.bind(console);
  let suppressionActive = true;
  
  // Helper to restore original console methods
  const restoreConsole = () => {
    if (suppressionActive) {
      console.log = originalLog;
      console.warn = originalWarn;
      suppressionActive = false;
    }
  };
  
  // Intercept console.log and console.warn to suppress Firestore lease warnings
  console.log = function(...args) {
    const message = args.join(' ');
    if (suppressionActive && suppressedPattern.test(message)) {
      // Suppress these specific Firestore internal warnings - they're harmless
      return;
    }
    originalLog.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.join(' ');
    if (suppressionActive && suppressedPattern.test(message)) {
      // Suppress these specific Firestore internal warnings - they're harmless
      return;
    }
    originalWarn.apply(console, args);
  };
  
  const initializePersistence = async () => {
    try {
      await enableMultiTabIndexedDbPersistence(db);
      persistenceEnabled = true;
      originalLog('✅ Firebase: Offline persistence enabled (multi-tab)');
      restoreConsole();
    } catch (err) {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, try single-tab persistence as fallback
        originalLog('⚠️ Firebase: Multi-tab persistence unavailable - trying single-tab');
        try {
          await enableIndexedDbPersistence(db);
          persistenceEnabled = true;
          originalLog('✅ Firebase: Offline persistence enabled (single-tab)');
          restoreConsole();
        } catch (error) {
          if (error.code === 'failed-precondition') {
            // Another tab already has persistence - this is expected and harmless
            originalLog('ℹ️ Firebase: Persistence handled by another tab');
            persistenceEnabled = true;
          } else {
            originalWarn('⚠️ Firebase: Single-tab persistence also failed:', error.code);
          }
          restoreConsole();
        }
      } else if (err.code === 'unimplemented') {
        // The current browser doesn't support persistence
        originalWarn('⚠️ Firebase: Persistence not supported in this browser');
        restoreConsole();
      } else {
        console.error('❌ Firebase: Persistence error:', err);
        restoreConsole();
      }
    }
  };
  
  initializePersistence();
  
  // Safety net: restore console methods after a timeout
  setTimeout(() => {
    restoreConsole();
  }, 5000);
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
