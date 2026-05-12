const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'ojawa-ecommerce'
});

const db = admin.firestore();

async function addMoreMockProducts() {
  try {
    console.log('Adding more mock products to vendor.mock@ojawa.test...');

    // Find the vendor account
    const vendorEmail = 'vendor.mock@ojawa.test';
    const userRecord = await admin.auth().getUserByEmail(vendorEmail);
    const vendorUid = userRecord.uid;

    // Get the store ID for this vendor
    const storeSnapshot = await db.collection('stores')
      .where('vendorId', '==', vendorUid)
      .limit(1)
      .get();

    if (storeSnapshot.empty) {
      console.error('No store found for vendor');
      return;
    }

    const storeId = storeSnapshot.docs[0].id;
    console.log('Found store:', storeId);

    // Additional mock products
    const additionalProducts = [
      {
        name: 'Wireless Bluetooth Speaker',
        price: 45000.00,
        currency: '₦ NGN',
        description: 'High-quality portable speaker with deep bass and long battery life.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
        brand: 'SoundWave',
        inStock: true,
        stock: 25,
        rating: 4.7,
        reviewCount: 89
      },
      {
        name: 'Smart Fitness Watch',
        price: 75000.00,
        currency: '₦ NGN',
        description: 'Advanced fitness tracking with heart rate monitor and GPS.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
        brand: 'FitTech',
        inStock: true,
        stock: 18,
        rating: 4.9,
        reviewCount: 156
      },
      {
        name: 'Professional Camera Lens',
        price: 125000.00,
        currency: '₦ NGN',
        description: 'High-quality 50mm prime lens for professional photography.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400',
        brand: 'PhotoPro',
        inStock: true,
        stock: 8,
        rating: 4.8,
        reviewCount: 42
      },
      {
        name: 'Mechanical Gaming Keyboard',
        price: 35000.00,
        currency: '₦ NGN',
        description: 'RGB backlit mechanical keyboard with tactile switches.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400',
        brand: 'GameTech',
        inStock: true,
        stock: 30,
        rating: 4.6,
        reviewCount: 73
      },
      {
        name: 'Wireless Gaming Mouse',
        price: 25000.00,
        currency: '₦ NGN',
        description: 'High-precision gaming mouse with customizable RGB lighting.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
        brand: 'GameTech',
        inStock: true,
        stock: 40,
        rating: 4.5,
        reviewCount: 67
      },
      {
        name: 'Smart Home Hub',
        price: 65000.00,
        currency: '₦ NGN',
        description: 'Central control hub for all your smart home devices.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        brand: 'SmartHome',
        inStock: true,
        stock: 15,
        rating: 4.4,
        reviewCount: 34
      },
      {
        name: 'Portable Power Bank',
        price: 15000.00,
        currency: '₦ NGN',
        description: 'High-capacity power bank with fast charging capabilities.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1609592807900-0a8b0a2a0a0a?w=400',
        brand: 'PowerMax',
        inStock: true,
        stock: 50,
        rating: 4.3,
        reviewCount: 128
      },
      {
        name: 'Bluetooth Earbuds',
        price: 30000.00,
        currency: '₦ NGN',
        description: 'True wireless earbuds with noise cancellation and long battery life.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
        brand: 'SoundWave',
        inStock: true,
        stock: 35,
        rating: 4.6,
        reviewCount: 95
      },
      {
        name: 'Smart LED Strip Lights',
        price: 20000.00,
        currency: '₦ NGN',
        description: 'RGB LED strip lights with smartphone app control and music sync.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        brand: 'LightTech',
        inStock: true,
        stock: 60,
        rating: 4.2,
        reviewCount: 56
      },
      {
        name: 'USB-C Hub',
        price: 18000.00,
        currency: '₦ NGN',
        description: 'Multi-port USB-C hub with HDMI, USB 3.0, and SD card slots.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400',
        brand: 'ConnectPro',
        inStock: true,
        stock: 45,
        rating: 4.5,
        reviewCount: 78
      },
      {
        name: 'Wireless Charging Pad',
        price: 12000.00,
        currency: '₦ NGN',
        description: 'Fast wireless charging pad compatible with all Qi-enabled devices.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1609592807900-0a8b0a2a0a0a?w=400',
        brand: 'ChargeMax',
        inStock: true,
        stock: 55,
        rating: 4.4,
        reviewCount: 63
      },
      {
        name: 'Smart Doorbell Camera',
        price: 85000.00,
        currency: '₦ NGN',
        description: 'WiFi-enabled doorbell with HD camera and two-way audio.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        brand: 'SecureHome',
        inStock: true,
        stock: 12,
        rating: 4.7,
        reviewCount: 29
      }
    ];

    // Add products to the vendor's store
    for (const product of additionalProducts) {
      const data = {
        ...product,
        vendorId: vendorUid,
        storeId: storeId,
        images: product.image ? [product.image] : [],
        inStock: (product.stock || 0) > 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        status: 'active'
      };
      delete data.image;

      // Check if product already exists
      const existing = await db.collection('products')
        .where('vendorId', '==', vendorUid)
        .where('name', '==', data.name)
        .limit(1)
        .get();

      if (existing.empty) {
        await db.collection('products').add(data);
        console.log(`Added product: ${product.name}`);
      } else {
        console.log(`Product already exists: ${product.name}`);
      }
    }

    console.log(`\n✅ Successfully added ${additionalProducts.length} new mock products!`);
    console.log('Vendor email: vendor.mock@ojawa.test');
    console.log('Store ID:', storeId);

  } catch (error) {
    console.error('Error adding mock products:', error);
  } finally {
    process.exit();
  }
}

addMoreMockProducts();
