// Script to count products in Firestore
require('dotenv').config({ path: require('path').join(__dirname, '../functions/.env') });
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase credentials. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in functions/.env');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  projectId,
});

const db = admin.firestore();

async function countProducts() {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Firestore query timed out after 15 seconds')), 15000)
  );
  try {
    const snapshot = await Promise.race([
      db.collection('products').get(),
      timeout,
    ]);
    console.log('Number of products in Firestore:', snapshot.size);
    process.exit(0);
  } catch (err) {
    console.error('Error fetching products:', err.message);
    process.exit(1);
  }
}

countProducts();
