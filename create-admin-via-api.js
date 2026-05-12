const https = require('https');

async function createAdminViaAPI() {
  try {
    console.log('Creating admin account via Render API...');
    
    // Step 1: Register admin account
    const registerData = JSON.stringify({
      email: 'admin@ojawa.africa',
      password: 'Admin@123456!',
      displayName: 'Ojawa Africa Admin',
      role: 'admin'
    });
    
    const registerOptions = {
      hostname: 'ojawaecommerce.onrender.com',
      port: 443,
      path: '/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(registerData)
      }
    };
    
    const registerReq = https.request(registerOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('Registration response:', response);
          
          if (response.success) {
            console.log('Admin account created successfully!');
            console.log('Email: admin@ojawa.africa');
            console.log('Password: Admin@123456!');
            
            // Test login immediately
            testAdminLogin();
          } else {
            console.log('Registration failed, trying login anyway...');
            testAdminLogin();
          }
        } catch (parseError) {
          console.error('Failed to parse registration response:', parseError.message);
          console.log('Raw response:', data);
        }
      });
    });
    
    registerReq.on('error', (error) => {
      console.error('Registration request failed:', error.message);
    });
    
    registerReq.write(registerData);
    registerReq.end();
    
  } catch (error) {
    console.error('Setup failed:', error.message);
  }
}

function testAdminLogin() {
  console.log('\nTesting admin login...');
  
  const loginData = JSON.stringify({
    email: 'admin@ojawa.africa',
    password: 'Admin@123456!'
  });
  
  const loginOptions = {
    hostname: 'ojawaecommerce.onrender.com',
    port: 443,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };
  
  const loginReq = https.request(loginOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Login response:', response);
        
        if (response.success) {
          console.log('Admin login successful!');
          console.log('Token:', response.data.token.substring(0, 50) + '...');
          console.log('Role:', response.data.role);
          console.log('UID:', response.data.uid);
          
          console.log('\nAdmin account is ready for use!');
          console.log('Login URL: https://ojawa-ecommerce.web.app/admin/login');
        } else {
          console.log('Login failed:', response.error);
        }
      } catch (parseError) {
        console.error('Failed to parse login response:', parseError.message);
        console.log('Raw response:', data);
      }
    });
  });
  
  loginReq.on('error', (error) => {
    console.error('Login request failed:', error.message);
  });
  
  loginReq.write(loginData);
  loginReq.end();
}

createAdminViaAPI();
