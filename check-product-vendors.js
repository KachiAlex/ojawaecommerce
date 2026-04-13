const https = require('https');

async function checkProductVendors() {
  try {
    console.log('🔍 Checking current product vendor assignments...');
    
    // Login as vendor to get token
    const loginData = JSON.stringify({
      email: 'vendor.mock@ojawa.test',
      password: 'Vendor@12345'
    });
    
    const loginResponse = await makeRequest('/auth/login', 'POST', loginData);
    
    if (!loginResponse.success) {
      console.log('❌ Login failed:', loginResponse.error);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Get products with vendor details
    const productsResponse = await makeRequest('/api/products', 'GET', null, token);
    
    if (productsResponse.success && productsResponse.data.products) {
      const products = productsResponse.data.products;
      
      console.log(`\n📦 Found ${products.length} products:`);
      
      const vendorAssignments = {};
      
      products.forEach((product, index) => {
        const vendorName = product.vendorName || 'Unassigned';
        const vendorEmail = product.vendorEmail || 'No email';
        const vendorId = product.vendorId || 'No ID';
        
        if (!vendorAssignments[vendorName]) {
          vendorAssignments[vendorName] = {
            email: vendorEmail,
            id: vendorId,
            count: 0,
            products: []
          };
        }
        
        vendorAssignments[vendorName].count++;
        vendorAssignments[vendorName].products.push(product.name);
        
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   📧 Vendor: ${vendorName}`);
        console.log(`   📧 Email: ${vendorEmail}`);
        console.log(`   🆔 ID: ${vendorId}`);
        console.log(`   💰 Price: $${product.price}`);
        console.log('');
      });
      
      console.log('\n📋 Vendor Assignment Summary:');
      Object.entries(vendorAssignments).forEach(([vendorName, info]) => {
        console.log(`\n🏪 ${vendorName}:`);
        console.log(`   📧 Email: ${info.email}`);
        console.log(`   🆔 ID: ${info.id}`);
        console.log(`   📦 Products: ${info.count}`);
        console.log(`   📝 Items: ${info.products.join(', ')}`);
      });
      
      // Check if mock vendor has products
      const mockVendorProducts = vendorAssignments['Ojawa Mock Vendor'] || 
                            vendorAssignments['Mock Vendor'] ||
                            vendorAssignments['vendor.mock@ojawa.test'] ||
                            { count: 0 };
      
      if (mockVendorProducts.count === 0) {
        console.log('\n❌ ISSUE: Mock vendor has NO products assigned!');
        console.log('🔧 Need to assign products to mock vendor');
      } else {
        console.log(`\n✅ Mock vendor has ${mockVendorProducts.count} products assigned`);
      }
      
    } else {
      console.log('❌ Failed to get products:', productsResponse.error);
    }
    
  } catch (error) {
    console.error('❌ Error checking products:', error.message);
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

checkProductVendors();
