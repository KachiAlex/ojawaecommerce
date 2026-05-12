const admin = require('firebase-admin');

// Initialize Admin SDK using Application Default Credentials if available
// Prefer GOOGLE_APPLICATION_CREDENTIALS env or Workload Identity; avoid bundling keys in repo
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (err) {
    // As a last resort, allow manual path via env SERVICE_ACCOUNT_PATH (JSON file), but do not hardcode
    const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH;
    if (!serviceAccountPath) {
      throw new Error(
        'Firebase Admin failed to initialize. Set GOOGLE_APPLICATION_CREDENTIALS or SERVICE_ACCOUNT_PATH to a valid service account JSON.'
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

const db = admin.firestore();

module.exports = { admin, db };
