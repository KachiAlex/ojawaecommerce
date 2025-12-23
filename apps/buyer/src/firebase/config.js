import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  clearIndexedDbPersistence,
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

  const deleteIndexedDb = (dbName) => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) return resolve(false);
      const deleteRequest = window.indexedDB.deleteDatabase(dbName);
      let deleted = true;
      deleteRequest.onsuccess = () => resolve(deleted);
      deleteRequest.onerror = () => resolve(false);
      deleteRequest.onblocked = () => resolve(false);
    });
  };

  const clearFirestoreIndexedDb = async () => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) return;
      const explicitDbNames = [
        'firestore/[DEFAULT]/ojawa-ecommerce',
        'firebaseLocalStorageDb',
        'firebase-installations-database',
        'firebase-app-check-store',
        'firebase-heartbeat-database'
      ];
      const discoveredNames = new Set();

      if (typeof window.indexedDB.databases === 'function') {
        try {
          const dbs = await window.indexedDB.databases();
          dbs?.forEach((dbInfo) => {
            if (!dbInfo?.name) return;
            if (dbInfo.name.startsWith('firestore/')) {
              discoveredNames.add(dbInfo.name);
            }
          });
        } catch (dbListErr) {
          originalWarn('⚠️ Firebase: Unable to enumerate IndexedDB databases', dbListErr?.message);
        }
      }

      explicitDbNames.forEach((name) => discoveredNames.add(name));
      if (!discoveredNames.size) return;

      let deletedCount = 0;
      for (const name of discoveredNames) {
        const deleted = await deleteIndexedDb(name);
        if (deleted) {
          deletedCount += 1;
        }
      }
      if (deletedCount > 0) {
        originalLog(`🧼 Firebase: Cleared ${deletedCount} IndexedDB caches`);
      }
    } catch (err) {
      originalWarn('⚠️ Firebase: Unable to clear IndexedDB caches', err?.message);
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
  
  const clearFirestoreLocalStorage = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('firestore_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        try {
          window.localStorage.removeItem(key);
        } catch (storageErr) {
          originalWarn('⚠️ Firebase: Failed to remove localStorage key', key, storageErr?.message);
        }
      });
      if (keysToRemove.length > 0) {
        originalLog(`🧹 Firebase: Cleared ${keysToRemove.length} cached Firestore localStorage entries`);
      }
    } catch (storageError) {
      originalWarn('⚠️ Firebase: Unable to inspect Firestore localStorage cache', storageError?.message);
    }
  };

  const handleQuotaExceeded = async (err) => {
    const isQuotaError = err?.name === 'QuotaExceededError' || /quota(exceeded)?/i.test(err?.message || '');
    if (!isQuotaError) return false;

    originalWarn('🔥 Firebase: Firestore persistence quota exceeded - falling back to in-memory cache');
    clearFirestoreLocalStorage();
    try {
      await clearIndexedDbPersistence(db);
      originalLog('🧼 Firebase: Cleared IndexedDB persistence cache after quota error');
    } catch (clearErr) {
      // Ignore if another tab is using persistence
      originalWarn('⚠️ Firebase: Unable to clear IndexedDB cache', clearErr?.code || clearErr?.message);
    }
    persistenceEnabled = false;
    restoreConsole();
    return true;
  };

  const initializePersistence = async () => {
    try {
      const shouldEnablePersistence = import.meta.env.MODE !== 'production';
      clearFirestoreLocalStorage();

      if (!shouldEnablePersistence) {
        await clearFirestoreIndexedDb();
        originalLog('ℹ️ Firebase: Persistence disabled in production to avoid quota issues');
        restoreConsole();
        return;
      }

      await enableMultiTabIndexedDbPersistence(db);
      persistenceEnabled = true;
      originalLog('✅ Firebase: Offline persistence enabled (multi-tab)');
      restoreConsole();
    } catch (err) {
      const quotaHandled = await handleQuotaExceeded(err);
      if (quotaHandled) {
        return;
      }
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, try single-tab persistence as fallback
        originalLog('⚠️ Firebase: Multi-tab persistence unavailable - trying single-tab');
        try {
          await enableIndexedDbPersistence(db);
          persistenceEnabled = true;
          originalLog('✅ Firebase: Offline persistence enabled (single-tab)');
          restoreConsole();
        } catch (error) {
          const fallbackQuotaHandled = await handleQuotaExceeded(error);
          if (fallbackQuotaHandled) {
            return;
          }
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
      } else if (!(await handleQuotaExceeded(err))) {
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
