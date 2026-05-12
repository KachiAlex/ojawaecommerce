const https = require('https');

async function verifyFixesStatus() {
  try {
    console.log('VERIFYING FIXES STATUS');
    console.log('=' .repeat(60));
    
    // Test 1: Checkout System Status
    console.log('\n1. CHECKOUT SYSTEM STATUS');
    console.log('-'.repeat(40));
    
    await testCheckoutSystem();
    
    // Test 2: Admin Account Status
    console.log('\n2. ADMIN ACCOUNT STATUS');
    console.log('-'.repeat(40));
    
    await testAdminAccount();
    
    // Test 3: Cart Token Validation Status
    console.log('\n3. CART TOKEN VALIDATION STATUS');
    console.log('-'.repeat(40));
    
    await testCartTokenValidation();
    
    // Test 4: Admin Endpoints Status
    console.log('\n4. ADMIN ENDPOINTS STATUS');
    console.log('-'.repeat(40));
    
    await testAdminEndpoints();
    
    // Summary
    console.log('\n5. FIXES SUMMARY');
    console.log('-'.repeat(40));
    
    generateFixesSummary();
    
  } catch (error) {
    console.error('Verification failed:', error.message);
  }
}

async function testCheckoutSystem() {
  const checkoutTests = [];
  
  // Test checkout endpoints
  const endpoints = [
    '/api/checkout',
    '/api/checkout/create',
    '/api/checkout/validate',
    '/api/checkout/payment',
    '/api/checkout/shipping/options'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint, 'GET');
      checkoutTests.push({
        endpoint,
        status: response.success ? 'WORKING' : 'NOT FOUND',
        error: response.error
      });
    } catch (error) {
      checkoutTests.push({
        endpoint,
        status: 'ERROR',
        error: error.message
      });
    }
  }
  
  console.log('Checkout Endpoints:');
  checkoutTests.forEach(test => {
    const icon = test.status === 'WORKING' ? '  ' : '  ';
    console.log(`${icon} ${test.endpoint}: ${test.status}`);
    if (test.error) {
      console.log(`     Error: ${test.error}`);
    }
  });
  
  // Test checkout with authentication
  console.log('\nTesting checkout with authentication...');
  
  // Login as test user
  const loginData = JSON.stringify({
    email: 'test.buyer@ojawa.test',
    password: 'Buyer@123456'
  });
  
  const loginResponse = await makeRequest('/auth/login', 'POST', loginData);
  
  if (loginResponse.success) {
    console.log('User authenticated for checkout test');
    const token = loginResponse.data.token;
    
    // Test checkout validation
    const validateData = JSON.stringify({
      items: [{
        productId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
        quantity: 1,
        price: 180
      }],
      shippingAddress: {
        street: '123 Test Street',
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        postalCode: '100001'
      },
      paymentMethod: 'escrow'
    });
    
    const validateResponse = await makeRequest('/api/checkout/validate', 'POST', validateData, token);
    console.log(`Checkout validation: ${validateResponse.success ? 'WORKING' : 'FAILED'}`);
    
    if (validateResponse.success) {
      // Test checkout creation
      const createData = JSON.stringify({
        items: [{
          productId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
          quantity: 1,
          price: 180
        }],
        shippingAddress: {
          street: '123 Test Street',
          city: 'Lagos',
          state: 'Lagos State',
          country: 'Nigeria',
          postalCode: '100001'
        },
        paymentMethod: 'escrow'
      });
      
      const createResponse = await makeRequest('/api/checkout/create', 'POST', createData, token);
      console.log(`Checkout creation: ${createResponse.success ? 'WORKING' : 'FAILED'}`);
      
      if (createResponse.success) {
        console.log(`Order ID: ${createResponse.data.orderId}`);
      }
    }
  } else {
    console.log('Login failed for checkout test');
  }
}

async function testAdminAccount() {
  console.log('Testing admin accounts...');
  
  const adminAccounts = [
    { email: 'admin@ojawa.africa', password: 'Admin@123456!' },
    { email: 'admin@ojawa.com', password: 'Admin123!' }
  ];
  
  for (const admin of adminAccounts) {
    try {
      const loginData = JSON.stringify(admin);
      const response = await makeRequest('/auth/login', 'POST', loginData);
      
      console.log(`${admin.email}: ${response.success ? 'WORKING' : 'FAILED'}`);
      
      if (response.success) {
        console.log(`  Token: ${response.data.token.substring(0, 30)}...`);
        console.log(`  Role: ${response.data.role}`);
      } else {
        console.log(`  Error: ${response.error}`);
      }
    } catch (error) {
      console.log(`${admin.email}: ERROR - ${error.message}`);
    }
  }
}

async function testCartTokenValidation() {
  console.log('Testing cart token validation...');
  
  // Create fresh user
  const timestamp = Date.now();
  const newUserEmail = `carttest${timestamp}@ojawa.test`;
  const newUserPassword = 'CartTest@123';
  
  // Register user
  const registerData = JSON.stringify({
    email: newUserEmail,
    password: newUserPassword,
    displayName: 'Cart Test User'
  });
  
  const registerResponse = await makeRequest('/auth/register', 'POST', registerData);
  
  if (registerResponse.success) {
    console.log('New user registered');
    
    // Login user
    const loginData = JSON.stringify({
      email: newUserEmail,
      password: newUserPassword
    });
    
    const loginResponse = await makeRequest('/auth/login', 'POST', loginData);
    
    if (loginResponse.success) {
      console.log('User logged in');
      const token = loginResponse.data.token;
      
      // Test cart operations
      const cartTests = [
        { method: 'GET', endpoint: '/api/cart', desc: 'Get cart' },
        { method: 'POST', endpoint: '/api/cart/add', data: { productId: '4aqQlfFlNWXRBgGugyPVtV4YEn53', quantity: 1 }, desc: 'Add to cart' }
      ];
      
      for (const test of cartTests) {
        try {
          const data = test.data ? JSON.stringify(test.data) : null;
          const response = await makeRequest(test.endpoint, test.method, data, token);
          
          console.log(`${test.desc}: ${response.success ? 'WORKING' : 'FAILED'}`);
          
          if (!response.success) {
            console.log(`  Error: ${response.error}`);
          }
        } catch (error) {
          console.log(`${test.desc}: ERROR - ${error.message}`);
        }
      }
    } else {
      console.log('Login failed:', loginResponse.error);
    }
  } else {
    console.log('Registration failed:', registerResponse.error);
  }
}

async function testAdminEndpoints() {
  console.log('Testing admin endpoints...');
  
  // Try to get admin token
  const adminLoginData = JSON.stringify({
    email: 'admin@ojawa.com',
    password: 'Admin123!'
  });
  
  const adminLoginResponse = await makeRequest('/auth/login', 'POST', adminLoginData);
  
  if (adminLoginResponse.success) {
    const adminToken = adminLoginResponse.data.token;
    console.log('Admin authenticated');
    
    const adminEndpoints = [
      '/api/admin',
      '/api/admin/users',
      '/api/admin/products',
      '/api/admin/orders',
      '/api/admin/dashboard',
      '/api/admin/analytics'
    ];
    
    for (const endpoint of adminEndpoints) {
      try {
        const response = await makeRequest(endpoint, 'GET', null, adminToken);
        console.log(`${endpoint}: ${response.success ? 'WORKING' : 'NOT FOUND'}`);
        
        if (!response.success && response.error) {
          console.log(`  Error: ${response.error}`);
        }
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error.message}`);
      }
    }
  } else {
    console.log('Admin login failed');
  }
}

function generateFixesSummary() {
  console.log('FIXES STATUS SUMMARY:');
  console.log('=' .repeat(60));
  
  const fixes = [
    {
      name: 'Checkout System',
      status: 'NOT IMPLEMENTED',
      priority: 'HIGH',
      impact: 'CRITICAL'
    },
    {
      name: 'Admin Account Access',
      status: 'PARTIAL',
      priority: 'HIGH',
      impact: 'HIGH'
    },
    {
      name: 'Cart Token Validation',
      status: 'BROKEN',
      priority: 'MEDIUM',
      impact: 'HIGH'
    },
    {
      name: 'Admin Endpoints',
      status: 'NOT IMPLEMENTED',
      priority: 'MEDIUM',
      impact: 'MEDIUM'
    }
  ];
  
  fixes.forEach(fix => {
    const statusIcon = fix.status === 'WORKING' ? ' ' : 
                     fix.status === 'PARTIAL' ? ' ' : 
                     fix.status === 'BROKEN' ? ' ' : ' ';
    
    console.log(`${statusIcon} ${fix.name}`);
    console.log(`   Status: ${fix.status}`);
    console.log(`   Priority: ${fix.priority}`);
    console.log(`   Impact: ${fix.impact}`);
    console.log('');
  });
  
  console.log('OVERALL STATUS:');
  console.log('-'.repeat(40));
  console.log('Checkout System: Still needs implementation');
  console.log('Admin Account: Working with admin@ojawa.com');
  console.log('Cart Tokens: Still having validation issues');
  console.log('Admin Endpoints: Not implemented');
  
  console.log('\nRECOMMENDATION:');
  console.log('1. Implement checkout API routes in backend');
  console.log('2. Fix cart token validation middleware');
  console.log('3. Implement admin API endpoints');
  console.log('4. Update admin@ojawa.africa credentials');
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

verifyFixesStatus();
