import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
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

// Using cloud-based services only
console.log('Using Firebase cloud services');

export default app;
