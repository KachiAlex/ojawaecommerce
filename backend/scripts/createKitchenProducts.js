// Simple Mock Vendor Product Upload
const fetch = require('node-fetch');

const API_BASE = 'https://ojawaecommerce.onrender.com';

// Kitchen products for mock vendor
const kitchenProducts = [
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
    name: 'Breville Smart Oven Air Fryer',
    description: 'Convection oven with air fry function. 13 smart cooking presets for perfect results.',
    price: 299.99,
    category: 'home',
    brand: 'Breville',
    stockQuantity: 35,
    features: ['Air Fry Function', '13 Smart Presets', 'Large Capacity'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Cuisinart Food Processor',
    description: '14-cup food processor with stainless steel blades. Perfect for chopping, slicing, and shredding.',
    price: 249.99,
    category: 'home',
    brand: 'Cuisinart',
    stockQuantity: 40,
    features: ['14-Cup Capacity', 'Stainless Steel Blades', 'Multiple Discs'],
    images: ['https://images.unsplash.com/photo-1558901366-9b1234567891?w=400']
  },
  {
    name: 'KitchenAid Electric Kettle',
    description: 'Stainless steel electric kettle with 1.7L capacity. Fast boiling with dual water windows.',
    price: 79.99,
    category: 'home',
    brand: 'KitchenAid',
    stockQuantity: 50,
    features: ['1.7L Capacity', 'Fast Boiling', 'Dual Water Windows'],
    images: ['https://images.unsplash.com/photo-1558901366-9b1234567893?w=400']
  }
];

async function createMockVendorProducts() {
  console.log('🏪 Creating Kitchen Gadgets Pro Products...\n');
  
  try {
    // First, let's try to create products without vendor authentication
    // to see if we can assign them later
    
    console.log('📦 Attempting to create kitchen products...');
    let successCount = 0;
    
    for (let i = 0; i < kitchenProducts.length; i++) {
      const product = kitchenProducts[i];
      
      try {
        const response = await fetch(`${API_BASE}/api/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
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
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 Results: ${successCount}/${kitchenProducts.length} products created`);
    
    // Check current products
    console.log('\n🔍 Checking current products...');
    const productsResponse = await fetch(`${API_BASE}/api/products?limit=20`);
    const productsResult = await productsResponse.json();
    
    if (productsResponse.ok && productsResult.success) {
      const products = productsResult.data.products;
      console.log(`✅ Total products in database: ${products.length}`);
      
      // Show kitchen products
      const kitchenItems = products.filter(p => 
        p.name.toLowerCase().includes('kitchen') || 
        p.name.toLowerCase().includes('blender') ||
        p.name.toLowerCase().includes('mixer') ||
        p.name.toLowerCase().includes('kettle') ||
        p.name.toLowerCase().includes('pot') ||
        p.name.toLowerCase().includes('dyson') ||
        p.name.toLowerCase().includes('nespresso') ||
        p.name.toLowerCase().includes('breville') ||
        p.name.toLowerCase().includes('cuisinart') ||
        p.name.toLowerCase().includes('vitamix')
      );
      
      if (kitchenItems.length > 0) {
        console.log(`\n🍳 Kitchen Products Found: ${kitchenItems.length}`);
        kitchenItems.forEach((product, index) => {
          console.log(`${index + 1}. ${product.name} - $${product.price}`);
          if (product.vendorId) {
            console.log(`   Vendor ID: ${product.vendorId}`);
          }
        });
      }
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Create vendor account: kitchengadgets@ojawa.com');
    console.log('2. Login to get authentication token');
    console.log('3. Update products with vendorId');
    console.log('4. Verify vendor ownership on frontend');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  createMockVendorProducts().then(() => {
    console.log('\n✅ Script completed!');
  });
}

module.exports = { createMockVendorProducts, kitchenProducts };
