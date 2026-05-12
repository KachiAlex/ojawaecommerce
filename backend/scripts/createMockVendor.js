// Mock Vendor Creation and Product Assignment Script
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.log('Firebase already initialized or using default credentials');
  }
}

const db = admin.firestore();
const auth = admin.auth();

// Mock Vendor Data
const mockVendor = {
  // Authentication Details
  email: 'kitchengadgets@ojawa.com',
  password: 'Vendor123456!',
  displayName: 'Kitchen Gadgets Pro',
  
  // Business Information
  businessName: 'Kitchen Gadgets Pro Store',
  storeName: 'Kitchen Gadgets Pro',
  description: 'Premium kitchen appliances and gadgets for modern homes. We specialize in high-quality, innovative kitchen solutions that make cooking easier and more enjoyable.',
  
  // Location Information
  location: {
    address: '123 Kitchen Street, Victoria Island',
    city: 'Lagos',
    state: 'Lagos State',
    country: 'Nigeria',
    postalCode: '101241',
    coordinates: {
      latitude: 6.4521,
      longitude: 3.3917
    }
  },
  
  // Contact Information
  contact: {
    phone: '+2348012345678',
    whatsapp: '+2348012345678',
    email: 'support@kitchengadgets.com',
    website: 'https://kitchengadgets.ojawa.com',
    businessPhone: '+2348012345679'
  },
  
  // Business Details
  business: {
    type: 'retail',
    category: 'kitchen-appliances',
    established: '2020',
    employees: '5-10',
    registrationNumber: 'RC123456789',
    taxId: 'TIN-2020-12345',
    businessLicense: 'BL-LAG-2020-1234'
  },
  
  // Store Settings
  store: {
    currency: 'NGN',
    language: 'en',
    timezone: 'Africa/Lagos',
    shippingRegions: ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan'],
    returnPolicy: '30-day return policy for unused items in original packaging',
    warrantyPolicy: '1-2 year manufacturer warranty on all products',
    shippingPolicy: 'Free shipping for orders above ₦50,000 within Lagos'
  },
  
  // Payment Information
  payment: {
    bankName: 'Guaranty Trust Bank',
    accountName: 'Kitchen Gadgets Pro Store',
    accountNumber: '0123456789',
    paystackMerchantCode: 'MCP_KITCHEN_12345',
    acceptedPaymentMethods: ['card', 'bank_transfer', 'ussd', 'paystack']
  },
  
  // Social Media
  social: {
    instagram: '@kitchengadgetspro',
    facebook: 'KitchenGadgetsPro',
    twitter: '@kitchengadgets_ng',
    linkedin: 'kitchen-gadgets-pro'
  },
  
  // Verification Status
  verification: {
    isVerified: true,
    verificationDate: new Date('2024-01-15'),
    verificationLevel: 'premium',
    documents: ['business_license', 'id_document', 'tax_certificate'],
    rating: 4.8,
    reviewCount: 127
  },
  
  // Store Analytics
  analytics: {
    totalSales: 2847000, // ₦2.8M
    totalOrders: 342,
    averageOrderValue: 8315,
    customerSatisfaction: 4.7,
    responseTime: '2 hours'
  }
};

// Products to assign to this vendor (kitchen-focused)
const vendorProducts = [
  {
    name: 'KitchenAid Stand Mixer',
    description: 'Professional-grade stand mixer with 5-quart stainless steel bowl. Perfect for baking enthusiasts and professional chefs.',
    price: 329.99,
    currency: 'USD',
    category: 'home',
    brand: 'KitchenAid',
    stockQuantity: 30,
    inStock: true,
    rating: 4.7,
    reviewCount: 234,
    features: ['5-Quart Capacity', '10 Speeds', 'Dishwasher Safe Bowl', 'Multiple Attachments'],
    specifications: {
      capacity: '5 Quart',
      speeds: '10',
      power: '325W',
      bowl: 'Stainless Steel',
      attachments: ['Flat Beater', 'Dough Hook', 'Wire Whip']
    },
    images: [
      'https://images.unsplash.com/photo-1585515656519-7d2e1d7b1f3e?w=400',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'
    ],
    status: 'active',
    isActive: true,
    tags: ['kitchen', 'baking', 'professional', 'stand-mixer'],
    shippingWeight: 11.5,
    dimensions: {
      length: 14.1,
      width: 8.7,
      height: 14.1
    }
  },
  {
    name: 'Dyson V15 Detect Absolute',
    description: 'Advanced cordless vacuum with laser dust detection and intelligent suction. Reveals hidden dust and automatically adapts power.',
    price: 749.99,
    currency: 'USD',
    category: 'home',
    brand: 'Dyson',
    stockQuantity: 60,
    inStock: true,
    rating: 4.7,
    reviewCount: 920,
    features: ['Laser Dust Detection', 'Piezo Sensor', 'LCD Screen', '60-minute Runtime', 'HEPA Filtration'],
    specifications: {
      suction: '230 AW',
      runtime: '60 minutes',
      filtration: 'Whole-machine HEPA',
      bin: '0.76L capacity',
      weight: '3.05kg'
    },
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
      'https://images.unsplash.com/photo-1588421357574-87938a86fa28?w=400'
    ],
    status: 'active',
    isActive: true,
    tags: ['vacuum', 'cordless', 'cleaning', 'smart-home'],
    shippingWeight: 3.05,
    dimensions: {
      length: 25.1,
      width: 12.6,
      height: 25.1
    }
  },
  {
    name: 'Instant Pot Duo 7-in-1',
    description: 'Multi-cooker that pressure cooks, slow cooks, rice cooks, steams, sautés, and more. The perfect kitchen companion.',
    price: 79.99,
    currency: 'USD',
    category: 'home',
    brand: 'Instant Pot',
    stockQuantity: 120,
    inStock: true,
    rating: 4.5,
    reviewCount: 3200,
    features: ['7-in-1 Functionality', '14 Smart Programs', 'Stainless Steel Inner Pot', 'Easy-to-use Controls'],
    specifications: {
      capacity: '6 Quarts',
      functions: 'Pressure Cook, Slow Cook, Rice Cook, Steam, Sauté, Yogurt, Warm',
      programs: '14 Smart Programs',
      material: 'Stainless Steel Inner Pot',
      safety: '10+ proven safety features'
    },
    images: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
      'https://images.unsplash.com/photo-1579632384302-0a2d0e281826?w=400'
    ],
    status: 'active',
    isActive: true,
    tags: ['multi-cooker', 'pressure-cooker', 'kitchen', 'appliance'],
    shippingWeight: 5.7,
    dimensions: {
      length: 13.2,
      width: 12.6,
      height: 12.2
    }
  },
  {
    name: 'Vitamix 5200 Blender',
    description: 'Professional-grade blender with powerful motor and aircraft-grade stainless steel blades. Perfect for smoothies, soups, and more.',
    price: 449.99,
    currency: 'USD',
    category: 'home',
    brand: 'Vitamix',
    stockQuantity: 25,
    inStock: true,
    rating: 4.8,
    reviewCount: 892,
    features: ['2 HP Motor', 'Variable Speed Control', '64-oz Container', 'BPA-Free', '7-Year Warranty'],
    specifications: {
      motor: '2 Peak HP',
      speed: 'Variable Speed Control',
      container: '64-oz BPA-Free',
      blades: 'Aircraft-grade Stainless Steel',
      warranty: '7 Years'
    },
    images: [
      'https://images.unsplash.com/photo-1578936710445-4d5d8f5c6c5c?w=400',
      'https://images.unsplash.com/photo-1558901366-9b1234567890?w=400'
    ],
    status: 'active',
    isActive: true,
    tags: ['blender', 'professional', 'smoothie', 'kitchen'],
    shippingWeight: 4.6,
    dimensions: {
      length: 7.5,
      width: 8.75,
      height: 20.5
    }
  },
  {
    name: 'Nespresso Vertuo Plus Coffee Machine',
    description: 'Premium coffee machine with Centrifusion extraction technology. Makes both coffee and espresso with one touch.',
    price: 199.99,
    currency: 'USD',
    category: 'home',
    brand: 'Nespresso',
    stockQuantity: 45,
    inStock: true,
    rating: 4.6,
    reviewCount: 1567,
    features: ['Centrifusion Technology', 'One-touch Brewing', 'Adjustable Cup Size', 'Removable Water Tank'],
    specifications: {
      technology: 'Centrifusion',
      cupSizes: 'Espresso, Gran Lungo, Coffee, Alto',
      waterTank: '40 oz removable',
      dimensions: '15.5" x 5.6" x 11.9"',
      heatUpTime: '25 seconds'
    },
    images: [
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
      'https://images.unsplash.com/photo-1511920183459-fd8a5d6e7d4c?w=400'
    ],
    status: 'active',
    isActive: true,
    tags: ['coffee', 'espresso', 'machine', 'premium'],
    shippingWeight: 3.1,
    dimensions: {
      length: 15.5,
      width: 5.6,
      height: 11.9
    }
  },
  {
    name: 'Breville Smart Oven Air Fryer',
    description: 'Convection oven with air fry function. 13 smart cooking presets for perfect results every time.',
    price: 299.99,
    currency: 'USD',
    category: 'home',
    brand: 'Breville',
    stockQuantity: 35,
    inStock: true,
    rating: 4.7,
    reviewCount: 743,
    features: ['Air Fry Function', '13 Smart Presets', 'Element IQ System', 'Large Capacity', 'Stainless Steel'],
    specifications: {
      capacity: '0.8 cu ft (fits 9x13 pan)',
      presets: 'Air Fry, Toast, Bake, Roast, Reheat, Warm, Cookies, Pizza, Bagel, Broil, Roast, Slow Cook, Dehydrate',
      power: '1800W',
      dimensions: '21.5" x 17.5" x 12.7"'
    },
    images: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
      'https://images.unsplash.com/photo-1577804847124-3d5d5b6b5b5b?w=400'
    ],
    status: 'active',
    isActive: true,
    tags: ['oven', 'air-fryer', 'convection', 'smart'],
    shippingWeight: 12.5,
    dimensions: {
      length: 21.5,
      width: 17.5,
      height: 12.7
    }
  },
  {
    name: 'Cuisinart Food Processor',
    description: '14-cup food processor with stainless steel blades and discs. Perfect for chopping, slicing, shredding, and dough making.',
    price: 249.99,
    currency: 'USD',
    category: 'home',
    brand: 'Cuisinart',
    stockQuantity: 40,
    inStock: true,
    rating: 4.5,
    reviewCount: 612,
    features: ['14-Cup Capacity', 'Stainless Steel Blades', 'Multiple Discs', 'Dough Control', 'SealTight Advantage'],
    specifications: {
      capacity: '14 cups',
      motor: '650W',
      blades: 'Stainless Steel chopping/mixing blade',
      discs: 'Medium shredding disc, medium slicing disc, 4mm shredding disc, 4mm slicing disc',
      warranty: '3 Years Limited'
    },
    images: [
      'https://images.unsplash.com/photo-1558901366-9b1234567891?w=400',
      'https://images.unsplash.com/photo-1558901366-9b1234567892?w=400'
    ],
    status: 'active',
    isActive: true,
    tags: ['food-processor', 'chopping', 'slicing', 'kitchen'],
    shippingWeight: 8.5,
    dimensions: {
      length: 8.75,
      width: 7.75,
      height: 16.0
    }
  },
  {
    name: 'KitchenAid Kettle',
    description: 'Stainless steel electric kettle with 1.7L capacity. Fast boiling with dual water windows.',
    price: 79.99,
    currency: 'USD',
    category: 'home',
    brand: 'KitchenAid',
    stockQuantity: 50,
    inStock: true,
    rating: 4.4,
    reviewCount: 428,
    features: ['1.7L Capacity', 'Fast Boiling', 'Dual Water Windows', 'Removable Lid', 'Cordless Design'],
    specifications: {
      capacity: '1.7 Liters',
      power: '1500W',
      material: 'Stainless Steel',
      boilTime: '7 minutes',
      temperature: '100°C boiling point'
    },
    images: [
      'https://images.unsplash.com/photo-1558901366-9b1234567893?w=400',
      'https://images.unsplash.com/photo-1558901366-9b1234567894?w=400'
    ],
    status: 'active',
    isActive: true,
    tags: ['kettle', 'electric', 'boiling', 'stainless-steel'],
    shippingWeight: 1.2,
    dimensions: {
      length: 9.0,
      width: 6.5,
      height: 10.0
    }
  }
];

async function createMockVendorAndAssignProducts() {
  try {
    console.log('🏪 Creating Mock Vendor and Assigning Products...\n');
    
    // Step 1: Create vendor in Firebase Auth
    console.log('1️⃣ Creating vendor authentication...');
    let vendorUserRecord;
    
    try {
      vendorUserRecord = await auth.createUser({
        email: mockVendor.email,
        password: mockVendor.password,
        displayName: mockVendor.displayName,
        emailVerified: true
      });
      console.log('✅ Vendor auth created:', vendorUserRecord.uid);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        // Get existing user
        vendorUserRecord = await auth.getUserByEmail(mockVendor.email);
        console.log('✅ Using existing vendor auth:', vendorUserRecord.uid);
      } else {
        throw error;
      }
    }
    
    // Step 2: Create vendor profile in Firestore
    console.log('\n2️⃣ Creating vendor profile...');
    const vendorData = {
      uid: vendorUserRecord.uid,
      email: mockVendor.email,
      displayName: mockVendor.displayName,
      role: 'vendor',
      ...mockVendor,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      isActive: true,
      isApproved: true,
      approvalDate: new Date('2024-01-15'),
      lastLoginAt: new Date(),
      profileCompletion: 100
    };
    
    await db.collection('users').doc(vendorUserRecord.uid).set(vendorData);
    console.log('✅ Vendor profile created');
    
    // Step 3: Create vendor store document
    console.log('\n3️⃣ Creating vendor store...');
    const storeData = {
      vendorId: vendorUserRecord.uid,
      name: mockVendor.storeName,
      businessName: mockVendor.businessName,
      description: mockVendor.description,
      location: mockVendor.location,
      contact: mockVendor.contact,
      settings: mockVendor.store,
      verification: mockVendor.verification,
      analytics: mockVendor.analytics,
      social: mockVendor.social,
      payment: mockVendor.payment,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      isActive: true,
      isVerified: true,
      rating: mockVendor.verification.rating,
      reviewCount: mockVendor.verification.reviewCount,
      totalProducts: vendorProducts.length,
      logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
      bannerImage: 'https://images.unsplash.com/photo-1558901366-9b1234567895?w=800',
      storeUrl: 'kitchen-gadgets-pro'
    };
    
    const storeRef = await db.collection('stores').add(storeData);
    console.log('✅ Store created:', storeRef.id);
    
    // Step 4: Delete existing products to avoid duplicates
    console.log('\n4️⃣ Cleaning up existing products...');
    const existingProducts = await db.collection('products').get();
    const deletePromises = [];
    existingProducts.forEach(doc => {
      deletePromises.push(db.collection('products').doc(doc.id).delete());
    });
    
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`✅ Deleted ${deletePromises.length} existing products`);
    }
    
    // Step 5: Create new products for this vendor
    console.log('\n5️⃣ Creating vendor products...');
    const batch = db.batch();
    const productsRef = db.collection('products');
    
    vendorProducts.forEach((product, index) => {
      const productRef = productsRef.doc();
      const productData = {
        ...product,
        vendorId: vendorUserRecord.uid,
        storeId: storeRef.id,
        vendorName: mockVendor.storeName,
        vendorLocation: mockVendor.location.city + ', ' + mockVendor.location.state,
        vendorRating: mockVendor.verification.rating,
        vendorVerified: mockVendor.verification.isVerified,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        views: 0,
        salesCount: Math.floor(Math.random() * 50) + 5, // Random sales count
        lastViewedAt: null,
        featuredAt: index < 3 ? admin.firestore.FieldValue.serverTimestamp() : null, // First 3 products are featured
        isFeatured: index < 3,
        tags: product.tags || [],
        sku: `KGP-${String(index + 1).padStart(4, '0')}`,
        barcode: `1234567890${String(index + 1).padStart(3, '0')}`,
        weight: product.shippingWeight || 1,
        dimensions: product.dimensions || {}
      };
      
      batch.set(productRef, productData);
      console.log(`  📦 Prepared: ${product.name}`);
    });
    
    await batch.commit();
    console.log(`✅ Created ${vendorProducts.length} products for vendor`);
    
    // Step 6: Create vendor analytics
    console.log('\n6️⃣ Setting up vendor analytics...');
    const analyticsData = {
      vendorId: vendorUserRecord.uid,
      storeId: storeRef.id,
      period: 'all-time',
      totalRevenue: mockVendor.analytics.totalSales,
      totalOrders: mockVendor.analytics.totalOrders,
      averageOrderValue: mockVendor.analytics.averageOrderValue,
      totalProducts: vendorProducts.length,
      totalViews: Math.floor(Math.random() * 10000) + 5000,
      conversionRate: 3.2,
      customerSatisfaction: mockVendor.analytics.customerSatisfaction,
      responseTime: mockVendor.analytics.responseTime,
      topProducts: vendorProducts.slice(0, 5).map(p => p.name),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('vendorAnalytics').doc(vendorUserRecord.uid).set(analyticsData);
    console.log('✅ Vendor analytics created');
    
    // Step 7: Create vendor inventory
    console.log('\n7️⃣ Creating inventory records...');
    const inventoryBatch = db.batch();
    const inventoryRef = db.collection('inventory');
    
    vendorProducts.forEach((product, index) => {
      const inventoryDoc = inventoryRef.doc();
      const inventoryData = {
        productId: `product-${index + 1}`, // Will be updated with real product ID
        vendorId: vendorUserRecord.uid,
        storeId: storeRef.id,
        sku: `KGP-${String(index + 1).padStart(4, '0')}`,
        quantity: product.stockQuantity,
        reserved: 0,
        available: product.stockQuantity,
        lowStockThreshold: 10,
        reorderLevel: 5,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        location: mockVendor.location.city,
        warehouseInfo: {
          section: 'A',
          shelf: String(index + 1).padStart(2, '0'),
          bin: `${String(Math.floor(index / 4) + 1).padStart(2, '0')}${String((index % 4) + 1).padStart(2, '0')}`
        }
      };
      
      inventoryBatch.set(inventoryDoc, inventoryData);
    });
    
    await inventoryBatch.commit();
    console.log(`✅ Created ${vendorProducts.length} inventory records`);
    
    // Summary
    console.log('\n🎉 Mock Vendor and Products Created Successfully!');
    console.log('\n📋 Vendor Details:');
    console.log(`👤 Name: ${mockVendor.displayName}`);
    console.log(`📧 Email: ${mockVendor.email}`);
    console.log(`🔑 Password: ${mockVendor.password}`);
    console.log(`🏪 Store: ${mockVendor.storeName}`);
    console.log(`📍 Location: ${mockVendor.location.city}, ${mockVendor.location.state}`);
    console.log(`📱 Phone: ${mockVendor.contact.phone}`);
    console.log(`⭐ Rating: ${mockVendor.verification.rating}/5`);
    console.log(`✅ Verified: ${mockVendor.verification.isVerified ? 'Yes' : 'No'}`);
    
    console.log('\n📦 Products Created:');
    vendorProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - $${product.price}`);
    });
    
    console.log('\n🔗 Login Credentials:');
    console.log(`URL: https://ojawa.africa/login`);
    console.log(`Email: ${mockVendor.email}`);
    console.log(`Password: ${mockVendor.password}`);
    
    console.log('\n🛍️ Store URL: https://ojawa.africa/store/kitchen-gadgets-pro');
    console.log('🎯 All products are now assigned to this mock vendor!');
    
  } catch (error) {
    console.error('❌ Error creating mock vendor:', error);
  }
}

// Run the script
if (require.main === module) {
  createMockVendorAndAssignProducts().then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { createMockVendorAndAssignProducts, mockVendor, vendorProducts };
