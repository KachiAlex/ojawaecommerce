/**
 * Migration script to backfill storeId for existing products
 * Links products to their vendor's stores based on vendorId
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function backfillProductStoreIds() {
  console.log('🔄 Starting product storeId backfill migration...');
  
  try {
    // Get all products
    const productsSnapshot = await db.collection('products').get();
    console.log(`📦 Found ${productsSnapshot.size} products`);
    
    // Group products by vendorId
    const productsByVendor = {};
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      const vendorId = product.vendorId;
      if (vendorId) {
        if (!productsByVendor[vendorId]) {
          productsByVendor[vendorId] = [];
        }
        productsByVendor[vendorId].push({ id: doc.id, ...product });
      }
    });
    
    console.log(`👥 Found ${Object.keys(productsByVendor).length} vendors with products`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // For each vendor, get their store and update products
    for (const [vendorId, products] of Object.entries(productsByVendor)) {
      try {
        // Get vendor's stores
        const storesSnapshot = await db.collection('stores')
          .where('vendorId', '==', vendorId)
          .limit(1)
          .get();
        
        if (storesSnapshot.empty) {
          console.log(`⚠️ No store found for vendor ${vendorId}, skipping ${products.length} products`);
          skippedCount += products.length;
          continue;
        }
        
        const store = storesSnapshot.docs[0];
        const storeId = store.id; // Use document ID as storeId
        
        console.log(`🏪 Vendor ${vendorId} has store: ${storeId}`);
        
        // Update all products for this vendor
        const batch = db.batch();
        let batchCount = 0;
        
        for (const product of products) {
          // Skip if already has storeId
          if (product.storeId) {
            console.log(`  ✅ Product ${product.id} already has storeId: ${product.storeId}`);
            skippedCount++;
            continue;
          }
          
          // Update product with storeId
          const productRef = db.collection('products').doc(product.id);
          batch.update(productRef, {
            storeId: storeId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          batchCount++;
          updatedCount++;
          
          // Firestore batch limit is 500
          if (batchCount >= 500) {
            await batch.commit();
            console.log(`  ✅ Updated batch of ${batchCount} products`);
            batchCount = 0;
          }
        }
        
        // Commit remaining updates
        if (batchCount > 0) {
          await batch.commit();
          console.log(`  ✅ Updated ${batchCount} products for vendor ${vendorId}`);
        }
        
      } catch (vendorError) {
        console.error(`❌ Error processing vendor ${vendorId}:`, vendorError);
        errorCount += products.length;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Updated: ${updatedCount} products`);
    console.log(`  ⏭️ Skipped: ${skippedCount} products (already had storeId or no store)`);
    console.log(`  ❌ Errors: ${errorCount} products`);
    console.log(`\n🎉 Migration complete!`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
backfillProductStoreIds()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
