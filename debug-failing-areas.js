const https = require('https');

async function debugFailingAreas() {
  try {
    console.log('DEBUGGING FAILING AREAS: Checkout & Admin Flow');
    console.log('=' .repeat(60));
    
    // Part 1: Deep Dive into Checkout System
    console.log('\n1. CHECKOUT SYSTEM DEEP DIVE');
    console.log('-'.repeat(40));
    
    await debugCheckoutSystem();
    
    // Part 2: Deep Dive into Admin System
    console.log('\n2. ADMIN SYSTEM DEEP DIVE');
    console.log('-'.repeat(40));
    
    await debugAdminSystem();
    
    // Part 3: Test Complete User Flow
    console.log('\n3. COMPLETE USER FLOW TEST');
    console.log('-'.repeat(40));
    
    await testCompleteUserFlow();
    
  } catch (error) {
    console.error('Debug failed:', error.message);
  }
}

async function debugCheckoutSystem() {
  console.log('Testing checkout endpoints and flow...');
  
  // Test 1: Get available checkout endpoints
  try {
    console.log('\n1.1 Testing checkout endpoint availability...');
    const response = await makeRequest('/api/checkout', 'GET');
    console.log('Checkout GET response:', response);
  } catch (error) {
    console.log('Checkout GET error:', error.message);
  }
  
  // Test 2: Try checkout with authentication
  try {
    console.log('\n1.2 Testing checkout with authentication...');
    
    // First login as test user
    const loginData = JSON.stringify({
      email: 'test.buyer@ojawa.test',
      password: 'Buyer@123456'
    });
    
    const loginResponse = await makeRequest('/auth/login', 'POST', loginData);
    
    if (loginResponse.success) {
      console.log('User authenticated for checkout test');
      const token = loginResponse.data.token;
      
      // Test checkout creation
      const checkoutData = JSON.stringify({
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
      
      const checkoutResponse = await makeRequest('/api/checkout/create', 'POST', checkoutData, token);
      console.log('Checkout response:', checkoutResponse);
      
      if (checkoutResponse.success) {
        console.log('Checkout successful!');
        console.log('Order ID:', checkoutResponse.data.orderId);
      } else {
        console.log('Checkout failed:', checkoutResponse.error);
        console.log('Full response:', checkoutResponse);
      }
      
    } else {
      console.log('Login failed for checkout test:', loginResponse.error);
    }
    
  } catch (error) {
    console.log('Checkout auth test error:', error.message);
  }
  
  // Test 3: Check alternative checkout endpoints
  try {
    console.log('\n1.3 Testing alternative checkout endpoints...');
    
    const endpoints = [
      '/api/checkout',
      '/api/checkout/create',
      '/api/order/create',
      '/api/orders/create',
      '/api/purchase/create'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await makeRequest(endpoint, 'GET');
        console.log(`${endpoint}:`, response.success ? 'EXISTS' : response.error);
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log('Alternative endpoints test error:', error.message);
  }
}

async function debugAdminSystem() {
  console.log('Testing admin system...');
  
  // Test 1: Admin login attempts
  try {
    console.log('\n2.1 Testing admin login...');
    
    const adminCredentials = [
      { email: 'admin@ojawa.africa', password: 'Admin@123456!' },
      { email: 'admin@ojawa.com', password: 'Admin123!' },
      { email: 'admin@ojawa.test', password: 'Admin@123456!' }
    ];
    
    for (const creds of adminCredentials) {
      console.log(`Trying: ${creds.email}`);
      
      const loginData = JSON.stringify(creds);
      const response = await makeRequest('/auth/login', 'POST', loginData);
      
      if (response.success) {
        console.log('SUCCESS: Admin login works with', creds.email);
        console.log('Token:', response.data.token.substring(0, 50) + '...');
        
        // Test admin endpoints with this token
        await testAdminEndpoints(response.data.token);
        return;
      } else {
        console.log('FAILED:', response.error);
      }
    }
    
  } catch (error) {
    console.log('Admin login test error:', error.message);
  }
  
  // Test 2: Check admin endpoint availability
  try {
    console.log('\n2.2 Testing admin endpoint availability...');
    
    const adminEndpoints = [
      '/api/admin',
      '/api/admin/users',
      '/api/admin/products',
      '/api/admin/orders',
      '/api/admin/analytics',
      '/api/admin/dashboard',
      '/admin',
      '/admin/login',
      '/admin/dashboard'
    ];
    
    for (const endpoint of adminEndpoints) {
      try {
        const response = await makeRequest(endpoint, 'GET');
        console.log(`${endpoint}:`, response.success ? 'EXISTS' : response.error);
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log('Admin endpoints test error:', error.message);
  }
}

async function testAdminEndpoints(token) {
  console.log('\n2.3 Testing admin endpoints with token...');
  
  const endpoints = [
    '/api/admin',
    '/api/admin/users',
    '/api/admin/products',
    '/api/admin/orders',
    '/api/admin/analytics'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint, 'GET', null, token);
      console.log(`${endpoint}:`, response.success ? 'WORKING' : response.error);
    } catch (error) {
      console.log(`${endpoint}: ERROR - ${error.message}`);
    }
  }
}

async function testCompleteUserFlow() {
  console.log('Testing complete user flow from registration to order...');
  
  try {
    // Step 1: Register new user
    console.log('\n3.1 Registering new user...');
    const timestamp = Date.now();
    const registerData = JSON.stringify({
      email: `flowtest${timestamp}@ojawa.test`,
      password: 'FlowTest@123',
      displayName: 'Flow Test User'
    });
    
    const registerResponse = await makeRequest('/auth/register', 'POST', registerData);
    
    if (registerResponse.success) {
      console.log('User registered successfully');
      
      // Step 2: Login
      console.log('\n3.2 Logging in...');
      const loginData = JSON.stringify({
        email: `flowtest${timestamp}@ojawa.test`,
        password: 'FlowTest@123'
      });
      
      const loginResponse = await makeRequest('/auth/login', 'POST', loginData);
      
      if (loginResponse.success) {
        console.log('User logged in successfully');
        const token = loginResponse.data.token;
        
        // Step 3: Get cart
        console.log('\n3.3 Getting cart...');
        const cartResponse = await makeRequest('/api/cart', 'GET', null, token);
        
        if (cartResponse.success) {
          console.log('Cart retrieved:', cartResponse.data);
          
          // Step 4: Add product to cart
          console.log('\n3.4 Adding product to cart...');
          const addToCartData = JSON.stringify({
            productId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
            quantity: 1
          });
          
          const addResponse = await makeRequest('/api/cart/add', 'POST', addToCartData, token);
          
          if (addResponse.success) {
            console.log('Product added to cart');
            
            // Step 5: Get updated cart
            console.log('\n3.5 Getting updated cart...');
            const updatedCartResponse = await makeRequest('/api/cart', 'GET', null, token);
            
            if (updatedCartResponse.success) {
              console.log('Updated cart:', updatedCartResponse.data);
              
              // Step 6: Checkout
              console.log('\n3.6 Attempting checkout...');
              const checkoutData = JSON.stringify({
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
              
              const checkoutResponse = await makeRequest('/api/checkout/create', 'POST', checkoutData, token);
              
              if (checkoutResponse.success) {
                console.log('CHECKOUT SUCCESSFUL!');
                console.log('Order created:', checkoutResponse.data);
              } else {
                console.log('CHECKOUT FAILED:', checkoutResponse.error);
                console.log('Full response:', checkoutResponse);
              }
            }
          } else {
            console.log('Add to cart failed:', addResponse.error);
          }
        } else {
          console.log('Get cart failed:', cartResponse.error);
        }
      } else {
        console.log('Login failed:', loginResponse.error);
      }
    } else {
      console.log('Registration failed:', registerResponse.error);
    }
    
  } catch (error) {
    console.log('Complete flow test error:', error.message);
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
          console.error('Parse error:', parseError.message);
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

debugFailingAreas();
