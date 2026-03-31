// Centralized Firebase Admin initialization
const admin = require('firebase-admin');

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'ojawa-ecommerce';
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

function failFastAndExit(msg) {
  console.error('❌ FATAL: ' + msg);
  process.exit(1);
}

if (!firebaseClientEmail) {
  failFastAndExit('FIREBASE_CLIENT_EMAIL is missing. Check your Render environment variables.');
}
if (!firebasePrivateKey) {
  failFastAndExit('FIREBASE_PRIVATE_KEY is missing. Check your Render environment variables.');
}

// Fix for multiline private key issues
if (firebasePrivateKey && firebasePrivateKey.includes('\\n')) {
  firebasePrivateKey = firebasePrivateKey.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey,
      }),
      projectId: firebaseProjectId,
    });
    console.log(`✅ Firebase Admin initialized with service account for project ${firebaseProjectId}`);
  } catch (err) {
    failFastAndExit('Failed to initialize Firebase Admin: ' + (err && err.message ? err.message : err));
  }
}

module.exports = admin;
