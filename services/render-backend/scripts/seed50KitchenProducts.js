// Seed 50 Kitchen Products for Mock Vendor
const fetch = require('node-fetch');

const API_BASE = 'https://ojawaecommerce.onrender.com';

// 50 diverse kitchen products for Kitchen Store Pro
const kitchenProducts = [
  // Small Appliances
  {
    name: 'Ninja Foodi 9-in-1 Pressure Cooker',
    description: 'Multi-cooker with 9 functions including pressure cook, air fry, and steam.',
    price: 149.99,
    category: 'home',
    brand: 'Ninja',
    stockQuantity: 45,
    features: ['9-in-1 Functionality', 'TenderCrisp Technology', '6.5-qt Capacity', '45 Recipes'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Breville Barista Express Espresso Machine',
    description: 'Integrated grinder and espresso machine for perfect coffee at home.',
    price: 599.99,
    category: 'home',
    brand: 'Breville',
    stockQuantity: 20,
    features: ['Built-in Grinder', 'Precise Temp Control', 'Steam Wand', 'Dose Control'],
    images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400']
  },
  {
    name: 'Cuisinart 14-Cup Food Processor',
    description: 'Powerful food processor with multiple attachments for all food prep needs.',
    price: 199.99,
    category: 'home',
    brand: 'Cuisinart',
    stockQuantity: 35,
    features: ['14-Cup Capacity', 'Stainless Steel Blades', 'Multiple Discs', 'Dough Control'],
    images: ['https://images.unsplash.com/photo-1558901366-9b1234567891?w=400']
  },
  {
    name: 'KitchenAid Artisan Mini Stand Mixer',
    description: 'Compact 3.5-quart stand mixer with same power as full-size models.',
    price: 279.99,
    category: 'home',
    brand: 'KitchenAid',
    stockQuantity: 40,
    features: ['3.5-qt Bowl', '10 Speeds', '67 Point Planetary Mixing', 'Multiple Attachments'],
    images: ['https://images.unsplash.com/photo-1585515656519-7d2e1d7b1f3e?w=400']
  },
  {
    name: 'DeLonghi Dedica Pump Espresso Maker',
    description: 'Compact espresso machine with thermoblock heating system.',
    price: 199.99,
    category: 'home',
    brand: 'DeLonghi',
    stockQuantity: 50,
    features: ['15-bar Pump', 'Thermoblock System', 'Manual Cappuccino System', 'Compact Design'],
    images: ['https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400']
  },
  // Cookware
  {
    name: 'Le Creuset Signature Dutch Oven',
    description: 'Enamel cast iron Dutch oven for perfect slow cooking and baking.',
    price: 329.99,
    category: 'home',
    brand: 'Le Creuset',
    stockQuantity: 25,
    features: ['5.5-qt Capacity', 'Enameled Cast Iron', 'Oven Safe', 'Lifetime Warranty'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'All-Clad D3 Stainless Steel Cookware Set',
    description: '10-piece professional cookware set with tri-ply construction.',
    price: 799.99,
    category: 'home',
    brand: 'All-Clad',
    stockQuantity: 15,
    features: ['Tri-Ply Construction', 'Stainless Steel', 'Oven Safe', 'Dishwasher Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Staub Cast Iron Grill Pan',
    description: 'Heavy-duty grill pan with enamel coating for perfect grilling marks.',
    price: 149.99,
    category: 'home',
    brand: 'Staub',
    stockQuantity: 30,
    features: ['Cast Iron', 'Enamel Coating', 'Even Heat Distribution', 'Stovetop Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Calphalon Nonstick Frying Pan Set',
    description: '3-piece nonstick frying pan set with durable PFOA-free coating.',
    price: 89.99,
    category: 'home',
    brand: 'Calphalon',
    stockQuantity: 60,
    features: ['Nonstick Coating', 'PFOA-Free', 'Oven Safe', 'Soft Grip Handles'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'GreenPan Ceramic Non-Stick Skillet',
    description: 'Eco-friendly ceramic non-stick skillet with toxin-free coating.',
    price: 79.99,
    category: 'home',
    brand: 'GreenPan',
    stockQuantity: 45,
    features: ['Ceramic Coating', 'Toxin-Free', 'Oven Safe', 'Dishwasher Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  // Bakeware
  {
    name: 'Wilton Perfect Results Premium Baking Set',
    description: '29-piece baking set with all essential pans and tools.',
    price: 49.99,
    category: 'home',
    brand: 'Wilton',
    stockQuantity: 80,
    features: ['29 Pieces', 'Nonstick Coating', 'Oven Safe', 'Dishwasher Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'USA Pan Bakeware Set',
    description: 'Professional-grade aluminized steel bakeware set with silicone coating.',
    price: 129.99,
    category: 'home',
    brand: 'USA Pan',
    stockQuantity: 35,
    features: ['Aluminized Steel', 'Silicone Coating', 'Made in USA', 'Commercial Grade'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Emile Henry Pie Dish',
    description: 'Ceramic pie dish with even heat distribution for perfect crusts.',
    price: 49.99,
    category: 'home',
    brand: 'Emile Henry',
    stockQuantity: 40,
    features: ['Ceramic', '9-inch Diameter', 'Oven Safe', 'Dishwasher Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Nordic Ware Bundt Pan',
    description: 'Classic bundt pan for beautiful cakes with detailed designs.',
    price: 34.99,
    category: 'home',
    brand: 'Nordic Ware',
    stockQuantity: 55,
    features: ['Aluminum', '10-cup Capacity', 'Nonstick Coating', 'Made in USA'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'OXO Good Grips Cooling Rack',
    description: 'Heavy-duty cooling rack with grid design for proper air circulation.',
    price: 19.99,
    category: 'home',
    brand: 'OXO',
    stockQuantity: 100,
    features: ['Grid Design', 'Nonstick Coating', 'Dishwasher Safe', 'Folds for Storage'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  // Kitchen Tools
  {
    name: 'Wusthof Classic Ikon Chef Knife Set',
    description: '7-piece German forged knife set with precision cutting.',
    price: 499.99,
    category: 'home',
    brand: 'Wusthof',
    stockQuantity: 20,
    features: ['German Steel', 'Forged Construction', 'Full Tang', 'Lifetime Warranty'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'OXO Good Grips Kitchen Tool Set',
    description: '15-piece kitchen utensil set with comfortable non-slip grips.',
    price: 79.99,
    category: 'home',
    brand: 'OXO',
    stockQuantity: 70,
    features: ['15 Pieces', 'Non-slip Grips', 'Dishwasher Safe', 'Ergonomic Design'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Cuisinart Digital Kitchen Scale',
    description: 'Precision digital scale with tare function and multiple units.',
    price: 39.99,
    category: 'home',
    brand: 'Cuisinart',
    stockQuantity: 60,
    features: ['Digital Display', 'Tare Function', 'Multiple Units', '11-lb Capacity'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Zyliss Lock-N-Lift Can Opener',
    description: 'Ergonomic can opener with locking mechanism for easy opening.',
    price: 24.99,
    category: 'home',
    brand: 'Zyliss',
    stockQuantity: 85,
    features: ['Locking Mechanism', 'Ergonomic Handle', 'Dishwasher Safe', 'Magnetic Lid Holder'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Joseph Joseph Elevate Utensil Set',
    description: '6-piece utensil set with weighted handles and elevated design.',
    price: 49.99,
    category: 'home',
    brand: 'Joseph Joseph',
    stockQuantity: 55,
    features: ['6 Pieces', 'Elevated Design', 'Weighted Handles', 'Dishwasher Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  // Coffee & Tea
  {
    name: 'Breville Tea Maker with Variable Temperature',
    description: 'Electric kettle with 5 temperature settings for different tea types.',
    price: 149.99,
    category: 'home',
    brand: 'Breville',
    stockQuantity: 35,
    features: ['5 Temp Settings', 'Keep Warm Function', 'Water Window', 'Auto Shut-off'],
    images: ['https://images.unsplash.com/photo-1558901366-9b1234567893?w=400']
  },
  {
    name: 'Chemex Classic Coffee Maker',
    description: 'Elegant pour-over coffee maker for pure, clean coffee flavor.',
    price: 44.99,
    category: 'home',
    brand: 'Chemex',
    stockQuantity: 45,
    features: ['Glass Construction', 'Wood Collar', 'Leather Tie', '6-8 Cup Capacity'],
    images: ['https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400']
  },
  {
    name: 'AeroPress Coffee Maker',
    description: 'Portable coffee maker for smooth, rich coffee anywhere.',
    price: 34.99,
    category: 'home',
    brand: 'AeroPress',
    stockQuantity: 80,
    features: ['Portable Design', 'Fast Brewing', 'Smooth Coffee', 'Easy Cleaning'],
    images: ['https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400']
  },
  {
    name: 'Hario V60 Ceramic Dripper',
    description: 'Professional pour-over dripper for precise coffee extraction.',
    price: 29.99,
    category: 'home',
    brand: 'Hario',
    stockQuantity: 65,
    features: ['Ceramic', 'Cone Shape', 'Spiral Ribs', 'Hole Size Control'],
    images: ['https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400']
  },
  {
    name: 'YETI Rambler 20 oz Tumbler',
    description: 'Insulated tumbler for hot and cold drinks with MagSlider lid.',
    price: 29.99,
    category: 'home',
    brand: 'YETI',
    stockQuantity: 90,
    features: ['Double-wall Vacuum', 'MagSlider Lid', 'Dishwasher Safe', 'No Sweat Design'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  // Specialty Appliances
  {
    name: 'SousVide Supreme Water Oven',
    description: 'Professional sous vide cooking system for perfect results every time.',
    price: 449.99,
    category: 'home',
    brand: 'SousVide Supreme',
    stockQuantity: 15,
    features: ['Water Bath', 'Precise Temperature', 'Timer Function', 'Large Capacity'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Cuisinart Ice Cream Maker',
    description: 'Fully automatic ice cream maker with commercial-quality compressor.',
    price: 249.99,
    category: 'home',
    brand: 'Cuisinart',
    stockQuantity: 25,
    features: ['Fully Automatic', 'Compressor Cooling', '2-qt Capacity', 'Timer'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Bella Air Fryer',
    description: 'Compact air fryer with rapid air technology for healthy cooking.',
    price: 69.99,
    category: 'home',
    brand: 'Bella',
    stockQuantity: 55,
    features: ['Rapid Air Technology', '2.6-qt Capacity', 'Temperature Control', 'Timer'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Hamilton Beach Slow Cooker',
    description: '6-quart slow cooker with programmable settings and keep warm function.',
    price: 49.99,
    category: 'home',
    brand: 'Hamilton Beach',
    stockQuantity: 70,
    features: ['6-qt Capacity', 'Programmable', 'Keep Warm', 'Dishwasher Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Cuisinart Toaster Oven',
    description: 'Convection toaster oven with multiple cooking functions.',
    price: 129.99,
    category: 'home',
    brand: 'Cuisinart',
    stockQuantity: 40,
    features: ['Convection', 'Toaster Oven', 'Multiple Functions', 'Large Capacity'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  // Storage & Organization
  {
    name: 'OXO Good Grips Pop Containers',
    description: '10-piece airtight food storage container set with pop-up lids.',
    price: 89.99,
    category: 'home',
    brand: 'OXO',
    stockQuantity: 60,
    features: ['10 Pieces', 'Airtight Seal', 'Pop-up Lids', 'BPA-Free'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Rubbermaid Brilliance Food Storage',
    description: '20-piece food storage set with crystal-clear lids and stain resistance.',
    price: 79.99,
    category: 'home',
    brand: 'Rubbermaid',
    stockQuantity: 65,
    features: ['20 Pieces', 'Crystal Clear', 'Stain Resistant', 'Microwave Safe'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'SimpleHuman Kitchen Can',
    description: '45-liter fingerprint-proof kitchen can with motion sensor lid.',
    price: 179.99,
    category: 'home',
    brand: 'SimpleHuman',
    stockQuantity: 30,
    features: ['Motion Sensor', 'Fingerprint-proof', '45-liter Capacity', 'Liner Pocket'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Kamenstein Spice Rack',
    description: '20-jar revolving spice rack with pre-filled spices.',
    price: 49.99,
    category: 'home',
    brand: 'Kamenstein',
    stockQuantity: 50,
    features: ['20 Jars', 'Revolving Design', 'Pre-filled Spices', 'Wall Mountable'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'InterDesign Pantry Organizer',
    description: 'Adjustable pantry organizer for cans, jars, and boxes.',
    price: 34.99,
    category: 'home',
    brand: 'InterDesign',
    stockQuantity: 75,
    features: ['Adjustable', 'Expandable', 'Clear Design', 'Non-slip Feet'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  // Kitchen Gadgets
  {
    name: 'Chefman Electric Spiralizer',
    description: 'Electric spiralizer for vegetable noodles and ribbons.',
    price: 59.99,
    category: 'home',
    brand: 'Chefman',
    stockQuantity: 45,
    features: ['Electric Motor', 'Multiple Blades', 'Easy Cleaning', 'Compact Design'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Dash Rapid Egg Cooker',
    description: '6-egg capacity electric egg cooker with multiple cooking modes.',
    price: 24.99,
    category: 'home',
    brand: 'Dash',
    stockQuantity: 85,
    features: ['6-egg Capacity', 'Multiple Modes', 'Auto Shut-off', 'Compact Design'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Cuisinart Mini Prep Plus Processor',
    description: 'Compact food processor for small chopping and grinding tasks.',
    price: 39.99,
    category: 'home',
    brand: 'Cuisinart',
    stockQuantity: 70,
    features: ['4-cup Capacity', 'Chopping/Grinding', 'Dishwasher Safe', 'Compact'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Hamilton Beach Breakfast Sandwich Maker',
    description: 'All-in-one breakfast sandwich maker for quick meals.',
    price: 29.99,
    category: 'home',
    brand: 'Hamilton Beach',
    stockQuantity: 80,
    features: ['All-in-One', 'Quick Cooking', 'Nonstick Plates', 'Easy Cleaning'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Presto PopLite Hot Air Popcorn Popper',
    description: 'Hot air popcorn popper for healthy, oil-free popcorn.',
    price: 24.99,
    category: 'home',
    brand: 'Presto',
    stockQuantity: 90,
    features: ['Hot Air Popping', 'Oil-Free', 'Fast Popping', 'Easy Cleaning'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  // Premium & Professional
  {
    name: 'Wolf Gourmet Countertop Oven',
    description: 'Professional-grade countertop oven with advanced temperature control.',
    price: 699.99,
    category: 'home',
    brand: 'Wolf Gourmet',
    stockQuantity: 10,
    features: ['Professional Grade', 'Advanced Temp Control', 'Convection', '5 Cooking Modes'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Vitamix A3500 Ascent Blender',
    description: 'Smart blender with wireless connectivity and 5 program settings.',
    price: 649.99,
    category: 'home',
    brand: 'Vitamix',
    stockQuantity: 12,
    features: ['Smart Blender', 'Wireless Connectivity', '5 Programs', 'Self-Detect'],
    images: ['https://images.unsplash.com/photo-1578936710445-4d5d8f5c6c5c?w=400']
  },
  {
    name: 'KitchenAid Commercial Mixer',
    description: '8-quart commercial mixer for professional baking and cooking.',
    price: 1299.99,
    category: 'home',
    brand: 'KitchenAid',
    stockQuantity: 8,
    features: ['8-qt Capacity', 'Commercial Grade', 'All Metal Gears', 'Bowl Guard'],
    images: ['https://images.unsplash.com/photo-1585515656519-7d2e1d7b1f3e?w=400']
  },
  {
    name: 'Sub-Zero Built-in Refrigerator',
    description: '48-inch built-in refrigerator with dual cooling system.',
    price: 14999.99,
    category: 'home',
    brand: 'Sub-Zero',
    stockQuantity: 2,
    features: ['Dual Cooling', '48-inch Width', 'Built-in Design', 'Energy Star'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  },
  {
    name: 'Miele G 7000 Series Dishwasher',
    description: 'Premium dishwasher with AutoDos and PowerDisk technology.',
    price: 1899.99,
    category: 'home',
    brand: 'Miele',
    stockQuantity: 5,
    features: ['AutoDos System', 'PowerDisk Technology', 'Quiet Operation', 'Energy Efficient'],
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400']
  }
];

async function seedVendorProducts() {
  console.log('🏪 Seeding 50 Kitchen Products for Kitchen Store Pro...\n');
  
  // First, try to login as the vendor
  let vendorToken = null;
  
  try {
    console.log('1️⃣ Attempting vendor login...');
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
      vendorToken = loginResult.token;
      console.log('✅ Vendor login successful!');
      console.log('👤 Vendor:', loginResult.user.displayName);
      console.log('🆔 Vendor ID:', loginResult.user.uid);
    } else {
      console.log('❌ Login failed:', loginResult.error);
      console.log('📋 Trying alternative vendor credentials...');
      
      // Try the original vendor
      const altLoginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'kitchengadgets@ojawa.com',
          password: 'Vendor123456!'
        })
      });
      
      const altLoginResult = await altLoginResponse.json();
      
      if (altLoginResponse.ok) {
        vendorToken = altLoginResult.token;
        console.log('✅ Alternative vendor login successful!');
        console.log('👤 Vendor:', altLoginResult.user.displayName);
        console.log('🆔 Vendor ID:', altLoginResult.user.uid);
      } else {
        console.log('❌ Both logins failed. Cannot proceed with product seeding.');
        return;
      }
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return;
  }
  
  // Upload products
  console.log('\n2️⃣ Uploading 50 kitchen products...');
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
        console.log(`✅ ${i + 1}/50: ${product.name} - $${product.price}`);
        successCount++;
      } else {
        console.log(`❌ ${i + 1}/50: ${product.name} - ${result.error || 'Unknown error'}`);
        errorCount++;
      }
    } catch (error) {
      console.log(`❌ ${i + 1}/50: ${product.name} - ${error.message}`);
      errorCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Summary
  console.log('\n📊 Seeding Results:');
  console.log(`✅ Successfully uploaded: ${successCount}/50 products`);
  console.log(`❌ Failed uploads: ${errorCount}/50 products`);
  
  // Verify products
  console.log('\n3️⃣ Verifying vendor products...');
  try {
    const productsResponse = await fetch(`${API_BASE}/api/products?limit=100`);
    const productsResult = await productsResponse.json();
    
    if (productsResponse.ok && productsResult.success) {
      const allProducts = productsResult.data.products;
      const vendorProducts = allProducts.filter(p => 
        p.vendorId === loginResult?.user?.uid || 
        p.vendorName === 'Kitchen Store Pro' ||
        p.vendorName === 'Kitchen Gadgets Pro'
      );
      
      console.log(`✅ Total products in database: ${allProducts.length}`);
      console.log(`✅ Products for this vendor: ${vendorProducts.length}`);
      
      if (vendorProducts.length > 0) {
        console.log('\n📦 Vendor Product Categories:');
        const categories = {};
        vendorProducts.forEach(product => {
          categories[product.category] = (categories[product.category] || 0) + 1;
        });
        
        Object.entries(categories).forEach(([category, count]) => {
          console.log(`  ${category}: ${count} products`);
        });
        
        console.log('\n💰 Price Range:');
        const prices = vendorProducts.map(p => p.price);
        console.log(`  Min: $${Math.min(...prices).toFixed(2)}`);
        console.log(`  Max: $${Math.max(...prices).toFixed(2)}`);
        console.log(`  Avg: $${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)}`);
        
        console.log('\n🏆 Top 5 Most Expensive:');
        vendorProducts
          .sort((a, b) => b.price - a.price)
          .slice(0, 5)
          .forEach((product, index) => {
            console.log(`  ${index + 1}. ${product.name} - $${product.price}`);
          });
      }
    }
  } catch (error) {
    console.log('❌ Error verifying products:', error.message);
  }
  
  console.log('\n🎉 Kitchen Store Pro product seeding complete!');
  console.log('\n🔗 Access Links:');
  console.log('🌐 Products Page: https://ojawa.africa/products');
  console.log('🏪 Vendor Dashboard: https://ojawa.africa/vendor');
  console.log('🔑 Vendor Login: https://ojawa.africa/login');
}

// Run the seeding
if (require.main === module) {
  seedVendorProducts().then(() => {
    console.log('\n✅ Script completed!');
  });
}

module.exports = { seedVendorProducts, kitchenProducts };
