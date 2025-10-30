const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const mockProducts = [
  {
    name: "Premium Wireless Headphones",
    description: "High-quality wireless headphones with noise cancellation and 30-hour battery life. Perfect for music lovers and professionals.",
    price: 299.99,
    category: "Electronics",
    subcategory: "Audio",
    brand: "SoundMax",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500"
    ],
    stock: 50,
    status: "approved",
    featured: true,
    tags: ["wireless", "headphones", "noise-cancellation", "premium"],
    specifications: {
      "Battery Life": "30 hours",
      "Connectivity": "Bluetooth 5.0",
      "Weight": "250g",
      "Color": "Black"
    }
  },
  {
    name: "Smart Fitness Watch",
    description: "Advanced fitness tracking watch with heart rate monitoring, GPS, and water resistance up to 50m.",
    price: 199.99,
    category: "Electronics",
    subcategory: "Wearables",
    brand: "FitTech",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
      "https://images.unsplash.com/photo-1544117519-31a4b719223d?w=500"
    ],
    stock: 75,
    status: "approved",
    featured: true,
    tags: ["fitness", "smartwatch", "health", "tracking"],
    specifications: {
      "Display": "1.4 inch AMOLED",
      "Battery": "7 days",
      "Water Resistance": "50m",
      "Sensors": "Heart rate, GPS, Accelerometer"
    }
  },
  {
    name: "Organic Coffee Beans",
    description: "Premium organic coffee beans from Ethiopia. Medium roast with notes of chocolate and citrus.",
    price: 24.99,
    category: "Food & Beverages",
    subcategory: "Coffee",
    brand: "Ethiopian Gold",
    images: [
      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500",
      "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=500"
    ],
    stock: 100,
    status: "approved",
    featured: true,
    tags: ["organic", "coffee", "ethiopian", "premium"],
    specifications: {
      "Origin": "Ethiopia",
      "Roast": "Medium",
      "Weight": "500g",
      "Certification": "Organic"
    }
  },
  {
    name: "Professional Camera Lens",
    description: "High-quality 50mm f/1.4 prime lens for professional photography. Perfect for portraits and low-light shooting.",
    price: 599.99,
    category: "Electronics",
    subcategory: "Photography",
    brand: "LensPro",
    images: [
      "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=500",
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500"
    ],
    stock: 25,
    status: "approved",
    featured: true,
    tags: ["camera", "lens", "photography", "professional"],
    specifications: {
      "Focal Length": "50mm",
      "Aperture": "f/1.4",
      "Mount": "Canon EF",
      "Weight": "815g"
    }
  },
  {
    name: "Luxury Leather Wallet",
    description: "Handcrafted genuine leather wallet with RFID blocking technology. Multiple card slots and cash compartments.",
    price: 89.99,
    category: "Fashion",
    subcategory: "Accessories",
    brand: "LeatherCraft",
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500"
    ],
    stock: 60,
    status: "approved",
    featured: false,
    tags: ["leather", "wallet", "rfid", "luxury"],
    specifications: {
      "Material": "Genuine Leather",
      "RFID Protection": "Yes",
      "Card Slots": "8",
      "Color": "Brown"
    }
  },
  {
    name: "Smart Home Security Camera",
    description: "Wireless security camera with 1080p HD recording, night vision, and mobile app control.",
    price: 149.99,
    category: "Electronics",
    subcategory: "Security",
    brand: "SecureHome",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500"
    ],
    stock: 40,
    status: "approved",
    featured: true,
    tags: ["security", "camera", "smart-home", "wireless"],
    specifications: {
      "Resolution": "1080p HD",
      "Night Vision": "Yes",
      "Storage": "Cloud & Local",
      "Connectivity": "WiFi"
    }
  },
  {
    name: "Artisan Ceramic Dinner Set",
    description: "Beautiful handcrafted ceramic dinner set for 4 people. Microwave and dishwasher safe.",
    price: 129.99,
    category: "Home & Garden",
    subcategory: "Kitchenware",
    brand: "CeramicArt",
    images: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500",
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500"
    ],
    stock: 30,
    status: "approved",
    featured: false,
    tags: ["ceramic", "dinner-set", "handcrafted", "kitchen"],
    specifications: {
      "Pieces": "16 pieces",
      "Material": "Ceramic",
      "Microwave Safe": "Yes",
      "Dishwasher Safe": "Yes"
    }
  },
  {
    name: "Premium Yoga Mat",
    description: "Non-slip yoga mat with extra cushioning. Eco-friendly materials and easy to clean.",
    price: 49.99,
    category: "Sports & Fitness",
    subcategory: "Yoga",
    brand: "ZenFit",
    images: [
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500",
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500"
    ],
    stock: 80,
    status: "approved",
    featured: true,
    tags: ["yoga", "mat", "eco-friendly", "fitness"],
    specifications: {
      "Thickness": "6mm",
      "Material": "TPE",
      "Size": "72 x 24 inches",
      "Weight": "2.5 lbs"
    }
  },
  {
    name: "Gourmet Chocolate Box",
    description: "Luxury assorted chocolate box with 24 handcrafted chocolates. Perfect for gifting.",
    price: 39.99,
    category: "Food & Beverages",
    subcategory: "Confectionery",
    brand: "ChocoLux",
    images: [
      "https://images.unsplash.com/photo-1511381939415-e44015466834?w=500",
      "https://images.unsplash.com/photo-1511381939415-e44015466834?w=500"
    ],
    stock: 50,
    status: "approved",
    featured: false,
    tags: ["chocolate", "gourmet", "gift", "luxury"],
    specifications: {
      "Pieces": "24 chocolates",
      "Weight": "400g",
      "Ingredients": "Premium cocoa",
      "Packaging": "Gift box"
    }
  },
  {
    name: "Wireless Phone Charger",
    description: "Fast wireless charging pad compatible with all Qi-enabled devices. LED indicator and safety features.",
    price: 34.99,
    category: "Electronics",
    subcategory: "Accessories",
    brand: "ChargeMax",
    images: [
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500",
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500"
    ],
    stock: 90,
    status: "approved",
    featured: true,
    tags: ["wireless", "charger", "phone", "fast-charging"],
    specifications: {
      "Power": "15W",
      "Compatibility": "Qi-enabled devices",
      "LED Indicator": "Yes",
      "Safety": "Overcharge protection"
    }
  }
];

async function addMockProducts() {
  try {
    console.log('🚀 Adding mock products to vendor.mock@ojawa.test...');
    
    // Get the vendor ID for vendor.mock@ojawa.test
    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', 'vendor.mock@ojawa.test').get();
    
    if (userSnapshot.empty) {
      console.error('❌ Vendor user not found');
      return;
    }
    
    const vendorDoc = userSnapshot.docs[0];
    const vendorId = vendorDoc.id;
    console.log('✅ Found vendor:', vendorId);
    
    // Add products to the database
    const productsRef = db.collection('products');
    const batch = db.batch();
    
    for (const product of mockProducts) {
      const productRef = productsRef.doc();
      const productData = {
        ...product,
        vendorId: vendorId,
        vendorEmail: 'vendor.mock@ojawa.test',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        searchKeywords: [
          product.name.toLowerCase(),
          product.category.toLowerCase(),
          product.brand.toLowerCase(),
          ...product.tags
        ]
      };
      
      batch.set(productRef, productData);
    }
    
    await batch.commit();
    console.log('✅ Successfully added 10 mock products!');
    
    // Update store product count
    const storesRef = db.collection('stores');
    const storeSnapshot = await storesRef.where('vendorId', '==', vendorId).get();
    
    if (!storeSnapshot.empty) {
      console.log('⚠️ No store found for vendor');
    } else {
      const storeDoc = storeSnapshot.docs[0];
      const currentCount = storeDoc.data().totalProducts || 0;
      await storeDoc.ref.update({
        totalProducts: currentCount + mockProducts.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Updated store product count');
    }
    
  } catch (error) {
    console.error('❌ Error adding mock products:', error);
  } finally {
    process.exit(0);
  }
}

addMockProducts();
