const https = require('https');

async function simpleProductCheck() {
  try {
    console.log('Quick product vendor check...');
    
    // Get products without auth (public endpoint)
    const productsResponse = await makeRequest('/api/products', 'GET');
    
    if (productsResponse.success && productsResponse.data.products) {
      const products = productsResponse.data.products.slice(0, 5); // Check first 5 products
      
      console.log(`\nChecking first ${products.length} products:`);
      
      let mockVendorFound = false;
      
      products.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   Vendor: ${product.vendorName || 'Unassigned'}`);
        console.log(`   Email: ${product.vendorEmail || 'No email'}`);
        console.log(`   ID: ${product.vendorId || 'No ID'}`);
        
        if (product.vendorEmail === 'vendor.mock@ojawa.test' || 
            product.vendorName === 'Ojawa Mock Vendor') {
          mockVendorFound = true;
        }
      });
      
      if (!mockVendorFound) {
        console.log('\nISSUE CONFIRMED: Products are NOT assigned to mock vendor!');
        console.log('This is why the cart shows "Address not specified"');
        console.log('\nSOLUTION: Need to reassign products to mock vendor');
      } else {
        console.log('\nMock vendor has products assigned');
      }
    }
    
  } catch (error) {
    console.error('Check failed:', error.message);
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

simpleProductCheck();
