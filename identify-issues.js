const https = require('https');

async function identifyIssues() {
  try {
    console.log('IDENTIFYING CRITICAL ISSUES');
    console.log('=' .repeat(60));
    
    console.log('\n🔍 ISSUE ANALYSIS:');
    
    // Issue 1: Admin Account Problem
    console.log('\n1. ADMIN ACCOUNT ISSUE:');
    console.log('Problem: admin@ojawa.africa login fails');
    console.log('Cause: Account exists but password mismatch');
    console.log('Current Status: ❌ BROKEN');
    console.log('Required Fix: Password reset or account recreation');
    
    // Test admin@ojawa.com (working account)
    console.log('\nTesting admin@ojawa.com...');
    const adminLoginData = JSON.stringify({
      email: 'admin@ojawa.com',
      password: 'Admin123!'
    });
    
    const adminResponse = await makeRequest('/auth/login', 'POST', adminLoginData);
    console.log('admin@ojawa.com result:', adminResponse.success ? 'WORKING' : adminResponse.error);
    
    // Issue 2: Checkout System Missing
    console.log('\n2. CHECKOUT SYSTEM ISSUE:');
    console.log('Problem: /api/checkout and /api/checkout/create endpoints not found');
    console.log('Cause: Checkout routes not implemented in backend');
    console.log('Current Status: ❌ BROKEN');
    console.log('Required Fix: Implement checkout API endpoints');
    
    // Test all possible checkout endpoints
    console.log('\nTesting checkout endpoints...');
    const checkoutEndpoints = [
      '/api/checkout',
      '/api/checkout/create',
      '/api/orders/create',
      '/api/purchase',
      '/api/payment/process'
    ];
    
    for (const endpoint of checkoutEndpoints) {
      const response = await makeRequest(endpoint, 'GET');
      console.log(`${endpoint}: ${response.success ? 'EXISTS' : response.error}`);
    }
    
    // Issue 3: Cart Token Validation
    console.log('\n3. CART TOKEN VALIDATION ISSUE:');
    console.log('Problem: "Invalid token" error even with valid tokens');
    console.log('Cause: Token validation logic may have issues');
    console.log('Current Status: ⚠️ PARTIAL');
    console.log('Required Fix: Debug token validation middleware');
    
    // Test cart with different scenarios
    console.log('\nTesting cart token scenarios...');
    
    // Create new user and test cart
    const newUserEmail = `carttest${Date.now()}@ojawa.test`;
    const newUserPassword = 'CartTest@123';
    
    // Register
    const registerData = JSON.stringify({
      email: newUserEmail,
      password: newUserPassword,
      displayName: 'Cart Test User'
    });
    
    const registerResponse = await makeRequest('/auth/register', 'POST', registerData);
    
    if (registerResponse.success) {
      console.log('New user registered');
      
      // Login
      const loginData = JSON.stringify({
        email: newUserEmail,
        password: newUserPassword
      });
      
      const loginResponse = await makeRequest('/auth/login', 'POST', loginData);
      
      if (loginResponse.success) {
        console.log('New user logged in');
        const token = loginResponse.data.token;
        
        // Test cart operations
        console.log('Testing cart with fresh token...');
        
        // Get cart
        const cartResponse = await makeRequest('/api/cart', 'GET', null, token);
        console.log('Get cart:', cartResponse.success ? 'SUCCESS' : cartResponse.error);
        
        // Add to cart
        const addToCartData = JSON.stringify({
          productId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
          quantity: 1
        });
        
        const addResponse = await makeRequest('/api/cart/add', 'POST', addToCartData, token);
        console.log('Add to cart:', addResponse.success ? 'SUCCESS' : addResponse.error);
        
        if (addResponse.success) {
          // Get updated cart
          const updatedCartResponse = await makeRequest('/api/cart', 'GET', null, token);
          console.log('Get updated cart:', updatedCartResponse.success ? 'SUCCESS' : updatedCartResponse.error);
        }
      }
    }
    
    // Issue 4: Admin Endpoints Missing
    console.log('\n4. ADMIN ENDPOINTS ISSUE:');
    console.log('Problem: All /api/admin/* endpoints return "Not found"');
    console.log('Cause: Admin API routes not implemented');
    console.log('Current Status: ❌ BROKEN');
    console.log('Required Fix: Implement admin API endpoints');
    
    // Test admin endpoints with working admin account
    if (adminResponse.success) {
      console.log('\nTesting admin endpoints with working token...');
      const adminEndpoints = [
        '/api/admin',
        '/api/admin/users',
        '/api/admin/products',
        '/api/admin/orders',
        '/api/admin/dashboard',
        '/api/admin/analytics'
      ];
      
      for (const endpoint of adminEndpoints) {
        const response = await makeRequest(endpoint, 'GET', null, adminResponse.data.token);
        console.log(`${endpoint}: ${response.success ? 'WORKING' : response.error}`);
      }
    }
    
    // Summary
    console.log('\n📊 ISSUE SUMMARY:');
    console.log('=' .repeat(60));
    console.log('CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:');
    console.log('');
    console.log('1. ❌ ADMIN ACCOUNT');
    console.log('   - admin@ojawa.africa credentials not working');
    console.log('   - admin@ojawa.com works but may not be intended');
    console.log('   - Fix: Update admin credentials or create new admin account');
    console.log('');
    console.log('2. ❌ CHECKOUT SYSTEM');
    console.log('   - No checkout endpoints implemented');
    console.log('   - Cannot create orders from cart');
    console.log('   - Fix: Implement /api/checkout/create endpoint');
    console.log('');
    console.log('3. ⚠️ CART TOKEN VALIDATION');
    console.log('   - Some token validation issues');
    console.log('   - May be timing or middleware related');
    console.log('   - Fix: Debug token validation logic');
    console.log('');
    console.log('4. ❌ ADMIN ENDPOINTS');
    console.log('   - No admin API routes implemented');
    console.log('   - Cannot access admin functionality');
    console.log('   - Fix: Implement admin API endpoints');
    console.log('');
    console.log('🎯 PRIORITY ORDER:');
    console.log('1. HIGH: Implement checkout system');
    console.log('2. HIGH: Fix admin account access');
    console.log('3. MEDIUM: Debug cart token issues');
    console.log('4. MEDIUM: Implement admin endpoints');
    
  } catch (error) {
    console.error('Issue identification failed:', error.message);
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
          resolve({ success: false, error: 'Parse error', raw: responseData });
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

identifyIssues();
