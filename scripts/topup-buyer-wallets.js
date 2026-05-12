const admin = require('firebase-admin');

// Usage prerequisites:
// 1) Place serviceAccountKey.json at repo root OR set GOOGLE_APPLICATION_CREDENTIALS env var
// 2) Ensure Firestore has `users` collection with `role` (='buyer') and `wallets` collection
// 3) Run: node scripts/topup-buyer-wallets.js

async function initialize() {
  // Prefer GOOGLE_APPLICATION_CREDENTIALS if available
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    return;
  }

  // Fallback to local serviceAccountKey.json
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ojawa-ecommerce', // Use the correct Ojawa project
  });
}

async function topUpBuyerWallets() {
  const db = admin.firestore();
  const TARGET_AMOUNT = 200_000; // NGN 200,000
  const CURRENCY = 'NGN';

  console.log('Fetching buyers...');
  const buyersSnap = await db.collection('users').where('role', '==', 'buyer').get();
  console.log(`Found ${buyersSnap.size} buyers`);

  let updatedCount = 0;
  for (const userDoc of buyersSnap.docs) {
    const userId = userDoc.id;

    // Find user's wallet
    const walletsSnap = await db.collection('wallets').where('userId', '==', userId).get();
    if (walletsSnap.empty) {
      console.warn(`No wallet found for user ${userId}; creating one...`);
      const walletRef = await db.collection('wallets').add({
        userId,
        userType: 'buyer',
        balance: 0,
        currency: CURRENCY,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await setWalletBalance(db, walletRef.id, userId, TARGET_AMOUNT, 'Test top-up for buyers');
      updatedCount++;
      continue;
    }

    const walletDoc = walletsSnap.docs[0];
    const walletId = walletDoc.id;
    const currentBalance = walletDoc.data().balance || 0;

    if (currentBalance === TARGET_AMOUNT) {
      console.log(`Wallet ${walletId} already at ${TARGET_AMOUNT} NGN; skipping`);
      continue;
    }

    await setWalletBalance(db, walletId, userId, TARGET_AMOUNT, 'Test top-up for buyers');
    updatedCount++;
  }

  console.log(`Completed. Updated ${updatedCount} wallet(s) to ₦${TARGET_AMOUNT.toLocaleString('en-NG')}.`);
}

async function setWalletBalance(db, walletId, userId, targetAmount, description) {
  const walletRef = db.collection('wallets').doc(walletId);
  const walletSnap = await walletRef.get();
  const prev = walletSnap.exists ? (walletSnap.data().balance || 0) : 0;
  const delta = targetAmount - prev;

  const batch = db.batch();

  // Update wallet to target amount
  batch.update(walletRef, {
    balance: targetAmount,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create a transaction reflecting the adjustment
  const txRef = db.collection('wallet_transactions').doc();
  batch.set(txRef, {
    walletId,
    userId,
    type: delta >= 0 ? 'credit' : 'debit',
    amount: Math.abs(delta),
    description: description || 'Admin balance adjustment',
    balanceBefore: prev,
    balanceAfter: targetAmount,
    status: 'completed',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  console.log(`Wallet ${walletId}: ${prev} -> ${targetAmount} (delta ${delta >= 0 ? '+' : '-'}${Math.abs(delta)})`);
}

(async () => {
  try {
    await initialize();
    await topUpBuyerWallets();
  } catch (err) {
    console.error('Failed to top up buyer wallets:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
})();


