const https = require('https');

async function simpleCartTest() {
  try {
    console.log('Simple Cart Functionality Test...');
    
    // Test 1: Get products to see vendor assignments
    console.log('\n1. Testing product listing...');
    const productsResponse = await makeRequest('/api/products', 'GET');
    
    if (productsResponse.success) {
      const products = productsResponse.data.products.slice(0, 3);
      console.log(`Found ${productsResponse.data.products.length} total products`);
      
      console.log('\nFirst 3 products with vendor info:');
      products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   Price: $${product.price}`);
        console.log(`   Vendor: ${product.vendorName || 'Unassigned'}`);
        console.log(`   Vendor Email: ${product.vendorEmail || 'No email'}`);
        console.log(`   Vendor ID: ${product.vendorId || 'No ID'}`);
        console.log('');
      });
      
      // Test 2: Try to add a product to cart (without auth first)
      console.log('\n2. Testing cart add without authentication...');
      const addToCartData = JSON.stringify({
        productId: products[0].id,
        quantity: 1
      });
      
      const addResponse = await makeRequest('/api/cart/add', 'POST', addToCartData);
      console.log('Add to cart response:', addResponse);
      
      // Test 3: Check if vendor address is accessible
      console.log('\n3. Testing vendor address access...');
      const vendorId = products[0].vendorId;
      
      if (vendorId) {
        console.log(`Testing vendor info for ID: ${vendorId}`);
        
        const vendorResponse = await makeRequest(`/api/users/${vendorId}`, 'GET');
        console.log('Vendor info response:', vendorResponse);
        
        if (vendorResponse.success) {
          const vendor = vendorResponse.data.user;
          console.log('Vendor details:');
          console.log(`  Name: ${vendor.displayName || 'Not set'}`);
          console.log(`  Email: ${vendor.email}`);
          console.log(`  Address: ${vendor.address || vendor.vendorProfile?.businessAddress || 'Not set'}`);
          console.log(`  Phone: ${vendor.vendorProfile?.businessPhone || vendor.phone || 'Not set'}`);
        }
      }
      
      // Test 4: Test cart endpoint availability
      console.log('\n4. Testing cart endpoint availability...');
      const cartResponse = await makeRequest('/api/cart', 'GET');
      console.log('Cart endpoint response:', cartResponse);
      
    } else {
      console.log('Failed to get products:', productsResponse.error);
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

simpleCartTest();
