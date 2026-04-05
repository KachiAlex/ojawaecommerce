const admin = require('firebase-admin');
const fs = require('fs');

function initAdmin() {
  try {
    if (admin.apps && admin.apps.length) return admin;

    // Prefer explicit service account from env
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey && privateKey.includes('\\n')) {
      // already escaped
    } else if (privateKey) {
      // replace literal newlines if they were passed as \n
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      console.log('✅ Firebase Admin initialized from env in Render API');
      return admin;
    }

    // Fallback to application default credentials (on GCP/Render with ADC)
    try {
      admin.initializeApp();
      console.log('✅ Firebase Admin initialized using application default credentials');
      return admin;
    } catch (e) {
      console.warn('⚠️ Firebase Admin not initialized - no credentials available');
      return null;
    }
  } catch (err) {
    console.error('Failed to init Firebase Admin:', err.message || err);
    return null;
  }
}

module.exports = initAdmin();
