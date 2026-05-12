// Seed Kitchen Products using the new /seed endpoint
const fetch = require('node-fetch');

const API_BASE = 'https://ojawaecommerce.onrender.com';

// 20 essential kitchen products
const kitchenProducts = [
  {
    name: 'Ninja Foodi 9-in-1 Pressure Cooker',
    description: 'Multi-cooker with 9 functions including pressure cook, air fry, and steam. Perfect for versatile cooking with TenderCrisp technology.',
    price: 149.99,
    category: 'home',
    brand: 'Ninja',
    stockQuantity: 45,
    features: ['9-in-1 Functionality', 'TenderCrisp Technology', '6.5-qt Capacity', '45 Recipes'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Breville Barista Express Espresso Machine',
    description: 'Integrated grinder and espresso machine for perfect coffee at home. Professional-grade extraction with precise temperature control.',
    price: 599.99,
    category: 'home',
    brand: 'Breville',
    stockQuantity: 20,
    features: ['Built-in Grinder', 'Precise Temp Control', 'Steam Wand', 'Dose Control'],
    images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400']
  },
  {
    name: 'Cuisinart 14-Cup Food Processor',
    description: 'Powerful food processor with multiple attachments for all food prep needs. Stainless steel blades for professional results.',
    price: 199.99,
    category: 'home',
    brand: 'Cuisinart',
    stockQuantity: 35,
    features: ['14-Cup Capacity', 'Stainless Steel Blades', 'Multiple Discs', 'Dough Control'],
    images: ['https://images.unsplash.com/photo-1558901366-9b1234567891?w=400']
  },
  {
    name: 'KitchenAid Artisan Mini Stand Mixer',
    description: 'Compact 3.5-quart stand mixer with same power as full-size models. Perfect for smaller kitchens with professional performance.',
    price: 279.99,
    category: 'home',
    brand: 'KitchenAid',
    stockQuantity: 40,
    features: ['3.5-qt Bowl', '10 Speeds', '67 Point Planetary Mixing', 'Multiple Attachments'],
    images: ['https://images.unsplash.com/photo-1585515656519-7d2e1d7b1f3e?w=400']
  },
  {
    name: 'Le Creuset Signature Dutch Oven',
    description: 'Enamel cast iron Dutch oven for perfect slow cooking and baking. Superior heat retention and beautiful design.',
    price: 329.99,
    category: 'home',
    brand: 'Le Creuset',
    stockQuantity: 25,
    features: ['5.5-qt Capacity', 'Enameled Cast Iron', 'Oven Safe', 'Lifetime Warranty'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'All-Clad D3 Stainless Steel Cookware Set',
    description: '10-piece professional cookware set with tri-ply construction. Premium stainless steel for professional and home chefs.',
    price: 799.99,
    category: 'home',
    brand: 'All-Clad',
    stockQuantity: 15,
    features: ['Tri-Ply Construction', 'Stainless Steel', 'Oven Safe', 'Dishwasher Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Wusthof Classic Ikon Chef Knife Set',
    description: '7-piece German forged knife set with precision cutting. Professional-grade knives for serious cooks.',
    price: 499.99,
    category: 'home',
    brand: 'Wusthof',
    stockQuantity: 20,
    features: ['German Steel', 'Forged Construction', 'Full Tang', 'Lifetime Warranty'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Chemex Classic Coffee Maker',
    description: 'Elegant pour-over coffee maker for pure, clean coffee flavor. Beautiful glass design with wood collar.',
    price: 44.99,
    category: 'home',
    brand: 'Chemex',
    stockQuantity: 45,
    features: ['Glass Construction', 'Wood Collar', 'Leather Tie', '6-8 Cup Capacity'],
    images: ['https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400']
  },
  {
    name: 'AeroPress Coffee Maker',
    description: 'Portable coffee maker for smooth, rich coffee anywhere. Fast brewing and easy cleaning for coffee enthusiasts.',
    price: 34.99,
    category: 'home',
    brand: 'AeroPress',
    stockQuantity: 80,
    features: ['Portable Design', 'Fast Brewing', 'Smooth Coffee', 'Easy Cleaning'],
    images: ['https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400']
  },
  {
    name: 'OXO Good Grips Pop Containers',
    description: '10-piece airtight food storage container set with pop-up lids. BPA-free and space-efficient design.',
    price: 89.99,
    category: 'home',
    brand: 'OXO',
    stockQuantity: 60,
    features: ['10 Pieces', 'Airtight Seal', 'Pop-up Lids', 'BPA-Free'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Bella Air Fryer',
    description: 'Compact air fryer with rapid air technology for healthy cooking. Perfect for crispy results with less oil.',
    price: 69.99,
    category: 'home',
    brand: 'Bella',
    stockQuantity: 55,
    features: ['Rapid Air Technology', '2.6-qt Capacity', 'Temperature Control', 'Timer'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Hamilton Beach Slow Cooker',
    description: '6-quart slow cooker with programmable settings and keep warm function. Convenient for busy lifestyles.',
    price: 49.99,
    category: 'home',
    brand: 'Hamilton Beach',
    stockQuantity: 70,
    features: ['6-qt Capacity', 'Programmable', 'Keep Warm', 'Dishwasher Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Vitamix 5200 Blender',
    description: 'Professional-grade blender with powerful motor and aircraft-grade stainless steel blades. Commercial quality for home use.',
    price: 449.99,
    category: 'home',
    brand: 'Vitamix',
    stockQuantity: 25,
    features: ['2 HP Motor', 'Variable Speed Control', '64-oz Container', '7-Year Warranty'],
    images: ['https://images.unsplash.com/photo-1578936710445-4d5d8f5c6c5c?w=400']
  },
  {
    name: 'Instant Pot Duo 7-in-1',
    description: 'Multi-cooker that pressure cooks, slow cooks, rice cooks, steams, and more. Versatile appliance for modern kitchens.',
    price: 79.99,
    category: 'home',
    brand: 'Instant Pot',
    stockQuantity: 120,
    features: ['7-in-1 Functionality', '14 Smart Programs', 'Stainless Steel Inner Pot'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Nespresso Vertuo Plus',
    description: 'Premium coffee machine with Centrifusion extraction technology for perfect coffee and espresso. One-touch operation.',
    price: 199.99,
    category: 'home',
    brand: 'Nespresso',
    stockQuantity: 45,
    features: ['Centrifusion Technology', 'One-touch Brewing', 'Adjustable Cup Size'],
    images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400']
  },
  {
    name: 'Breville Tea Maker with Variable Temperature',
    description: 'Electric kettle with 5 temperature settings for different tea types. Perfect for tea enthusiasts.',
    price: 149.99,
    category: 'home',
    brand: 'Breville',
    stockQuantity: 35,
    features: ['5 Temp Settings', 'Keep Warm Function', 'Water Window', 'Auto Shut-off'],
    images: ['https://images.unsplash.com/photo-1558901366-9b1234567893?w=400']
  },
  {
    name: 'DeLonghi Dedica Pump Espresso Maker',
    description: 'Compact espresso machine with thermoblock heating system. Professional espresso in a compact design.',
    price: 199.99,
    category: 'home',
    brand: 'DeLonghi',
    stockQuantity: 50,
    features: ['15-bar Pump', 'Thermoblock System', 'Manual Cappuccino System', 'Compact Design'],
    images: ['https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400']
  },
  {
    name: 'Staub Cast Iron Grill Pan',
    description: 'Heavy-duty grill pan with enamel coating for perfect grilling marks. Superior heat retention and durability.',
    price: 149.99,
    category: 'home',
    brand: 'Staub',
    stockQuantity: 30,
    features: ['Cast Iron', 'Enamel Coating', 'Even Heat Distribution', 'Stovetop Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Calphalon Nonstick Frying Pan Set',
    description: '3-piece nonstick frying pan set with durable PFOA-free coating. Essential cookware for every kitchen.',
    price: 89.99,
    category: 'home',
    brand: 'Calphalon',
    stockQuantity: 60,
    features: ['Nonstick Coating', 'PFOA-Free', 'Oven Safe', 'Soft Grip Handles'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'GreenPan Ceramic Non-Stick Skillet',
    description: 'Eco-friendly ceramic non-stick skillet with toxin-free coating. Healthy cooking with easy cleanup.',
    price: 79.99,
    category: 'home',
    brand: 'GreenPan',
    stockQuantity: 45,
    features: ['Ceramic Coating', 'Toxin-Free', 'Oven Safe', 'Dishwasher Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  }
];

async function seedKitchenProducts() {
  console.log('🌱 Seeding 20 Kitchen Products to Database...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < kitchenProducts.length; i++) {
    const product = kitchenProducts[i];
    
    try {
      const response = await fetch(`${API_BASE}/api/products/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(product)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${i + 1}/20: ${product.name} - $${product.price}`);
        successCount++;
      } else {
        console.log(`❌ ${i + 1}/20: ${product.name} - ${result.error || result.message || 'Unknown error'}`);
        errorCount++;
      }
    } catch (error) {
      console.log(`❌ ${i + 1}/20: ${product.name} - ${error.message}`);
      errorCount++;
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Verify results
  console.log('\n🔍 Verifying seeded products...');
  try {
    const productsResponse = await fetch(`${API_BASE}/api/products?limit=100`);
    const productsResult = await productsResponse.json();
    
    if (productsResponse.ok && productsResult.success) {
      const allProducts = productsResult.data.products;
      const kitchenProducts = allProducts.filter(p => 
        p.category === 'home' && (
          p.name.toLowerCase().includes('ninja') ||
          p.name.toLowerCase().includes('breville') ||
          p.name.toLowerCase().includes('cuisinart') ||
          p.name.toLowerCase().includes('kitchenaid') ||
          p.name.toLowerCase().includes('le creuset') ||
          p.name.toLowerCase().includes('all-clad') ||
          p.name.toLowerCase().includes('wusthof') ||
          p.name.toLowerCase().includes('chemex') ||
          p.name.toLowerCase().includes('aeropress') ||
          p.name.toLowerCase().includes('oxo') ||
          p.name.toLowerCase().includes('bella') ||
          p.name.toLowerCase().includes('hamilton') ||
          p.name.toLowerCase().includes('vitamix') ||
          p.name.toLowerCase().includes('instant pot') ||
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
        console.log('\n📦 Kitchen Products Added:');
        kitchenProducts.forEach((product, index) => {
          console.log(`${index + 1}. ${product.name} - $${product.price}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ Error verifying products:', error.message);
  }
  
  // Summary
  console.log('\n📊 Seeding Results:');
  console.log(`✅ Successfully seeded: ${successCount}/20 products`);
  console.log(`❌ Failed to seed: ${errorCount}/20 products`);
  
  console.log('\n🎉 Kitchen Store Pro product seeding complete!');
  console.log('\n🔗 Access Links:');
  console.log('🌐 Products Page: https://ojawa.africa/products');
  console.log('🏪 Store: Kitchen Store Pro (Lagos, Nigeria)');
  console.log('⭐ Vendor Rating: 4.8/5');
  
  if (successCount > 0) {
    console.log('\n✅ Products should now be visible on the frontend!');
    console.log('🔄 Hard refresh the page (Ctrl+F5) to see the new products');
  }
}

// Run the script
if (require.main === module) {
  seedKitchenProducts().then(() => {
    console.log('\n✅ Script completed!');
  });
}

module.exports = { seedKitchenProducts, kitchenProducts };
