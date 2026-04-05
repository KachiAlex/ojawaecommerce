// Product seeding script for Render backend
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || 'ojawa-ecommerce'
  });
}

const db = admin.firestore();

// Sample products data
const sampleProducts = [
  {
    name: 'iPhone 15 Pro Max',
    description: 'Latest iPhone with titanium design, A17 Pro chip, and advanced camera system.',
    price: 1199.99,
    currency: 'USD',
    category: 'electronics',
    brand: 'Apple',
    stockQuantity: 50,
    inStock: true,
    rating: 4.8,
    reviewCount: 1250,
    features: [
      'A17 Pro Chip',
      'Titanium Design',
      'Pro Camera System',
      '6.7" Super Retina XDR Display',
      '5G Connectivity'
    ],
    specifications: {
      display: '6.7" Super Retina XDR',
      chip: 'A17 Pro',
      storage: '256GB',
      camera: '48MP Main + 12MP Ultra Wide + 12MP Telephoto',
      battery: 'Up to 29 hours video playback'
    },
    images: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
      'https://images.unsplash.com/photo-1591337676887-a218a6975c58?w=400'
    ],
    vendorId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
    storeId: 'YikVrzpMtX34NeFvebD4',
    status: 'active',
    isActive: true
  },
  {
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Premium Android smartphone with S Pen, advanced AI features, and powerful camera.',
    price: 1299.99,
    currency: 'USD',
    category: 'electronics',
    brand: 'Samsung',
    stockQuantity: 45,
    inStock: true,
    rating: 4.7,
    reviewCount: 890,
    features: [
      'S Pen Included',
      'Galaxy AI Features',
      '200MP Main Camera',
      '6.8" Dynamic AMOLED 2X',
      '5000mAh Battery'
    ],
    specifications: {
      display: '6.8" Dynamic AMOLED 2X',
      chip: 'Snapdragon 8 Gen 3',
      storage: '512GB',
      camera: '200MP Main + 50MP Periscope + 12MP Ultra Wide + 10MP Telephoto',
      battery: '5000mAh with 45W fast charging'
    },
    images: [
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400',
      'https://images.unsplash.com/photo-1605236453806-b25a3db78153?w=400'
    ],
    vendorId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
    storeId: 'YikVrzpMtX34NeFvebD4',
    status: 'active',
    isActive: true
  },
  {
    name: 'Nike Air Jordan 1 Retro High',
    description: 'Iconic basketball sneaker with premium leather construction and classic design.',
    price: 170,
    currency: 'USD',
    category: 'clothing',
    brand: 'Nike',
    stockQuantity: 100,
    inStock: true,
    rating: 4.9,
    reviewCount: 2100,
    features: [
      'Premium Leather Upper',
      'Air-Sole Unit in Heel',
      'Classic Colorway',
      'Rubber Outsole',
      'Padded Collar'
    ],
    specifications: {
      material: 'Full-Grain Leather',
      sole: 'Rubber with Air-Sole Unit',
      closure: 'Lace-up',
      weight: '1.3 lbs',
      colors: ['Chicago', 'Bred', 'Royal', 'Neutral']
    },
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400'
    ],
    vendorId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
    storeId: 'YikVrzpMtX34NeFvebD4',
    status: 'active',
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Sony WH-1000XM5 Wireless Headphones',
    description: 'Industry-leading noise canceling headphones with exceptional sound quality.',
    price: 399.99,
    currency: 'USD',
    category: 'electronics',
    brand: 'Sony',
    stockQuantity: 75,
    inStock: true,
    rating: 4.6,
    reviewCount: 1560,
    features: [
      'Industry-leading Noise Canceling',
      '30-hour Battery Life',
      'High-Resolution Audio',
      'Multipoint Connection',
      'Speak-to-Chat Technology'
    ],
    specifications: {
      driver: '30mm',
      frequency: '4Hz-40,000Hz',
      battery: '30 hours with ANC on',
      charging: 'USB-C, 3 min charge = 3 hours playback',
      weight: '250g'
    },
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      'https://images.unsplash.com/photo-1484704849701-fc2e96f4510c?w=400'
    ],
    vendorId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
    storeId: 'YikVrzpMtX34NeFvebD4',
    status: 'active',
    isActive: true
  },
  {
    name: 'MacBook Pro 16" M3 Max',
    description: 'Powerful laptop with M3 Max chip, stunning display, and all-day battery life.',
    price: 3499,
    currency: 'USD',
    category: 'electronics',
    brand: 'Apple',
    stockQuantity: 25,
    inStock: true,
    rating: 4.9,
    reviewCount: 780,
    features: [
      'M3 Max Chip',
      '16.2" Liquid Retina XDR Display',
      '22-hour Battery Life',
      '6-speaker Sound System',
      'Advanced Camera and Studio Mics'
    ],
    specifications: {
      display: '16.2" Liquid Retina XDR',
      chip: 'M3 Max (12-core CPU, 38-core GPU)',
      memory: '36GB Unified Memory',
      storage: '1TB SSD',
      battery: 'Up to 22 hours'
    },
    images: [
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400'
    ],
    vendorId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
    storeId: 'YikVrzpMtX34NeFvebD4',
    status: 'active',
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Dyson V15 Detect Absolute',
    description: 'Advanced cordless vacuum with laser dust detection and intelligent suction.',
    price: 749.99,
    currency: 'USD',
    category: 'home',
    brand: 'Dyson',
    stockQuantity: 60,
    inStock: true,
    rating: 4.7,
    reviewCount: 920,
    features: [
      'Laser Dust Detection',
      'Piezo Sensor',
      'LCD Screen',
      '60-minute Runtime',
      'HEPA Filtration'
    ],
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
    vendorId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
    storeId: 'YikVrzpMtX34NeFvebD4',
    status: 'active',
    isActive: true
  },
  {
    name: 'LEGO Creator Expert Taj Mahal',
    description: 'Detailed replica of the iconic Taj Mahal with over 5,900 pieces.',
    price: 449.99,
    currency: 'USD',
    category: 'toys',
    brand: 'LEGO',
    stockQuantity: 40,
    inStock: true,
    rating: 4.8,
    reviewCount: 450,
    features: [
      '5,923 Pieces',
      'Detailed Architecture',
      'Modular Design',
      'Display Stand',
      'Instruction Booklet'
    ],
    specifications: {
      pieces: '5,923',
      age: '18+',
      dimensions: '20" x 16" x 8"',
      weight: '7.5kg',
      difficulty: 'Expert'
    },
    images: [
      'https://images.unsplash.com/photo-1596474473697-f3f9b8154c9f?w=400',
      'https://images.unsplash.com/photo-1589927986094-99c473e7186c?w=400'
    ],
    vendorId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
    storeId: 'YikVrzpMtX34NeFvebD4',
    status: 'active',
    isActive: true
  },
  {
    name: 'Instant Pot Duo 7-in-1',
    description: 'Multi-cooker that pressure cooks, slow cooks, rice cooks, steams, sautés, and more.',
    price: 79.99,
    currency: 'USD',
    category: 'home',
    brand: 'Instant Pot',
    stockQuantity: 120,
    inStock: true,
    rating: 4.5,
    reviewCount: 3200,
    features: [
      '7-in-1 Functionality',
      '14 Smart Programs',
      'Stainless Steel Inner Pot',
      'Safety Features',
      'Easy-to-use Controls'
    ],
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
    vendorId: '4aqQlfFlNWXRBgGugyPVtV4YEn53',
    storeId: 'YikVrzpMtX34NeFvebD4',
    status: 'active',
    isActive: true
  }
];

async function seedProducts() {
  try {
    console.log('🌱 Starting product seeding...');
    
    const batch = db.batch();
    const productsRef = db.collection('products');
    
    for (const product of sampleProducts) {
      const productRef = productsRef.doc();
      const productData = {
        ...product,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        views: 0,
        featuredAt: product.isFeatured ? admin.firestore.FieldValue.serverTimestamp() : null
      };
      
      batch.set(productRef, productData);
      console.log(`✅ Prepared product: ${product.name}`);
    }
    
    await batch.commit();
    console.log(`🎉 Successfully seeded ${sampleProducts.length} products!`);
    
    // Verify seeding
    const snapshot = await db.collection('products').get();
    console.log(`📊 Total products in database: ${snapshot.size}`);
    
  } catch (error) {
    console.error('❌ Error seeding products:', error);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedProducts().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { seedProducts, sampleProducts };
