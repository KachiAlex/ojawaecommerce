const { admin, db } = require('./scripts/adminInit');

async function fixProductVendorInfo() {
  try {
    console.log('Fixing product vendor information...');
    
    // Get products that have vendorId but missing vendor details
    const products = await db.collection('products')
      .where('vendorId', '==', '4aqQlfFlNWXRBgGugyPVtV4YEn53')
      .limit(10)
      .get();
    
    console.log(`Found ${products.size} products with mock vendor ID`);
    
    if (products.empty) {
      console.log('No products found with mock vendor ID');
      return;
    }
    
    // Mock vendor information
    const vendorInfo = {
      vendorName: 'Ojawa Mock Vendor',
      vendorEmail: 'vendor.mock@ojawa.test',
      vendorLocation: '12 Marina, Lagos Island, Lagos, NG',
      vendorPhone: '+2348012345678',
      vendorVerified: true,
      vendorRating: 4.5,
      vendorStoreName: 'Ojawa Mock Store'
    };
    
    // Update products in batches
    const batch = db.batch();
    let updatedCount = 0;
    
    products.forEach(productDoc => {
      const productData = productDoc.data();
      
      console.log(`Updating: ${productData.name}`);
      
      batch.update(productDoc.ref, {
        ...vendorInfo,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      updatedCount++;
    });
    
    await batch.commit();
    
    console.log(`\nUpdated ${updatedCount} products with vendor information!`);
    
    // Update vendor profile to ensure it has the store info
    const vendorDoc = await db.collection('users').doc('4aqQlfFlNWXRBgGugyPVtV4YEn53').get();
    
    if (vendorDoc.exists) {
      const vendorData = vendorDoc.data();
      
      // Ensure vendor profile has store info
      await db.collection('users').doc('4aqQlfFlNWXRBgGugyPVtV4YEn53').update({
        vendorProfile: {
          ...vendorData.vendorProfile,
          storeName: 'Ojawa Mock Store',
          businessAddress: '12 Marina, Lagos Island, Lagos, NG',
          businessPhone: '+2348012345678',
          verificationStatus: 'verified'
        },
        address: '12 Marina, Lagos Island, Lagos, NG',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Updated vendor profile with store information');
    }
    
    console.log('\nFix completed!');
    console.log('Products now have proper vendor information');
    console.log('Cart should now show vendor address correctly');
    
  } catch (error) {
    console.error('Error fixing product vendor info:', error);
  }
}

fixProductVendorInfo();
