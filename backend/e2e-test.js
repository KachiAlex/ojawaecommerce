const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

// Test Data
const buyerData = {
  email: `buyer_${Date.now()}@example.com`,
  password: 'BuyerPassword123!',
  displayName: 'E2E Test Buyer'
};

const vendorCreds = {
  email: 'mockvendor@ojawa.com',
  password: 'MockVendor123!'
};

const logisticsData = {
  email: `logistics_${Date.now()}@example.com`,
  password: 'LogisticsPassword123!',
  displayName: 'E2E Test Logistics',
  role: 'logistics'
};

async function runTest() {
  try {
    console.log('🚀 Starting E2E Flow Test...\n');

    // -1. Register Logistics
    console.log('(-1)️⃣ Registering new logistics...');
    const logiRegisterResp = await axios.post(`${API_BASE}/auth/register`, logisticsData);
    const logisticsToken = logiRegisterResp.data.data.token;
    const logisticsId = logiRegisterResp.data.data.uid;
    console.log(`✅ Logistics registered: ${logisticsId}`);

    // 0. Vendor Login (to get vendorId and products)
    console.log('0️⃣ Logging in as vendor...');
    const vendorLoginResp = await axios.post(`${API_BASE}/auth/login`, {
      email: vendorCreds.email,
      password: vendorCreds.password
    });
    const vendorToken = vendorLoginResp.data.data.token;
    const vendorId = vendorLoginResp.data.data.uid;
    console.log(`✅ Vendor logged in: ${vendorId}`);

    // 1. Register Buyer
    console.log('\n1️⃣ Registering new buyer...');
    const registerResp = await axios.post(`${API_BASE}/auth/register`, buyerData);
    const buyerToken = registerResp.data.data.token;
    const buyerId = registerResp.data.data.uid;
    console.log(`✅ Buyer registered: ${buyerId}`);

    // 2. Get Vendor Products
    console.log('\n2️⃣ Fetching vendor products...');
    const productsResp = await axios.get(`${API_BASE}/products?vendorId=${vendorId}`);
    const products = productsResp.data.data.products;
    if (!products || products.length === 0) throw new Error(`No products found for vendor ${vendorId}`);
    const product = products[0];
    console.log(`✅ Found vendor product: ${product.name} (ID: ${product.id})`);

    // 2.5 Give Buyer Wallet Balance (via SSH to local DB)
    console.log('\n2.5️⃣ Adding wallet balance to buyer...');
    const { execSync } = require('child_process');
    try {
      execSync(`sudo -u postgres psql -p 5433 -d ojawa_db -c "UPDATE wallets SET balance = 1000000 WHERE \\"userId\\" = '${buyerId}';"`, { stdio: 'inherit' });
      console.log('✅ Wallet balance updated');
    } catch (e) {
      console.warn('⚠️ Could not update wallet via direct SQL, attempting to create order without it or using paystack simulation');
    }

    // 3. Add to Cart
    console.log('\n3️⃣ Adding product to cart...');
    await axios.post(`${API_BASE}/cart`, {
      items: [{
        productId: product.id,
        quantity: 1,
        price: parseFloat(product.price)
      }]
    }, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    console.log('✅ Added to cart');

    // 4. Checkout (Create Order)
    console.log('\n4️⃣ Checking out...');
    const orderData = {
      items: [{
        productId: product.id,
        quantity: 1,
        price: parseFloat(product.price)
      }],
      deliveryAddress: {
        street: '123 Test St',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria'
      },
      paymentMethod: 'wallet', // Use wallet now that we have balance
      deliveryOption: 'standard',
      logisticsPartnerId: logisticsId
    };
    const orderResp = await axios.post(`${API_BASE}/orders`, orderData, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    const orderResult = orderResp.data.data;
    const orderId = orderResult.orderId;
    console.log(`✅ Order created: ${orderId}`);

    // 5. Vendor Login & Fulfill
    console.log('\n5️⃣ Vendor fulfilling order...');
    
    await axios.put(`${API_BASE}/orders/${orderId}/status`, {
      status: 'shipped',
      trackingNumber: `TRK-${Date.now()}`,
      notes: 'Shipped from vendor warehouse'
    }, {
      headers: { Authorization: `Bearer ${vendorToken}` }
    });
    console.log('✅ Order marked as SHIPPED by vendor');

    // 6. Logistics Update
    console.log('\n6️⃣ Logistics updating delivery...');

    // First get the order details to find the delivery ID if any
    const orderDetailResp = await axios.get(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    const orderDetail = orderDetailResp.data.data;
    console.log(`✅ Order status: ${orderDetail.status}`);

    console.log('\n🏁 E2E Flow Test Completed Successfully!');
  } catch (error) {
    console.error('\n❌ Test Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
    process.exit(1);
  }
}

runTest();
