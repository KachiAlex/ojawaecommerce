const { admin, db } = require('./scripts/adminInit');
const auth = admin.auth();

async function createAdminAccount() {
  try {
    console.log('Creating admin account for admin@ojawa.africa...');
    
    // Delete existing user if exists
    try {
      const existingUser = await auth.getUserByEmail('admin@ojawa.africa');
      await auth.deleteUser(existingUser.uid);
      console.log('Deleted existing admin user');
    } catch (error) {
      console.log('No existing user to delete');
    }
    
    // Create new user
    const userRecord = await auth.createUser({
      email: 'admin@ojawa.africa',
      password: 'Admin@123456!',
      displayName: 'Ojawa Africa Admin',
      emailVerified: true
    });
    
    console.log('Admin user created:', userRecord.uid);
    
    // Create user profile in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: 'admin@ojawa.africa',
      displayName: 'Ojawa Africa Admin',
      phone: '+2348012345678',
      address: 'Ojawa Headquarters, Lagos, Nigeria',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      role: 'admin',
      isVendor: false,
      isLogisticsPartner: false,
      isAdmin: true,
      vendorProfile: null,
      logisticsProfile: null,
      suspended: false,
      permissions: ['read', 'write', 'delete', 'manage_users', 'manage_vendors', 'manage_products', 'manage_orders', 'view_analytics', 'manage_settings']
    });
    
    console.log('Admin profile created in Firestore');
    
    // Create admin wallet
    await db.collection('wallets').doc(userRecord.uid).set({
      userId: userRecord.uid,
      type: 'admin',
      balance: 0,
      currency: 'NGN',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Admin wallet created');
    
    console.log('\nAdmin account created successfully!');
    console.log('Email: admin@ojawa.africa');
    console.log('Password: Admin@123456!');
    console.log('Login URL: https://ojawa-ecommerce.web.app/admin/login');
    
  } catch (error) {
    console.error('Error creating admin account:', error);
  }
}

createAdminAccount();
