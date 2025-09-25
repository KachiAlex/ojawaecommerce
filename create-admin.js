// Script to create an admin user
// Run this with: node create-admin.js

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
// and place it in the project root as 'service-account-key.json'
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Add your project ID here
  projectId: 'your-project-id'
});

const db = admin.firestore();

async function createAdminUser() {
  try {
    // Create admin user in Firebase Auth
    const adminUser = await admin.auth().createUser({
      email: 'admin@ojawa.com',
      password: 'Admin123!',
      displayName: 'Ojawa Admin',
      emailVerified: true
    });

    console.log('✅ Admin user created in Firebase Auth:', adminUser.uid);

    // Create admin profile in Firestore
    const adminProfile = {
      uid: adminUser.uid,
      email: 'admin@ojawa.com',
      displayName: 'Ojawa Admin',
      phone: '+1234567890',
      address: 'Admin Office',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      role: 'admin',
      isVendor: false,
      isLogisticsPartner: false,
      isAdmin: true,
      vendorProfile: null,
      logisticsProfile: null,
      suspended: false
    };

    await db.collection('users').doc(adminUser.uid).set(adminProfile);
    console.log('✅ Admin profile created in Firestore');

    // Create admin wallet
    const walletData = {
      userId: adminUser.uid,
      balance: 0,
      currency: 'USD',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      transactions: []
    };

    await db.collection('wallets').doc(adminUser.uid).set(walletData);
    console.log('✅ Admin wallet created');

    console.log('\n🎉 Admin user created successfully!');
    console.log('📧 Email: admin@ojawa.com');
    console.log('🔑 Password: Admin123!');
    console.log('🔗 Login URL: http://localhost:3000/login');
    console.log('👑 Admin Dashboard: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

createAdminUser();
