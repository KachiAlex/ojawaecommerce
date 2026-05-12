const https = require('https');

async function testCartToOrderFlow() {
  try {
    console.log('🛒 Testing Cart to Order Flow...');
    
    // Step 1: Login as buyer (using mock vendor for testing)
    console.log('\n1️⃣ Logging in as test user...');
    const loginData = JSON.stringify({
      email: 'vendor.mock@ojawa.test',
      password: 'Vendor@12345'
    });
    
    const loginResponse = await makeRequest('/auth/login', 'POST', loginData);
    
    if (!loginResponse.success) {
      console.log('❌ Login failed:', loginResponse.error);
      return;
    }
    
    const buyerToken = loginResponse.data.token;
    console.log('✅ Buyer login successful');
    
    // Step 2: Get cart items
    console.log('\n2️⃣ Getting cart items...');
    const cartResponse = await makeRequest('/api/cart', 'GET', null, buyerToken);
    
    if (!cartResponse.success) {
      console.log('❌ Failed to get cart:', cartResponse.error);
      return;
    }
    
    const cartItems = cartResponse.data?.items || [];
    console.log(`✅ Found ${cartItems.length} items in cart`);
    
    if (cartItems.length === 0) {
      console.log('❌ Cart is empty - adding a test item...');
      
      // Add a test product to cart
      const addToCartData = JSON.stringify({
        productId: '4aqQlfFlNWXRBgGugyPVtV4YEn53', // Mock vendor ID
        quantity: 1
      });
      
      const addResponse = await makeRequest('/api/cart/add', 'POST', addToCartData, buyerToken);
      
      if (addResponse.success) {
        console.log('✅ Added test item to cart');
        
        // Get updated cart
        const updatedCartResponse = await makeRequest('/api/cart', 'GET', null, buyerToken);
        if (updatedCartResponse.success) {
          cartItems.push(...(updatedCartResponse.data?.items || []));
        }
      }
    }
    
    // Display cart items with vendor info
    console.log('\n📦 Cart Items:');
    cartItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name || item.productName}`);
      console.log(`   💰 Price: $${item.price}`);
      console.log(`   📊 Quantity: ${item.quantity}`);
      console.log(`   🏪 Vendor: ${item.vendorName || 'Unknown'}`);
      console.log(`   📧 Vendor Email: ${item.vendorEmail || 'Not assigned'}`);
      console.log(`   🆔 Vendor ID: ${item.vendorId || 'Not assigned'}`);
      console.log('');
    });
    
    // Step 3: Test checkout process
    console.log('\n3️⃣ Testing checkout process...');
    
    const checkoutData = JSON.stringify({
      items: cartItems.map(item => ({
        productId: item.productId || item.id,
        quantity: item.quantity,
        price: item.price
      })),
      shippingAddress: {
        street: '123 Test Street',
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        postalCode: '100001'
      },
      paymentMethod: 'escrow',
      deliveryOption: 'standard'
    });
    
    const checkoutResponse = await makeRequest('/api/checkout/create', 'POST', checkoutData, buyerToken);
    
    if (checkoutResponse.success) {
      console.log('✅ Checkout successful!');
      console.log('📋 Order details:', checkoutResponse.data);
      
      // Step 4: Test order confirmation
      if (checkoutResponse.data?.orderId) {
        console.log('\n4️⃣ Testing order confirmation...');
        
        const orderResponse = await makeRequest(`/api/orders/${checkoutResponse.data.orderId}`, 'GET', null, buyerToken);
        
        if (orderResponse.success) {
          console.log('✅ Order retrieved successfully!');
          console.log('📊 Order status:', orderResponse.data.status);
          console.log('💰 Total amount:', orderResponse.data.totalAmount);
          console.log('🏪 Vendor address:', orderResponse.data.vendorAddress || 'Not specified');
        } else {
          console.log('❌ Failed to retrieve order:', orderResponse.error);
        }
      }
    } else {
      console.log('❌ Checkout failed:', checkoutResponse.error);
      console.log('📄 Full response:', checkoutResponse);
    }
    
    // Step 5: Test vendor address in cart context
    console.log('\n5️⃣ Testing vendor address in cart flow...');
    
    if (cartItems.length > 0) {
      const firstItem = cartItems[0];
      const vendorId = firstItem.vendorId;
      
      if (vendorId) {
        console.log(`🔍 Testing vendor info for ID: ${vendorId}`);
        
        const vendorResponse = await makeRequest(`/api/users/${vendorId}`, 'GET', null, buyerToken);
        
        if (vendorResponse.success) {
          const vendor = vendorResponse.data.user;
          console.log('✅ Vendor info retrieved:');
          console.log(`   📛 Name: ${vendor.displayName || vendor.name}`);
          console.log(`   📧 Email: ${vendor.email}`);
          console.log(`   📍 Address: ${vendor.address || vendor.vendorProfile?.businessAddress || 'Not specified'}`);
          console.log(`   📞 Phone: ${vendor.vendorProfile?.businessPhone || vendor.phone || 'Not specified'}`);
        } else {
          console.log('❌ Failed to get vendor info:', vendorResponse.error);
        }
      }
    }
    
    console.log('\n🎉 Cart to Order Flow Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
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

testCartToOrderFlow();
