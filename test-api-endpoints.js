const https = require('https');

async function testAPIEndpoints() {
  try {
    console.log('🔍 Testing API endpoints...');
    
    // Test 1: Login
    console.log('\n1️⃣ Testing login endpoint...');
    const loginData = JSON.stringify({
      email: 'vendor.mock@ojawa.test',
      password: 'Vendor@12345'
    });
    
    const loginResponse = await makeRequest('/auth/login', 'POST', loginData);
    console.log('Login response:', loginResponse);
    
    if (loginResponse.success && loginResponse.data.token) {
      const token = loginResponse.data.token;
      
      // Test 2: Get user profile
      console.log('\n2️⃣ Testing user profile endpoint...');
      const profileResponse = await makeRequest('/api/users/profile', 'GET', null, token);
      console.log('Profile response:', profileResponse);
      
      // Test 3: Create product
      console.log('\n3️⃣ Testing product creation endpoint...');
      const productData = JSON.stringify({
        name: 'Test Product',
        description: 'Test product description',
        price: 99.99,
        category: 'Electronics',
        stockQuantity: 10,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500']
      });
      
      const productResponse = await makeRequest('/api/products', 'POST', productData, token);
      console.log('Product creation response:', productResponse);
      
      // Test 4: List products
      console.log('\n4️⃣ Testing products list endpoint...');
      const listResponse = await makeRequest('/api/products', 'GET', null, token);
      console.log('Products list response:', listResponse);
      
      if (listResponse.products && listResponse.products.length > 0) {
        console.log(`✅ Found ${listResponse.products.length} products`);
        listResponse.products.forEach((product, index) => {
          console.log(`${index + 1}. ${product.name} - Vendor: ${product.vendorName || 'Not assigned'} - Email: ${product.vendorEmail || 'Not assigned'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
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
          console.error('Parse error for', path, ':', parseError.message);
          console.error('Raw response:', responseData);
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error for', path, ':', error.message);
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

testAPIEndpoints();
