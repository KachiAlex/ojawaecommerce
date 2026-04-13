const https = require('https');

async function createTestBuyer() {
  try {
    console.log('Creating test buyer account...');
    
    // Create buyer account
    const registerData = JSON.stringify({
      email: 'test.buyer@ojawa.test',
      password: 'Buyer@123456',
      displayName: 'Test Buyer'
    });
    
    const registerResponse = await makeRequest('/auth/register', 'POST', registerData);
    console.log('Registration response:', registerResponse);
    
    // Login as buyer
    console.log('\nLogging in as test buyer...');
    const loginData = JSON.stringify({
      email: 'test.buyer@ojawa.test',
      password: 'Buyer@123456'
    });
    
    const loginResponse = await makeRequest('/auth/login', 'POST', loginData);
    
    if (loginResponse.success) {
      console.log('Buyer login successful!');
      const buyerToken = loginResponse.data.token;
      
      // Test cart operations
      console.log('\nTesting cart operations...');
      
      // Get cart
      const cartResponse = await makeRequest('/api/cart', 'GET', null, buyerToken);
      console.log('Cart response:', cartResponse);
      
      // Add item to cart
      if (cartResponse.success) {
        console.log('\nAdding item to cart...');
        const addToCartData = JSON.stringify({
          productId: '4aqQlfFlNWXRBgGugyPVtV4YEn53', // Use vendor ID as product ID for testing
          quantity: 1
        });
        
        const addResponse = await makeRequest('/api/cart/add', 'POST', addToCartData, buyerToken);
        console.log('Add to cart response:', addResponse);
        
        if (addResponse.success) {
          console.log('\nGetting updated cart...');
          const updatedCartResponse = await makeRequest('/api/cart', 'GET', null, buyerToken);
          
          if (updatedCartResponse.success) {
            console.log('Updated cart:', updatedCartResponse.data);
            
            // Test checkout
            console.log('\nTesting checkout...');
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
            
            const checkoutResponse = await makeRequest('/api/checkout/create', 'POST', checkoutData, buyerToken);
            console.log('Checkout response:', checkoutResponse);
          }
        }
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

createTestBuyer();
