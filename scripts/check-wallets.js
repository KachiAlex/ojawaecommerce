const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ojawa-ecommerce'
});

const db = admin.firestore();

async function checkWallets() {
  try {
    console.log('Checking wallets in database...');

    // Get all wallets
    const walletsSnapshot = await db.collection('wallets').get();
    
    console.log(`Found ${walletsSnapshot.docs.length} wallets in database`);

    walletsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\nWallet ${index + 1} (ID: ${doc.id}):`);
      console.log('  - userId:', data.userId);
      console.log('  - walletId:', data.walletId);
      console.log('  - balance:', data.balance);
      console.log('  - currency:', data.currency);
      console.log('  - status:', data.status);
      console.log('  - userType:', data.userType);
      console.log('  - createdAt:', data.createdAt?.toDate?.() || data.createdAt);
    });

    // Check for any users without wallets
    const usersSnapshot = await db.collection('users').get();
    console.log(`\nFound ${usersSnapshot.docs.length} users in database`);

    const userIdsWithWallets = new Set();
    walletsSnapshot.docs.forEach(doc => {
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
          displayName: doc.data().displayName
        });
      }
    });

    if (usersWithoutWallets.length > 0) {
      console.log(`\nUsers without wallets (${usersWithoutWallets.length}):`);
      usersWithoutWallets.forEach(user => {
        console.log(`  - ${user.displayName || user.email} (${user.id})`);
      });
    } else {
      console.log('\nAll users have wallets!');
    }

  } catch (error) {
    console.error('Error checking wallets:', error);
  } finally {
    process.exit();
  }
}

checkWallets();
