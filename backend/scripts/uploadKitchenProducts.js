// Working Kitchen Products Upload Script
const fetch = require('node-fetch');

const API_BASE = 'https://ojawaecommerce.onrender.com';

// 20 essential kitchen products (reduced for testing)
const kitchenProducts = [
  {
    name: 'Ninja Foodi 9-in-1 Pressure Cooker',
    description: 'Multi-cooker with 9 functions including pressure cook, air fry, and steam.',
    price: 149.99,
    category: 'home',
    brand: 'Ninja',
    stockQuantity: 45,
    features: ['9-in-1 Functionality', 'TenderCrisp Technology', '6.5-qt Capacity'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Breville Barista Express Espresso Machine',
    description: 'Integrated grinder and espresso machine for perfect coffee at home.',
    price: 599.99,
    category: 'home',
    brand: 'Breville',
    stockQuantity: 20,
    features: ['Built-in Grinder', 'Precise Temp Control', 'Steam Wand'],
    images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400']
  },
  {
    name: 'Cuisinart 14-Cup Food Processor',
    description: 'Powerful food processor with multiple attachments for all food prep needs.',
    price: 199.99,
    category: 'home',
    brand: 'Cuisinart',
    stockQuantity: 35,
    features: ['14-Cup Capacity', 'Stainless Steel Blades', 'Multiple Discs'],
    images: ['https://images.unsplash.com/photo-1558901366-9b1234567891?w=400']
  },
  {
    name: 'KitchenAid Artisan Mini Stand Mixer',
    description: 'Compact 3.5-quart stand mixer with same power as full-size models.',
    price: 279.99,
    category: 'home',
    brand: 'KitchenAid',
    stockQuantity: 40,
    features: ['3.5-qt Bowl', '10 Speeds', '67 Point Planetary Mixing'],
    images: ['https://images.unsplash.com/photo-1585515656519-7d2e1d7b1f3e?w=400']
  },
  {
    name: 'Le Creuset Signature Dutch Oven',
    description: 'Enamel cast iron Dutch oven for perfect slow cooking and baking.',
    price: 329.99,
    category: 'home',
    brand: 'Le Creuset',
    stockQuantity: 25,
    features: ['5.5-qt Capacity', 'Enameled Cast Iron', 'Oven Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'All-Clad D3 Stainless Steel Cookware Set',
    description: '10-piece professional cookware set with tri-ply construction.',
    price: 799.99,
    category: 'home',
    brand: 'All-Clad',
    stockQuantity: 15,
    features: ['Tri-Ply Construction', 'Stainless Steel', 'Oven Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Wusthof Classic Ikon Chef Knife Set',
    description: '7-piece German forged knife set with precision cutting.',
    price: 499.99,
    category: 'home',
    brand: 'Wusthof',
    stockQuantity: 20,
    features: ['German Steel', 'Forged Construction', 'Full Tang'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Chemex Classic Coffee Maker',
    description: 'Elegant pour-over coffee maker for pure, clean coffee flavor.',
    price: 44.99,
    category: 'home',
    brand: 'Chemex',
    stockQuantity: 45,
    features: ['Glass Construction', 'Wood Collar', '6-8 Cup Capacity'],
    images: ['https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400']
  },
  {
    name: 'AeroPress Coffee Maker',
    description: 'Portable coffee maker for smooth, rich coffee anywhere.',
    price: 34.99,
    category: 'home',
    brand: 'AeroPress',
    stockQuantity: 80,
    features: ['Portable Design', 'Fast Brewing', 'Smooth Coffee'],
    images: ['https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400']
  },
  {
    name: 'OXO Good Grips Pop Containers',
    description: '10-piece airtight food storage container set with pop-up lids.',
    price: 89.99,
    category: 'home',
    brand: 'OXO',
    stockQuantity: 60,
    features: ['10 Pieces', 'Airtight Seal', 'Pop-up Lids'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Bella Air Fryer',
    description: 'Compact air fryer with rapid air technology for healthy cooking.',
    price: 69.99,
    category: 'home',
    brand: 'Bella',
    stockQuantity: 55,
    features: ['Rapid Air Technology', '2.6-qt Capacity', 'Temperature Control'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Hamilton Beach Slow Cooker',
    description: '6-quart slow cooker with programmable settings and keep warm function.',
    price: 49.99,
    category: 'home',
    brand: 'Hamilton Beach',
    stockQuantity: 70,
    features: ['6-qt Capacity', 'Programmable', 'Keep Warm'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Vitamix 5200 Blender',
    description: 'Professional-grade blender with powerful motor and aircraft-grade stainless steel blades.',
    price: 449.99,
    category: 'home',
    brand: 'Vitamix',
    stockQuantity: 25,
    features: ['2 HP Motor', 'Variable Speed Control', '64-oz Container'],
    images: ['https://images.unsplash.com/photo-1578936710445-4d5d8f5c6c5c?w=400']
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
  },
  {
    name: 'Nespresso Vertuo Plus',
    description: 'Premium coffee machine with Centrifusion extraction technology for perfect coffee and espresso.',
    price: 199.99,
    category: 'home',
    brand: 'Nespresso',
    stockQuantity: 45,
    features: ['Centrifusion Technology', 'One-touch Brewing', 'Adjustable Cup Size'],
    images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400']
  },
  {
    name: 'Breville Tea Maker with Variable Temperature',
    description: 'Electric kettle with 5 temperature settings for different tea types.',
    price: 149.99,
    category: 'home',
    brand: 'Breville',
    stockQuantity: 35,
    features: ['5 Temp Settings', 'Keep Warm Function', 'Water Window'],
    images: ['https://images.unsplash.com/photo-1558901366-9b1234567893?w=400']
  },
  {
    name: 'DeLonghi Dedica Pump Espresso Maker',
    description: 'Compact espresso machine with thermoblock heating system.',
    price: 199.99,
    category: 'home',
    brand: 'DeLonghi',
    stockQuantity: 50,
    features: ['15-bar Pump', 'Thermoblock System', 'Manual Cappuccino System'],
    images: ['https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400']
  },
  {
    name: 'Staub Cast Iron Grill Pan',
    description: 'Heavy-duty grill pan with enamel coating for perfect grilling marks.',
    price: 149.99,
    category: 'home',
    brand: 'Staub',
    stockQuantity: 30,
    features: ['Cast Iron', 'Enamel Coating', 'Even Heat Distribution'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Calphalon Nonstick Frying Pan Set',
    description: '3-piece nonstick frying pan set with durable PFOA-free coating.',
    price: 89.99,
    category: 'home',
    brand: 'Calphalon',
    stockQuantity: 60,
    features: ['Nonstick Coating', 'PFOA-Free', 'Oven Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'GreenPan Ceramic Non-Stick Skillet',
    description: 'Eco-friendly ceramic non-stick skillet with toxin-free coating.',
    price: 79.99,
    category: 'home',
    brand: 'GreenPan',
    stockQuantity: 45,
    features: ['Ceramic Coating', 'Toxin-Free', 'Oven Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  }
];

async function createVendorAndUploadProducts() {
  console.log('🏪 Creating Kitchen Store Vendor and Uploading Products...\n');
  
  let vendorToken = null;
  let vendorUser = null;
  
  // Step 1: Try to create/login vendor
  console.log('1️⃣ Creating vendor account...');
  try {
    // Try to register first
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'kitchenstore@ojawa.com',
        password: 'KitchenStore123!',
        displayName: 'Kitchen Store Pro',
        role: 'vendor'
      })
    });
    
    const registerResult = await registerResponse.json();
    
    if (registerResponse.ok) {
      console.log('✅ Vendor registered successfully!');
      vendorUser = registerResult.data;
    } else if (registerResponse.status === 400) {
      console.log('ℹ️ Vendor already exists, trying login...');
      
      // Try login
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'kitchenstore@ojawa.com',
          password: 'KitchenStore123!'
        })
      });
      
      const loginResult = await loginResponse.json();
      
      if (loginResponse.ok) {
        console.log('✅ Vendor login successful!');
        vendorToken = loginResult.token;
        vendorUser = loginResult.user;
      } else {
        console.log('❌ Login failed:', loginResult);
        return;
      }
    } else {
      console.log('❌ Registration failed:', registerResult);
      return;
    }
  } catch (error) {
    console.log('❌ Vendor creation error:', error.message);
    return;
  }
  
  // Step 2: Upload products
  console.log('\n2️⃣ Uploading kitchen products...');
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < kitchenProducts.length; i++) {
    const product = kitchenProducts[i];
    
    try {
      const response = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vendorToken}`
        },
        body: JSON.stringify(product)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${i + 1}/20: ${product.name} - $${product.price}`);
        successCount++;
      } else {
        console.log(`❌ ${i + 1}/20: ${product.name} - ${result.error || 'Unknown error'}`);
        errorCount++;
      }
    } catch (error) {
      console.log(`❌ ${i + 1}/20: ${product.name} - ${error.message}`);
      errorCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Step 3: Verify results
  console.log('\n3️⃣ Verifying products...');
  try {
    const productsResponse = await fetch(`${API_BASE}/api/products?limit=100`);
    const productsResult = await productsResponse.json();
    
    if (productsResponse.ok && productsResult.success) {
      const allProducts = productsResult.data.products;
      const kitchenProducts = allProducts.filter(p => 
        p.category === 'home' && (
          p.name.toLowerCase().includes('kitchen') ||
          p.name.toLowerCase().includes('coffee') ||
          p.name.toLowerCase().includes('blender') ||
          p.name.toLowerCase().includes('mixer') ||
          p.name.toLowerCase().includes('pot') ||
          p.name.toLowerCase().includes('ninja') ||
          p.name.toLowerCase().includes('breville') ||
          p.name.toLowerCase().includes('cuisinart') ||
          p.name.toLowerCase().includes('le creuset') ||
          p.name.toLowerCase().includes('wusthof') ||
          p.name.toLowerCase().includes('chemex') ||
          p.name.toLowerCase().includes('aeropress') ||
          p.name.toLowerCase().includes('oxo') ||
          p.name.toLowerCase().includes('bella') ||
          p.name.toLowerCase().includes('hamilton') ||
          p.name.toLowerCase().includes('vitamix') ||
          p.name.toLowerCase().includes('nespresso') ||
          p.name.toLowerCase().includes('delonghi') ||
          p.name.toLowerCase().includes('staub') ||
          p.name.toLowerCase().includes('calphalon') ||
          p.name.toLowerCase().includes('greenpan')
        )
      );
      
      console.log(`✅ Total products in database: ${allProducts.length}`);
      console.log(`✅ Kitchen products found: ${kitchenProducts.length}`);
      
      if (kitchenProducts.length > 0) {
        console.log('\n📦 Kitchen Products:');
        kitchenProducts.forEach((product, index) => {
          console.log(`${index + 1}. ${product.name} - $${product.price}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ Error verifying products:', error.message);
  }
  
  // Summary
  console.log('\n📊 Upload Results:');
  console.log(`✅ Successfully uploaded: ${successCount}/20 products`);
  console.log(`❌ Failed uploads: ${errorCount}/20 products`);
  
  console.log('\n🎉 Kitchen Store Pro setup complete!');
  console.log('\n🔗 Access Links:');
  console.log('🌐 Products Page: https://ojawa.africa/products');
  console.log('🏪 Vendor Login: https://ojawa.africa/login');
  console.log('📧 Vendor Email: kitchenstore@ojawa.com');
  console.log('🔑 Password: KitchenStore123!');
}

// Run the script
if (require.main === module) {
  createVendorAndUploadProducts().then(() => {
    console.log('\n✅ Script completed!');
  });
}

module.exports = { createVendorAndUploadProducts, kitchenProducts };
