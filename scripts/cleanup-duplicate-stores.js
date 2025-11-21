const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

const db = admin.firestore();

async function cleanupDuplicateStores() {
  try {
    console.log('🧹 Starting duplicate store cleanup...');
    
    // Get all stores
    const storesSnapshot = await db.collection('stores').get();
    const stores = [];
    
    storesSnapshot.forEach(doc => {
      stores.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 Found ${stores.length} total stores`);
    
    // Group stores by vendorId
    const storesByVendor = {};
    stores.forEach(store => {
      if (!storesByVendor[store.vendorId]) {
        storesByVendor[store.vendorId] = [];
      }
      storesByVendor[store.vendorId].push(store);
    });
    
    // Find vendors with multiple stores
    const vendorsWithDuplicates = Object.keys(storesByVendor).filter(
      vendorId => storesByVendor[vendorId].length > 1
    );
    
    console.log(`🔍 Found ${vendorsWithDuplicates.length} vendors with duplicate stores`);
    
    for (const vendorId of vendorsWithDuplicates) {
      const vendorStores = storesByVendor[vendorId];
      console.log(`\n👤 Vendor ${vendorId} has ${vendorStores.length} stores:`);
      
      // Sort by creation date (keep the most recent)
      vendorStores.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB - dateA;
      });
      
      const keepStore = vendorStores[0]; // Most recent
      const duplicateStores = vendorStores.slice(1);
      
      console.log(`✅ Keeping store: ${keepStore.storeId} (${keepStore.name})`);
      
      for (const duplicate of duplicateStores) {
        console.log(`🗑️ Deleting duplicate: ${duplicate.storeId} (${duplicate.name})`);
        
        // Delete the duplicate store
        await db.collection('stores').doc(duplicate.id).delete();
        
        // Also delete any products associated with this store
        const productsSnapshot = await db.collection('products')
          .where('storeId', '==', duplicate.storeId)
          .get();
        
        if (!productsSnapshot.empty) {
          console.log(`  📦 Deleting ${productsSnapshot.size} products from duplicate store`);
      const batch = db.batch();
          productsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
      });
      await batch.commit();
        }
      }
    }
    
    console.log('\n✅ Duplicate store cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupDuplicateStores().then(() => {
  console.log('🏁 Cleanup script finished');
    process.exit(0);
}).catch(error => {
  console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
