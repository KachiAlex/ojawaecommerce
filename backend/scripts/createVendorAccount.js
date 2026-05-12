// Create Vendor Account Script
const fetch = require('node-fetch');

const API_BASE = 'https://ojawaecommerce.onrender.com';

const vendorData = {
  email: 'kitchengadgets@ojawa.com',
  password: 'Vendor123456!',
  displayName: 'Kitchen Gadgets Pro',
  role: 'vendor'
};

async function createVendorAccount() {
  try {
    console.log('🏪 Creating Kitchen Gadgets Pro Vendor Account...\n');
    
    // Step 1: Try to register
    console.log('1️⃣ Attempting vendor registration...');
    let registerResponse;
    
    try {
      registerResponse = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vendorData)
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
            email: vendorData.email,
            password: vendorData.password
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
        
        // If registration failed because user exists, try login
        if (registerResponse.status === 400 && registerResult.error && registerResult.error.includes('already exists')) {
          console.log('ℹ️ Vendor already exists, attempting login...');
          
          const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: vendorData.email,
              password: vendorData.password
            })
          });
          
          const loginResult = await loginResponse.json();
          
          if (loginResponse.ok) {
            console.log('✅ Existing vendor login successful!');
            console.log('🔑 Authentication Token:', loginResult.token);
            console.log('👤 User Info:', JSON.stringify(loginResult.user, null, 2));
            
            return {
              success: true,
              token: loginResult.token,
              user: loginResult.user
            };
          } else {
            console.log('❌ Login to existing account failed:', loginResult);
            return { success: false, error: 'Login failed' };
          }
        }
        
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

async function uploadProducts(token) {
  console.log('\n📦 Uploading Kitchen Products...\n');
  
  const products = [
    {
      name: 'KitchenAid Stand Mixer',
      description: 'Professional-grade stand mixer with 5-quart stainless steel bowl. Perfect for baking enthusiasts.',
      price: 329.99,
      category: 'home',
      brand: 'KitchenAid',
      stockQuantity: 30,
      features: ['5-Quart Capacity', '10 Speeds', 'Dishwasher Safe Bowl'],
      images: ['https://images.unsplash.com/photo-1585515656519-7d2e1d7b1f3e?w=400']
    },
    {
      name: 'Dyson V15 Detect Absolute',
      description: 'Advanced cordless vacuum with laser dust detection and intelligent suction.',
      price: 749.99,
      category: 'home',
      brand: 'Dyson',
      stockQuantity: 60,
      features: ['Laser Dust Detection', '60-minute Runtime', 'HEPA Filtration'],
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400']
    },
    {
      name: 'Instant Pot Duo 7-in-1',
      description: 'Multi-cooker that pressure cooks, slow cooks, rice cooks, steams, and more.',
      price: 79.99,
      category: 'home',
      brand: 'Instant Pot',
      stockQuantity: 120,
      features: ['7-in-1 Functionality', '14 Smart Programs', 'Stainless Steel Inner Pot'],
      images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
    }
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    
    try {
      const response = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(product)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Created product ${i + 1}: ${product.name}`);
        successCount++;
      } else {
        console.log(`❌ Failed product ${i + 1}: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Error product ${i + 1}: ${error.message}`);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 Products uploaded: ${successCount}/${products.length}`);
}

// Main execution
async function main() {
  const vendorResult = await createVendorAccount();
  
  if (vendorResult.success && vendorResult.token) {
    console.log('\n🎉 Vendor account ready!');
    console.log('📧 Email:', vendorData.email);
    console.log('🔑 Password:', vendorData.password);
    console.log('🏪 Store Name:', vendorData.displayName);
    
    // Upload some products
    await uploadProducts(vendorResult.token);
    
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

module.exports = { createVendorAccount, uploadProducts };
