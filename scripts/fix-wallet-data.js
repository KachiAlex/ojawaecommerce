const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ojawa-ecommerce'
});

const db = admin.firestore();

function generateTrackingId(prefix) {
  const year = new Date().getFullYear().toString().slice(-2);
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}-${randomPart}`;
}

async function fixWalletData() {
  try {
    console.log('Fixing wallet data...');

    // Get all wallets
    const walletsSnapshot = await db.collection('wallets').get();
    
    console.log(`Found ${walletsSnapshot.docs.length} wallets to fix`);

    const batch = db.batch();
    let updateCount = 0;

    walletsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const updates = {};

      // Add walletId if missing
      if (!data.walletId) {
        updates.walletId = generateTrackingId('WLT');
      }

      // Ensure balance is a number
      if (typeof data.balance !== 'number') {
        updates.balance = parseFloat(data.balance) || 0;
      }

      // Ensure currency is set
      if (!data.currency) {
        updates.currency = 'NGN';
      }

      // Ensure status is set
      if (!data.status) {
        updates.status = 'active';
      }

      // Update timestamp
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      // Apply updates if there are any
      if (Object.keys(updates).length > 0) {
        batch.update(doc.ref, updates);
        updateCount++;
        console.log(`Updating wallet for user ${data.userId}: balance=${data.balance}, adding walletId=${updates.walletId}`);
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updateCount} wallets`);
    } else {
      console.log('No wallets needed updating');
    }

    // Now check if any users need wallets created
    const usersSnapshot = await db.collection('users').get();
    const existingWallets = await db.collection('wallets').get();
    
    const userIdsWithWallets = new Set();
    existingWallets.docs.forEach(doc => {
      if (doc.data().userId) {
        userIdsWithWallets.add(doc.data().userId);
      }
    });

    const usersWithoutWallets = [];
    usersSnapshot.docs.forEach(doc => {
      if (!userIdsWithWallets.has(doc.id)) {
        usersWithoutWallets.push({
          id: doc.id,
          email: doc.data().email,
          displayName: doc.data().displayName,
          userType: doc.data().userType || 'buyer'
        });
      }
    });

    if (usersWithoutWallets.length > 0) {
      console.log(`\nCreating wallets for ${usersWithoutWallets.length} users without wallets...`);
      
      const createBatch = db.batch();
      usersWithoutWallets.forEach(user => {
        const walletRef = db.collection('wallets').doc();
        const walletData = {
          walletId: generateTrackingId('WLT'),
          userId: user.id,
          userType: user.userType,
          balance: 0,
          currency: 'NGN',
          status: 'active',
          totalTransactions: 0,
          totalCredits: 0,
          totalDebits: 0,
          lastTransactionAt: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        createBatch.set(walletRef, walletData);
        console.log(`Creating wallet for user ${user.displayName || user.email} (${user.id})`);
      });
      
      await createBatch.commit();
      console.log(`Successfully created ${usersWithoutWallets.length} wallets`);
    }

    console.log('Wallet data fix completed successfully!');
  } catch (error) {
    console.error('Error fixing wallet data:', error);
  } finally {
    process.exit();
  }
}

fixWalletData();
