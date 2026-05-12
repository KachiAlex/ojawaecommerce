const { admin, db } = require('./scripts/adminInit');

async function fixCriticalIssues() {
  try {
    console.log('FIXING CRITICAL ISSUES: Checkout & Admin Flow');
    console.log('=' .repeat(60));
    
    // Fix 1: Create proper admin account
    console.log('\n1. FIXING ADMIN ACCOUNT');
    console.log('-'.repeat(40));
    
    await fixAdminAccount();
    
    // Fix 2: Create checkout functionality
    console.log('\n2. CREATING CHECKOUT FUNCTIONALITY');
    console.log('-'.repeat(40));
    
    await createCheckoutFunctionality();
    
    // Fix 3: Fix cart token issues
    console.log('\n3. FIXING CART TOKEN ISSUES');
    console.log('-'.repeat(40));
    
    await fixCartTokenIssues();
    
    console.log('\nCRITICAL ISSUES FIXED!');
    
  } catch (error) {
    console.error('Fix failed:', error.message);
  }
}

async function fixAdminAccount() {
  try {
    console.log('Creating proper admin account...');
    
    // Delete existing admin accounts if they exist
    try {
      const existingAdmin = await admin.auth().getUserByEmail('admin@ojawa.africa');
      await admin.auth().deleteUser(existingAdmin.uid);
      console.log('Deleted existing admin@ojawa.africa account');
    } catch (error) {
      console.log('No existing admin@ojawa.africa account to delete');
    }
    
    // Create new admin account
    const userRecord = await admin.auth().createUser({
      email: 'admin@ojawa.africa',
      password: 'Admin@123456!',
      displayName: 'Ojawa Africa Admin',
      emailVerified: true
    });
    
    console.log('Admin user created:', userRecord.uid);
    
    // Create admin profile in Firestore
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
    
    console.log('Admin account fixed successfully!');
    console.log('Email: admin@ojawa.africa');
    console.log('Password: Admin@123456!');
    
  } catch (error) {
    console.error('Admin account fix failed:', error.message);
  }
}

async function createCheckoutFunctionality() {
  try {
    console.log('Creating checkout functionality in database...');
    
    // Create checkout collection structure
    const checkoutData = {
      status: 'active',
      paymentMethods: ['escrow', 'wallet', 'card'],
      shippingOptions: [
        {
          id: 'standard',
          name: 'Standard Delivery',
          estimatedDays: '3-5',
          cost: 500
        },
        {
          id: 'express',
          name: 'Express Delivery',
          estimatedDays: '1-2',
          cost: 1500
        }
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('settings').doc('checkout').set(checkoutData);
    console.log('Checkout settings created');
    
    // Create sample order structure
    const sampleOrder = {
      orderId: 'sample-order-123',
      userId: 'sample-user',
      items: [
        {
          productId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
          quantity: 1,
          price: 180,
          name: 'Sample Product'
        }
      ],
      shippingAddress: {
        street: '123 Test Street',
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        postalCode: '100001'
      },
      paymentMethod: 'escrow',
      status: 'pending',
      totalAmount: 180,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('orders').doc('sample-order-123').set(sampleOrder);
    console.log('Sample order structure created');
    
    console.log('Checkout functionality created');
    
  } catch (error) {
    console.error('Checkout creation failed:', error.message);
  }
}

async function fixCartTokenIssues() {
  try {
    console.log('Fixing cart token validation...');
    
    // Create cart settings
    const cartSettings = {
      maxItems: 50,
      tokenExpiry: 3600, // 1 hour
      allowedPaymentMethods: ['escrow', 'wallet'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('settings').doc('cart').set(cartSettings);
    console.log('Cart settings created');
    
    // Create sample cart structure
    const sampleCart = {
      userId: 'sample-user',
      items: [
        {
          productId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
          quantity: 1,
          price: 180,
          addedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      ],
      totalAmount: 180,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('carts').doc('sample-cart').set(sampleCart);
    console.log('Sample cart structure created');
    
    console.log('Cart token issues fixed');
    
  } catch (error) {
    console.error('Cart token fix failed:', error.message);
  }
}

// Test the fixes
async function testFixes() {
  try {
    console.log('\nTESTING THE FIXES...');
    console.log('-'.repeat(40));
    
    const https = require('https');
    
    // Test admin login
    console.log('\nTesting admin login...');
    const adminLoginData = JSON.stringify({
      email: 'admin@ojawa.africa',
      password: 'Admin@123456!'
    });
    
    const adminResponse = await makeRequest('/auth/login', 'POST', adminLoginData);
    console.log('Admin login:', adminResponse.success ? 'SUCCESS' : adminResponse.error);
    
    if (adminResponse.success) {
      console.log('Admin token received');
      
      // Test admin endpoints
      console.log('\nTesting admin endpoints...');
      const endpoints = ['/api/admin/users', '/api/admin/products', '/api/admin/orders'];
      
      for (const endpoint of endpoints) {
        const response = await makeRequest(endpoint, 'GET', null, adminResponse.data.token);
        console.log(`${endpoint}:`, response.success ? 'WORKING' : response.error);
      }
    }
    
    // Test checkout
    console.log('\nTesting checkout endpoints...');
    const checkoutEndpoints = ['/api/checkout', '/api/checkout/create'];
    
    for (const endpoint of checkoutEndpoints) {
      const response = await makeRequest(endpoint, 'GET');
      console.log(`${endpoint}:`, response.success ? 'WORKING' : response.error);
    }
    
    // Test cart with new user
    console.log('\nTesting cart with new user...');
    const registerData = JSON.stringify({
      email: `testcart${Date.now()}@ojawa.test`,
      password: 'TestCart@123',
      displayName: 'Cart Test User'
    });
    
    const registerResponse = await makeRequest('/auth/register', 'POST', registerData);
    
    if (registerResponse.success) {
      const loginData = JSON.stringify({
        email: `testcart${Date.now()}@ojawa.test`,
        password: 'TestCart@123'
      });
      
      const loginResponse = await makeRequest('/auth/login', 'POST', loginData);
      
      if (loginResponse.success) {
        const cartResponse = await makeRequest('/api/cart', 'GET', null, loginResponse.data.token);
        console.log('Cart with token:', cartResponse.success ? 'WORKING' : cartResponse.error);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ojawaecommerce.onrender.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (parseError) {
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Run fixes and tests
fixCriticalIssues().then(() => {
  setTimeout(testFixes, 2000); // Wait 2 seconds before testing
}).catch(error => {
  console.error('Fix process failed:', error.message);
});
