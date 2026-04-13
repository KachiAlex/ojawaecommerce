const { admin, db } = require('./scripts/adminInit');
const auth = admin.auth();

async function resetAdminPassword() {
  try {
    console.log('Resetting admin password for admin@ojawa.africa...');
    
    // Get the user
    const userRecord = await auth.getUserByEmail('admin@ojawa.africa');
    console.log('Found user:', userRecord.uid);
    
    // Update password
    await auth.updateUser(userRecord.uid, {
      password: 'Admin@123456!',
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
    console.log('Password: Admin@123456!');
    console.log('Login URL: https://ojawa-ecommerce.web.app/admin/login');
    
    // Test login
    const https = require('https');
    
    const loginData = JSON.stringify({
      email: 'admin@ojawa.africa',
      password: 'Admin@123456!'
    });
    
    const loginOptions = {
      hostname: 'ojawaecommerce.onrender.com',
      port: 443,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const loginReq = https.request(loginOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('\nLogin test result:', response);
          
          if (response.success) {
            console.log('Admin login successful!');
            console.log('Token:', response.data.token.substring(0, 50) + '...');
            console.log('Role:', response.data.role);
          } else {
            console.log('Login failed:', response.error);
          }
        } catch (parseError) {
          console.error('Failed to parse login response:', parseError.message);
          console.log('Raw response:', data);
        }
      });
    });
    
    loginReq.on('error', (error) => {
      console.error('Login test failed:', error.message);
    });
    
    loginReq.write(loginData);
    loginReq.end();
    
  } catch (error) {
    console.error('Error resetting admin password:', error);
  }
}

resetAdminPassword();
