// Mock Vendor Creation using API Endpoints
const fetch = require('node-fetch');

const API_BASE = 'https://ojawaecommerce.onrender.com';

// Mock Vendor Data
const mockVendor = {
  email: 'kitchengadgets@ojawa.com',
  password: 'Vendor123456!',
  displayName: 'Kitchen Gadgets Pro',
  businessName: 'Kitchen Gadgets Pro Store',
  storeName: 'Kitchen Gadgets Pro',
  description: 'Premium kitchen appliances and gadgets for modern homes. We specialize in high-quality, innovative kitchen solutions.',
  location: {
    address: '123 Kitchen Street, Victoria Island',
    city: 'Lagos',
    state: 'Lagos State',
    country: 'Nigeria',
    postalCode: '101241'
  },
  contact: {
    phone: '+2348012345678',
    whatsapp: '+2348012345678',
    email: 'support@kitchengadgets.com'
  },
  role: 'vendor'
};

// Kitchen-focused products for this vendor
const vendorProducts = [
  {
    name: 'KitchenAid Stand Mixer',
    description: 'Professional-grade stand mixer with 5-quart stainless steel bowl. Perfect for baking enthusiasts.',
    price: 329.99,
    category: 'home',
    brand: 'KitchenAid',
    stockQuantity: 30,
    features: ['5-Quart Capacity', '10 Speeds', 'Dishwasher Safe Bowl'],
    images: ['https://images.unsplash.com/photo-1585515656519-7d2e1d7b1f3e?w=400'],
    tags: ['kitchen', 'baking', 'professional']
  },
  {
    name: 'Dyson V15 Detect Absolute',
    description: 'Advanced cordless vacuum with laser dust detection and intelligent suction.',
    price: 749.99,
    category: 'home',
    brand: 'Dyson',
    stockQuantity: 60,
    features: ['Laser Dust Detection', '60-minute Runtime', 'HEPA Filtration'],
    images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
    tags: ['vacuum', 'cordless', 'cleaning']
  },
  {
    name: 'Instant Pot Duo 7-in-1',
    description: 'Multi-cooker that pressure cooks, slow cooks, rice cooks, steams, and more.',
    price: 79.99,
    category: 'home',
    brand: 'Instant Pot',
    stockQuantity: 120,
    features: ['7-in-1 Functionality', '14 Smart Programs', 'Stainless Steel Inner Pot'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'],
    tags: ['multi-cooker', 'pressure-cooker', 'kitchen']
  },
  {
    name: 'Vitamix 5200 Blender',
    description: 'Professional-grade blender with powerful motor and aircraft-grade stainless steel blades.',
    price: 449.99,
    category: 'home',
    brand: 'Vitamix',
    stockQuantity: 25,
    features: ['2 HP Motor', 'Variable Speed Control', '64-oz Container'],
    images: ['https://images.unsplash.com/photo-1578936710445-4d5d8f5c6c5c?w=400'],
    tags: ['blender', 'professional', 'smoothie']
  },
  {
    name: 'Nespresso Vertuo Plus',
    description: 'Premium coffee machine with Centrifusion extraction technology for perfect coffee and espresso.',
    price: 199.99,
    category: 'home',
    brand: 'Nespresso',
    stockQuantity: 45,
    features: ['Centrifusion Technology', 'One-touch Brewing', 'Adjustable Cup Size'],
    images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400'],
    tags: ['coffee', 'espresso', 'machine']
  },
  {
    name: 'Breville Smart Oven Air Fryer',
    description: 'Convection oven with air fry function. 13 smart cooking presets for perfect results.',
    price: 299.99,
    category: 'home',
    brand: 'Breville',
    stockQuantity: 35,
    features: ['Air Fry Function', '13 Smart Presets', 'Large Capacity'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'],
    tags: ['oven', 'air-fryer', 'convection']
  },
  {
    name: 'Cuisinart Food Processor',
    description: '14-cup food processor with stainless steel blades. Perfect for chopping, slicing, and shredding.',
    price: 249.99,
    category: 'home',
    brand: 'Cuisinart',
    stockQuantity: 40,
    features: ['14-Cup Capacity', 'Stainless Steel Blades', 'Multiple Discs'],
    images: ['https://images.unsplash.com/photo-1558901366-9b1234567891?w=400'],
    tags: ['food-processor', 'chopping', 'kitchen']
  },
  {
    name: 'KitchenAid Electric Kettle',
    description: 'Stainless steel electric kettle with 1.7L capacity. Fast boiling with dual water windows.',
    price: 79.99,
    category: 'home',
    brand: 'KitchenAid',
    stockQuantity: 50,
    features: ['1.7L Capacity', 'Fast Boiling', 'Dual Water Windows'],
    images: ['https://images.unsplash.com/photo-1558901366-9b1234567893?w=400'],
    tags: ['kettle', 'electric', 'boiling']
  }
];

async function createMockVendorAndProducts() {
  try {
    console.log('🏪 Creating Mock Vendor and Products...\n');
    
    let vendorToken = null;
    let vendorUser = null;
    
    // Step 1: Register the vendor
    console.log('1️⃣ Registering vendor account...');
    try {
      const registerResponse = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mockVendor.email,
          password: mockVendor.password,
          displayName: mockVendor.displayName,
          role: 'vendor'
        })
      });
      
      if (registerResponse.ok) {
        const registerResult = await registerResponse.json();
        vendorUser = registerResult.data;
        console.log('✅ Vendor registered successfully');
      } else if (registerResponse.status === 400) {
        console.log('ℹ️ Vendor already exists, proceeding to login...');
      } else {
        const error = await registerResponse.json();
        console.log('❌ Registration failed:', error);
        return;
      }
    } catch (error) {
      console.log('❌ Registration error:', error.message);
      return;
    }
    
    // Step 2: Login the vendor
    console.log('\n2️⃣ Logging in vendor...');
    try {
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mockVendor.email,
          password: mockVendor.password
        })
      });
      
      if (loginResponse.ok) {
        const loginResult = await loginResponse.json();
        vendorToken = loginResult.token;
        vendorUser = loginResult.user;
        console.log('✅ Vendor logged in successfully');
      } else {
        const error = await loginResponse.json();
        console.log('❌ Login failed:', error);
        return;
      }
    } catch (error) {
      console.log('❌ Login error:', error.message);
      return;
    }
    
    // Step 3: Upload products for the vendor
    console.log('\n3️⃣ Creating vendor products...');
    let createdProducts = 0;
    
    for (let i = 0; i < vendorProducts.length; i++) {
      const product = vendorProducts[i];
      
      try {
        const productResponse = await fetch(`${API_BASE}/api/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${vendorToken}`
          },
          body: JSON.stringify(product)
        });
        
        if (productResponse.ok) {
          const productResult = await productResponse.json();
          console.log(`✅ Created product ${i + 1}: ${product.name}`);
          createdProducts++;
        } else {
          const error = await productResponse.json();
          console.log(`❌ Failed to create product ${i + 1}:`, error.error || error.message);
        }
      } catch (error) {
        console.log(`❌ Error creating product ${i + 1}:`, error.message);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 4: Verify products were created
    console.log('\n4️⃣ Verifying products...');
    try {
      const productsResponse = await fetch(`${API_BASE}/api/products?limit=20`);
      const productsResult = await productsResponse.json();
      
      if (productsResponse.ok && productsResult.success) {
        const allProducts = productsResult.data.products;
        const vendorProducts = allProducts.filter(p => p.vendorId === vendorUser.uid);
        
        console.log(`✅ Total products in database: ${allProducts.length}`);
        console.log(`✅ Products for this vendor: ${vendorProducts.length}`);
        
        if (vendorProducts.length > 0) {
          console.log('\n📦 Vendor Products:');
          vendorProducts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} - $${product.price}`);
          });
        }
      }
    } catch (error) {
      console.log('❌ Error verifying products:', error.message);
    }
    
    // Summary
    console.log('\n🎉 Mock Vendor Creation Summary:');
    console.log('\n👤 Vendor Details:');
    console.log(`📧 Email: ${mockVendor.email}`);
    console.log(`🔑 Password: ${mockVendor.password}`);
    console.log(`🏪 Store: ${mockVendor.storeName}`);
    console.log(`📍 Location: ${mockVendor.location.city}, ${mockVendor.location.state}`);
    console.log(`📱 Phone: ${mockVendor.contact.phone}`);
    console.log(`✅ Status: Active & Verified`);
    
    console.log('\n📦 Products Created:');
    console.log(`✅ Successfully created: ${createdProducts}/${vendorProducts.length} products`);
    
    console.log('\n🔗 Login Information:');
    console.log(`🌐 Frontend: https://ojawa.africa/login`);
    console.log(`📧 Email: ${mockVendor.email}`);
    console.log(`🔑 Password: ${mockVendor.password}`);
    
    console.log('\n🛍️ Store Access:');
    console.log(`🏪 Vendor Dashboard: https://ojawa.africa/vendor`);
    console.log(`📱 Products Page: https://ojawa.africa/products`);
    
    console.log('\n🎯 All products are now assigned to Kitchen Gadgets Pro!');
    
  } catch (error) {
    console.error('❌ Error in mock vendor creation:', error);
  }
}

// Run the script
if (require.main === module) {
  createMockVendorAndProducts().then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { createMockVendorAndProducts, mockVendor, vendorProducts };
