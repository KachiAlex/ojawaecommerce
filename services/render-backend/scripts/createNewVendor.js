// Create New Vendor Account with Different Email
const fetch = require('node-fetch');

const API_BASE = 'https://ojawaecommerce.onrender.com';

const newVendorData = {
  email: 'kitchenstore@ojawa.com',
  password: 'KitchenStore123!',
  displayName: 'Kitchen Store Pro',
  role: 'vendor'
};

async function createNewVendor() {
  try {
    console.log('🏪 Creating New Vendor Account...\n');
    
    // Step 1: Try to register
    console.log('1️⃣ Attempting vendor registration...');
    
    try {
      const registerResponse = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newVendorData)
      });
      
      const registerResult = await registerResponse.json();
      
      if (registerResponse.ok) {
        console.log('✅ Vendor registration successful!');
        console.log('📋 Registration Response:', JSON.stringify(registerResult, null, 2));
        
        // Step 2: Try to login
        console.log('\n2️⃣ Attempting vendor login...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: newVendorData.email,
            password: newVendorData.password
          })
        });
        
        const loginResult = await loginResponse.json();
        
        if (loginResponse.ok) {
          console.log('✅ Vendor login successful!');
          console.log('🔑 Authentication Token:', loginResult.token);
          console.log('👤 User Info:', JSON.stringify(loginResult.user, null, 2));
          
          return {
            success: true,
            token: loginResult.token,
            user: loginResult.user
          };
        } else {
          console.log('❌ Login failed:', loginResult);
          return { success: false, error: 'Login failed' };
        }
        
      } else {
        console.log('❌ Registration failed:', registerResult);
        return { success: false, error: registerResult.error };
      }
      
    } catch (error) {
      console.log('❌ Request error:', error.message);
      return { success: false, error: error.message };
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
    return { success: false, error: error.message };
  }
}

// Main execution
async function main() {
  const vendorResult = await createNewVendor();
  
  if (vendorResult.success && vendorResult.token) {
    console.log('\n🎉 New Vendor account ready!');
    console.log('📧 Email:', newVendorData.email);
    console.log('🔑 Password:', newVendorData.password);
    console.log('🏪 Store Name:', newVendorData.displayName);
    
    console.log('\n🔗 Access Links:');
    console.log('🌐 Frontend Login: https://ojawa.africa/login');
    console.log('🏪 Vendor Dashboard: https://ojawa.africa/vendor');
    console.log('📦 Products: https://ojawa.africa/products');
    
  } else {
    console.log('\n❌ Vendor creation failed. Please check the error above.');
  }
}

if (require.main === module) {
  main().then(() => {
    console.log('\n✅ Script completed!');
  });
}

module.exports = { createNewVendor };
