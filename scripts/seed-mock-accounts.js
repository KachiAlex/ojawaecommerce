const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ojawa-ecommerce'
});

const db = admin.firestore();

async function ensureUser(authData, profileData) {
  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(authData.email);
    } catch (_) {
      userRecord = await admin.auth().createUser({
        email: authData.email,
        password: authData.password,
        displayName: profileData.displayName,
        emailVerified: true
      });
    }

    const uid = userRecord.uid;
    await db.collection('users').doc(uid).set(
      {
        uid,
        email: authData.email,
        displayName: profileData.displayName,
        phone: profileData.phone || '',
        address: profileData.address || '',
        role: profileData.role || 'buyer',
        isVendor: !!profileData.isVendor,
        isLogisticsPartner: !!profileData.isLogisticsPartner,
        isAdmin: !!profileData.isAdmin,
        vendorProfile: profileData.vendorProfile || null,
        logisticsProfile: profileData.logisticsProfile || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return uid;
  } catch (err) {
    console.error('ensureUser error', err);
    throw err;
  }
}

async function createStoreForVendor(vendorId, store) {
  const storeDoc = await db.collection('stores').add({
    vendorId,
    name: store.name,
    description: store.description,
    category: store.category || 'general',
    logo: store.logo || null,
    banner: store.banner || null,
    contactInfo: store.contactInfo || {},
    settings: { isPublic: true, allowReviews: true, showContactInfo: true, ...(store.settings || {}) },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    isActive: true,
    rating: 0,
    reviewCount: 0
  });
  return storeDoc.id;
}

async function createProductsForVendor(vendorId, storeId, products) {
  for (const p of products) {
    const data = {
      ...p,
      vendorId,
      storeId,
      images: p.image ? [p.image] : p.images || [],
      inStock: (p.stock || p.stockQuantity || 0) > 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };
    delete data.image;
    // Avoid duplicate by name + vendor
    const existing = await db.collection('products')
      .where('vendorId', '==', vendorId)
      .where('name', '==', data.name)
      .limit(1)
      .get();
    if (existing.empty) {
      await db.collection('products').add(data);
    }
  }
}

async function ensureLogisticsCompany(authData, company) {
  const uid = await ensureUser(authData, {
    displayName: company.contact?.name || company.name,
    role: 'logistics',
    isLogisticsPartner: true,
    logisticsProfile: {
      companyName: company.name,
      businessAddress: company.address,
      phone: company.contact?.phone || '',
      verificationStatus: 'verified'
    }
  });

  // Create or update logistics company document
  const docRef = db.collection('logistics_companies').doc(uid);
  await docRef.set(
    {
      name: company.name,
      ownerUserId: uid,
      status: 'active',
      address: company.address,
      serviceAreas: company.serviceAreas || ['Lagos', 'Abuja', 'Port Harcourt', 'Uyo', 'Aba', 'Enugu', 'Kano'],
      pricing: company.pricing || { baseFee: 1800, perKm: 110, perKg: 70 },
      routes: company.routes || [
        // Intracity Lagos
        { from: 'Ikeja', to: 'Lekki', price: 3000 },
        { from: 'Yaba', to: 'Victoria Island', price: 2800 },
        { from: 'Surulere', to: 'Ajah', price: 3200 },
        // Intercity
        { from: 'Lagos', to: 'Abuja', price: 15000 },
        { from: 'Lagos', to: 'Port Harcourt', price: 12000 },
        { from: 'Lagos', to: 'Uyo', price: 11000 },
        { from: 'Lagos', to: 'Aba', price: 10000 },
        { from: 'Lagos', to: 'Enugu', price: 9000 },
        { from: 'Lagos', to: 'Kano', price: 18000 },
        { from: 'Abuja', to: 'Kano', price: 9000 },
        { from: 'Abuja', to: 'Enugu', price: 10000 },
        { from: 'Port Harcourt', to: 'Enugu', price: 7000 }
      ],
      rating: 4.5,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return uid;
}

async function main() {
  try {
    console.log('Seeding mock vendor and logistics accounts...');

    // 1) Mock vendor account
    const vendorEmail = 'vendor.mock@ojawa.test';
    const vendorPassword = 'Vendor@12345';

    const vendorUid = await ensureUser(
      { email: vendorEmail, password: vendorPassword },
      {
        displayName: 'Ojawa Mock Vendor',
        role: 'vendor',
        isVendor: true,
        vendorProfile: {
          storeName: 'Ojawa Mock Store',
          storeDescription: 'Demo products for testing',
          businessAddress: '12 Marina, Lagos Island, Lagos, NG',
          businessPhone: '+2348012345678',
          verificationStatus: 'verified'
        },
        address: '12 Marina, Lagos Island, Lagos, NG'
      }
    );

    // 1a) Create a store for the vendor
    const storeId = await createStoreForVendor(vendorUid, {
      name: 'Ojawa Mock Store',
      description: 'A demo store with sample products',
      category: 'electronics',
      contactInfo: { email: vendorEmail, phone: '+2348012345678', address: '12 Marina, Lagos Island, Lagos, NG' }
    });

    // 1b) Create products for vendor
    await createProductsForVendor(vendorUid, storeId, [
      {
        name: 'Demo Smartphone X',
        price: 199999.99,
        currency: '₦ NGN',
        description: 'A powerful demo smartphone for testing.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
        brand: 'DemoBrand',
        inStock: true,
        stock: 20,
        rating: 4.6,
        reviewCount: 50
      },
      {
        name: 'Demo Laptop Pro',
        price: 499999.99,
        currency: '₦ NGN',
        description: 'High-end demo laptop for testing.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
        brand: 'DemoBrand',
        inStock: true,
        stockQuantity: 10,
        rating: 4.8,
        reviewCount: 25
      },
      {
        name: 'Noise Cancelling Headphones',
        price: 89999.99,
        currency: '₦ NGN',
        description: 'Over-ear wireless headphones with ANC.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1518443895914-8e0b0ed2865c?w=400',
        brand: 'QuietSound',
        inStock: true,
        stock: 35
      },
      {
        name: '4K Smart TV 55"',
        price: 299999.99,
        currency: '₦ NGN',
        description: '55-inch UHD Smart TV with HDR.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1583225365940-9b5405a1efd8?w=400',
        brand: 'ViewMax',
        inStock: true,
        stock: 12
      },
      {
        name: 'Gaming Console Z',
        price: 349999.99,
        currency: '₦ NGN',
        description: 'Next-gen gaming console with 1TB SSD.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1605901309584-818e25960a8b?w=400',
        brand: 'PlayTime',
        inStock: true,
        stock: 18
      },
      {
        name: 'Bluetooth Speaker Mini',
        price: 19999.99,
        currency: '₦ NGN',
        description: 'Portable waterproof Bluetooth speaker.',
        category: 'electronics',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
        brand: 'BoomBox',
        inStock: true,
        stock: 60
      }
    ]);

    // 2) Mock logistics account and company
    const logisticsEmail = 'logistics.mock@ojawa.test';
    const logisticsPassword = 'Logistics@12345';
    const logisticsUid = await ensureLogisticsCompany(
      { email: logisticsEmail, password: logisticsPassword },
      {
        name: 'Ojawa Mock Logistics',
        address: '1 Airport Road, Ikeja, Lagos, NG',
        contact: { name: 'Mock Dispatcher', phone: '+2348098765432' },
        pricing: { baseFee: 1800, perKm: 110, perKg: 70 },
        routes: [
          { from: 'Ikeja', to: 'Lekki', price: 3000 },
          { from: 'Yaba', to: 'Victoria Island', price: 2800 },
          { from: 'Surulere', to: 'Ajah', price: 3200 },
          { from: 'Lagos', to: 'Abuja', price: 15000 },
          { from: 'Lagos', to: 'Port Harcourt', price: 12000 },
          { from: 'Lagos', to: 'Uyo', price: 11000 },
          { from: 'Lagos', to: 'Aba', price: 10000 },
          { from: 'Lagos', to: 'Enugu', price: 9000 },
          { from: 'Lagos', to: 'Kano', price: 18000 }
        ]
      }
    );

    console.log('Mock accounts seeded successfully.');
    console.log('Vendor login:', vendorEmail, vendorPassword);
    console.log('Logistics login:', logisticsEmail, logisticsPassword);
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit();
  }
}

main();


