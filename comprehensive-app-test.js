const https = require('https');

async function comprehensiveAppTest() {
  try {
    console.log('🚀 COMPREHENSIVE APP FUNCTIONALITY TEST');
    console.log('=' .repeat(60));
    
    const testResults = {
      authentication: { passed: 0, failed: 0, details: [] },
      products: { passed: 0, failed: 0, details: [] },
      vendors: { passed: 0, failed: 0, details: [] },
      cart: { passed: 0, failed: 0, details: [] },
      checkout: { passed: 0, failed: 0, details: [] },
      orders: { passed: 0, failed: 0, details: [] },
      admin: { passed: 0, failed: 0, details: [] },
      logistics: { passed: 0, failed: 0, details: [] }
    };
    
    // Test 1: Authentication System
    console.log('\n🔐 1. AUTHENTICATION SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    await testAuthentication(testResults);
    
    // Test 2: Product Management
    console.log('\n📦 2. PRODUCT MANAGEMENT TESTS');
    console.log('-'.repeat(40));
    
    await testProducts(testResults);
    
    // Test 3: Vendor System
    console.log('\n🏪 3. VENDOR SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    await testVendors(testResults);
    
    // Test 4: Cart System
    console.log('\n🛒 4. CART SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    await testCart(testResults);
    
    // Test 5: Checkout System
    console.log('\n💳 5. CHECKOUT SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    await testCheckout(testResults);
    
    // Test 6: Order Management
    console.log('\n📋 6. ORDER MANAGEMENT TESTS');
    console.log('-'.repeat(40));
    
    await testOrders(testResults);
    
    // Test 7: Admin System
    console.log('\n👤 7. ADMIN SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    await testAdmin(testResults);
    
    // Test 8: Logistics System
    console.log('\n🚚 8. LOGISTICS SYSTEM TESTS');
    console.log('-'.repeat(40));
    
    await testLogistics(testResults);
    
    // Generate Final Report
    console.log('\n📊 COMPREHENSIVE TEST RESULTS');
    console.log('=' .repeat(60));
    
    generateFinalReport(testResults);
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.message);
  }
}

async function testAuthentication(results) {
  const auth = results.authentication;
  
  // Test 1.1: Buyer Registration
  try {
    const registerData = JSON.stringify({
      email: 'test.user@ojawa.test',
      password: 'TestUser@123',
      displayName: 'Test User'
    });
    
    const response = await makeRequest('/auth/register', 'POST', registerData);
    
    if (response.success) {
      auth.passed++;
      auth.details.push('✅ Buyer registration works');
    } else {
      auth.failed++;
      auth.details.push(`❌ Buyer registration failed: ${response.error}`);
    }
  } catch (error) {
    auth.failed++;
    auth.details.push(`❌ Buyer registration error: ${error.message}`);
  }
  
  // Test 1.2: User Login
  try {
    const loginData = JSON.stringify({
      email: 'test.user@ojawa.test',
      password: 'TestUser@123'
    });
    
    const response = await makeRequest('/auth/login', 'POST', loginData);
    
    if (response.success) {
      auth.passed++;
      auth.details.push('✅ User login works');
      return response.data.token; // Return token for other tests
    } else {
      auth.failed++;
      auth.details.push(`❌ User login failed: ${response.error}`);
      return null;
    }
  } catch (error) {
    auth.failed++;
    auth.details.push(`❌ User login error: ${error.message}`);
    return null;
  }
}

async function testProducts(results) {
  const products = results.products;
  
  // Test 2.1: Get All Products
  try {
    const response = await makeRequest('/api/products', 'GET');
    
    if (response.success && response.data.products.length > 0) {
      products.passed++;
      products.details.push(`✅ Products listing works (${response.data.products.length} products)`);
    } else {
      products.failed++;
      products.details.push(`❌ Products listing failed: ${response.error}`);
    }
  } catch (error) {
    products.failed++;
    products.details.push(`❌ Products listing error: ${error.message}`);
  }
  
  // Test 2.2: Get Single Product
  try {
    const response = await makeRequest('/api/products/4aqQlfFlNWXRBgGugyPVtV4YEn53', 'GET');
    
    if (response.success) {
      products.passed++;
      products.details.push('✅ Single product retrieval works');
    } else {
      products.failed++;
      products.details.push(`❌ Single product retrieval failed: ${response.error}`);
    }
  } catch (error) {
    products.failed++;
    products.details.push(`❌ Single product retrieval error: ${error.message}`);
  }
  
  // Test 2.3: Product Search
  try {
    const response = await makeRequest('/api/products?search=adidas', 'GET');
    
    if (response.success) {
      products.passed++;
      products.details.push('✅ Product search works');
    } else {
      products.failed++;
      products.details.push(`❌ Product search failed: ${response.error}`);
    }
  } catch (error) {
    products.failed++;
    products.details.push(`❌ Product search error: ${error.message}`);
  }
}

async function testVendors(results) {
  const vendors = results.vendors;
  
  // Test 3.1: Mock Vendor Login
  try {
    const loginData = JSON.stringify({
      email: 'vendor.mock@ojawa.test',
      password: 'Vendor@12345'
    });
    
    const response = await makeRequest('/auth/login', 'POST', loginData);
    
    if (response.success) {
      vendors.passed++;
      vendors.details.push('✅ Mock vendor login works');
      return response.data.token;
    } else {
      vendors.failed++;
      vendors.details.push(`❌ Mock vendor login failed: ${response.error}`);
      return null;
    }
  } catch (error) {
    vendors.failed++;
    vendors.details.push(`❌ Mock vendor login error: ${error.message}`);
    return null;
  }
}

async function testCart(results) {
  const cart = results.cart;
  
  // Test 4.1: Get Cart (without auth)
  try {
    const response = await makeRequest('/api/cart', 'GET');
    
    if (response.error && response.error.includes('Access token required')) {
      cart.passed++;
      cart.details.push('✅ Cart properly requires authentication');
    } else {
      cart.failed++;
      cart.details.push('❌ Cart authentication check failed');
    }
  } catch (error) {
    cart.failed++;
    cart.details.push(`❌ Cart auth test error: ${error.message}`);
  }
  
  // Test 4.2: Add to Cart (without auth)
  try {
    const addToCartData = JSON.stringify({
      productId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
      quantity: 1
    });
    
    const response = await makeRequest('/api/cart/add', 'POST', addToCartData);
    
    if (response.error && response.error.includes('Access token required')) {
      cart.passed++;
      cart.details.push('✅ Add to cart properly requires authentication');
    } else {
      cart.failed++;
      cart.details.push('❌ Add to cart authentication check failed');
    }
  } catch (error) {
    cart.failed++;
    cart.details.push(`❌ Add to cart auth test error: ${error.message}`);
  }
}

async function testCheckout(results) {
  const checkout = results.checkout;
  
  // Test 5.1: Checkout Endpoint Availability
  try {
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
        country: 'Nigeria'
      }
    });
    
    const response = await makeRequest('/api/checkout/create', 'POST', checkoutData);
    
    if (response.error && response.error.includes('Access token required')) {
      checkout.passed++;
      checkout.details.push('✅ Checkout properly requires authentication');
    } else {
      checkout.failed++;
      checkout.details.push('❌ Checkout authentication check failed');
    }
  } catch (error) {
    checkout.failed++;
    checkout.details.push(`❌ Checkout auth test error: ${error.message}`);
  }
}

async function testOrders(results) {
  const orders = results.orders;
  
  // Test 6.1: Orders Endpoint (without auth)
  try {
    const response = await makeRequest('/api/orders', 'GET');
    
    if (response.error && response.error.includes('Access token required')) {
      orders.passed++;
      orders.details.push('✅ Orders properly requires authentication');
    } else {
      orders.failed++;
      orders.details.push('❌ Orders authentication check failed');
    }
  } catch (error) {
    orders.failed++;
    orders.details.push(`❌ Orders auth test error: ${error.message}`);
  }
}

async function testAdmin(results) {
  const admin = results.admin;
  
  // Test 7.1: Admin Login
  try {
    const loginData = JSON.stringify({
      email: 'admin@ojawa.africa',
      password: 'Admin@123456!'
    });
    
    const response = await makeRequest('/auth/login', 'POST', loginData);
    
    if (response.success) {
      admin.passed++;
      admin.details.push('✅ Admin login works');
    } else {
      admin.failed++;
      admin.details.push(`❌ Admin login failed: ${response.error}`);
    }
  } catch (error) {
    admin.failed++;
    admin.details.push(`❌ Admin login error: ${error.message}`);
  }
}

async function testLogistics(results) {
  const logistics = results.logistics;
  
  // Test 8.1: Logistics Login
  try {
    const loginData = JSON.stringify({
      email: 'logistics.mock@ojawa.test',
      password: 'Logistics@12345'
    });
    
    const response = await makeRequest('/auth/login', 'POST', loginData);
    
    if (response.success) {
      logistics.passed++;
      logistics.details.push('✅ Logistics login works');
    } else {
      logistics.failed++;
      logistics.details.push(`❌ Logistics login failed: ${response.error}`);
    }
  } catch (error) {
    logistics.failed++;
    logistics.details.push(`❌ Logistics login error: ${error.message}`);
  }
}

function generateFinalReport(results) {
  console.log('\n📈 MODULE PERFORMANCE SUMMARY');
  console.log('=' .repeat(60));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  Object.entries(results).forEach(([module, results]) => {
    const total = results.passed + results.failed;
    const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : '0.0';
    
    console.log(`\n${module.toUpperCase()}:`);
    console.log(`  Passed: ${results.passed}`);
    console.log(`  Failed: ${results.failed}`);
    console.log(`  Pass Rate: ${passRate}%`);
    
    results.details.forEach(detail => {
      console.log(`  ${detail}`);
    });
    
    totalPassed += results.passed;
    totalFailed += results.failed;
  });
  
  const overallTotal = totalPassed + totalFailed;
  const overallPassRate = overallTotal > 0 ? ((totalPassed / overallTotal) * 100).toFixed(1) : '0.0';
  
  console.log('\n🎯 OVERALL APP HEALTH');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${overallTotal}`);
  console.log(`Total Passed: ${totalPassed}`);
  console.log(`Total Failed: ${totalFailed}`);
  console.log(`Overall Pass Rate: ${overallPassRate}%`);
  
  console.log('\n🏆 APP STATUS ASSESSMENT');
  console.log('=' .repeat(60));
  
  if (parseFloat(overallPassRate) >= 80) {
    console.log('🟢 EXCELLENT: App is highly functional');
  } else if (parseFloat(overallPassRate) >= 60) {
    console.log('🟡 GOOD: App is mostly functional with some issues');
  } else if (parseFloat(overallPassRate) >= 40) {
    console.log('🟠 FAIR: App has significant issues');
  } else {
    console.log('🔴 POOR: App has major functionality problems');
  }
  
  console.log('\n📋 KEY FUNCTIONALITY STATUS:');
  console.log('-'.repeat(40));
  
  Object.entries(results).forEach(([module, results]) => {
    const status = results.failed === 0 ? '✅ WORKING' : 
                  results.passed > results.failed ? '⚠️ PARTIAL' : '❌ BROKEN';
    console.log(`${module.toUpperCase()}: ${status}`);
  });
  
  console.log('\n🔧 RECOMMENDATIONS:');
  console.log('-'.repeat(40));
  
  if (results.cart.failed > 0) {
    console.log('• Fix cart authentication and token handling');
  }
  
  if (results.checkout.failed > 0) {
    console.log('• Implement complete checkout flow');
  }
  
  if (results.orders.failed > 0) {
    console.log('• Develop order management system');
  }
  
  if (results.vendors.failed > 0) {
    console.log('• Complete vendor profile system');
  }
  
  if (results.admin.failed > 0) {
    console.log('• Fix admin authentication and permissions');
  }
  
  if (results.logistics.failed > 0) {
    console.log('• Implement logistics partner system');
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

comprehensiveAppTest();
