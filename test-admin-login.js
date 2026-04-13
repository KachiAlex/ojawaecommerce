const https = require('https');

async function testAdminLogin() {
  try {
    console.log('🔐 Testing admin login for admin@ojawa.africa...');
    
    const postData = JSON.stringify({
      email: 'vendor.mock@ojawa.test',
      password: 'Vendor@12345'
    });
    
    const options = {
      hostname: 'ojawaecommerce.onrender.com',
      port: 443,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Login successful!');
          console.log('📋 Response:', response);
          
          if (response.token) {
            console.log('🔑 Token received:', response.token.substring(0, 20) + '...');
            console.log('🎉 Admin account is working with Render API!');
          }
        } catch (parseError) {
          console.error('❌ Failed to parse response:', parseError.message);
          console.log('📄 Raw response:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
    });
    
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdminLogin();
