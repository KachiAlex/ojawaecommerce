// Firebase Lite Configuration - Optimized for smaller bundle size
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvQzQzQzQzQzQzQzQzQzQzQzQzQzQzQzQ",
  authDomain: "ojawa-ecommerce.firebaseapp.com",
  projectId: "ojawa-ecommerce",
  storageBucket: "ojawa-ecommerce.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnopqrstuvwxyz"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Keep users signed in across refresh; fallback to session persistence if local storage is unavailable.
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(async () => {
    try {
      await setPersistence(auth, browserSessionPersistence);
      console.warn('⚠️ Firebase Auth Lite: Falling back to session persistence');
    } catch (err) {
      console.warn('⚠️ Firebase Auth Lite: Unable to set persistence mode', err?.message || err);
    }
  });
}

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (error) {
    console.log('Emulators already connected or not available');
  }
}

export default app;
