const { admin, db } = require('../firebase-admin');
const auth = admin.auth();

async function resetAdminPassword() {
  try {
    console.log('Resetting admin password for admin@ojawa.africa...');
    
    // Get the user
    const userRecord = await auth.getUserByEmail('admin@ojawa.africa');
    console.log('Found user:', userRecord.uid);
    
    // Update password
    await auth.updateUser(userRecord.uid, {
      password: 'admin123',
      emailVerified: true
    });
    
    console.log('Password updated successfully!');
    
    // Update user profile to ensure admin role
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
    }, { merge: true });
    
    console.log('Admin profile updated in Firestore!');
    
    console.log('\nAdmin account is ready!');
    console.log('Email: admin@ojawa.africa');
    console.log('Password: admin123');
    console.log('Login URL: https://ojawa-ecommerce.web.app/admin/login');
    
  } catch (error) {
    console.error('Error resetting admin password:', error);
  }
}

resetAdminPassword();
