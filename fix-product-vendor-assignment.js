const { admin, db } = require('./scripts/adminInit');

async function fixProductVendorAssignment() {
  try {
    console.log('🔧 Fixing product vendor assignments...');
    
    // Get the mock vendor
    const vendorUsers = await db.collection('users')
      .where('email', '==', 'vendor.mock@ojawa.test')
      .get();
    
    if (vendorUsers.empty) {
      console.log('❌ Mock vendor not found');
      return;
    }
    
    const vendorDoc = vendorUsers.docs[0];
    const vendorId = vendorDoc.id;
    const vendorData = vendorDoc.data();
    
    console.log('✅ Found mock vendor:', vendorId);
    console.log('📋 Vendor data:', {
      displayName: vendorData.displayName,
      storeName: vendorData.vendorProfile?.storeName,
      businessAddress: vendorData.vendorProfile?.businessAddress
    });
    
    // Get all products
    const products = await db.collection('products').get();
    console.log(`📦 Found ${products.size} products`);
    
    // Update products to assign to mock vendor
    const batch = db.batch();
    let updatedCount = 0;
    
    products.forEach(productDoc => {
      const productData = productDoc.data();
      
      // Only update products that don't have the correct vendor assignment
      if (!productData.vendorId || productData.vendorId !== vendorId) {
        console.log(`🔄 Updating product: ${productData.name}`);
        
        batch.update(productDoc.ref, {
          vendorId: vendorId,
          vendorName: vendorData.displayName || 'Ojawa Mock Vendor',
          vendorEmail: 'vendor.mock@ojawa.test',
          vendorLocation: vendorData.vendorProfile?.businessAddress || '12 Marina, Lagos Island, Lagos, NG',
          vendorPhone: vendorData.vendorProfile?.businessPhone || '+2348012345678',
          vendorVerified: true,
          vendorRating: 4.5,
          vendorStoreName: vendorData.vendorProfile?.storeName || 'Ojawa Mock Store',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ Updated ${updatedCount} products to mock vendor`);
    } else {
      console.log('ℹ️ All products already assigned to mock vendor');
    }
    
    // Get vendor's store and update product count
    const stores = await db.collection('stores')
      .where('vendorId', '==', vendorId)
      .get();
    
    if (!stores.empty) {
      const storeDoc = stores.docs[0];
      await storeDoc.ref.update({
        totalProducts: products.size,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Updated store product count');
    }
    
    console.log('\n🎉 Product vendor assignment fixed!');
    console.log('📧 Mock vendor: vendor.mock@ojawa.test');
    console.log('🔑 Password: Vendor@12345');
    console.log('🏪 Store: Ojawa Mock Store');
    console.log('📍 Address: 12 Marina, Lagos Island, Lagos, NG');
    console.log(`📦 Products: ${products.size} items assigned`);
    
  } catch (error) {
    console.error('❌ Error fixing product assignments:', error);
  }
}

fixProductVendorAssignment();
