/**
 * Migration script to ensure all products have proper vendorId references
 * - Backfills missing vendorId for products that only have vendorEmail
 * - Ensures vendorEmail is set for products that only have vendorId
 * - Validates product-vendor relationships
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

async function backfillProductVendorIds() {
  console.log('🔄 Starting product vendorId backfill migration...');
  
  try {
    // Get all products
    const productsSnapshot = await db.collection('products').get();
    console.log(`📦 Found ${productsSnapshot.size} products`);
    
    // Get all users (vendors) for lookup
    const usersSnapshot = await db.collection('users').get();
    const usersMap = new Map();
    const usersByEmail = new Map();
    
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data();
      usersMap.set(userDoc.id, { id: userDoc.id, ...userData });
      if (userData.email) {
        usersByEmail.set(userData.email.toLowerCase(), { id: userDoc.id, ...userData });
      }
    });
    
    console.log(`👥 Found ${usersMap.size} users for vendor lookup`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let fixedCount = 0;
    
    // Process products in batches
    const batch = db.batch();
    let batchCount = 0;
    
    for (const productDoc of productsSnapshot.docs) {
      const product = productDoc.data();
      const productId = productDoc.id;
      let needsUpdate = false;
      const updates = {};
      
      try {
        // Case 1: Product has vendorId but no vendorEmail
        if (product.vendorId && !product.vendorEmail) {
          const vendor = usersMap.get(product.vendorId);
          if (vendor && vendor.email) {
            updates.vendorEmail = vendor.email;
            needsUpdate = true;
            fixedCount++;
            console.log(`  ✅ Product ${productId}: Added vendorEmail from vendorId`);
          }
        }
        
        // Case 2: Product has vendorEmail but no vendorId
        if (!product.vendorId && product.vendorEmail) {
          const vendor = usersByEmail.get(product.vendorEmail.toLowerCase());
          if (vendor) {
            updates.vendorId = vendor.id;
            if (!updates.vendorEmail) {
              updates.vendorEmail = vendor.email;
            }
            needsUpdate = true;
            fixedCount++;
            console.log(`  ✅ Product ${productId}: Added vendorId from vendorEmail`);
          } else {
            console.warn(`  ⚠️ Product ${productId}: vendorEmail "${product.vendorEmail}" not found in users`);
          }
        }
        
        // Case 3: Product has vendorId but vendor doesn't exist or email mismatch
        if (product.vendorId && product.vendorEmail) {
          const vendor = usersMap.get(product.vendorId);
          if (vendor) {
            // Ensure vendorEmail matches
            if (vendor.email && vendor.email.toLowerCase() !== product.vendorEmail.toLowerCase()) {
              updates.vendorEmail = vendor.email;
              needsUpdate = true;
              fixedCount++;
              console.log(`  ✅ Product ${productId}: Updated vendorEmail to match vendor record`);
            }
          } else {
            // vendorId doesn't exist, try to find by email
            const vendorByEmail = usersByEmail.get(product.vendorEmail.toLowerCase());
            if (vendorByEmail) {
              updates.vendorId = vendorByEmail.id;
              updates.vendorEmail = vendorByEmail.email;
              needsUpdate = true;
              fixedCount++;
              console.log(`  ✅ Product ${productId}: Fixed vendorId from vendorEmail (old vendorId invalid)`);
            } else {
              console.warn(`  ⚠️ Product ${productId}: vendorId "${product.vendorId}" not found and vendorEmail "${product.vendorEmail}" not found`);
            }
          }
        }
        
        // Case 4: Product has neither vendorId nor vendorEmail
        if (!product.vendorId && !product.vendorEmail) {
          console.error(`  ❌ Product ${productId}: Missing both vendorId and vendorEmail - cannot fix automatically`);
          errorCount++;
        }
        
        // Update product if needed
        if (needsUpdate) {
          updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          const productRef = db.collection('products').doc(productId);
          batch.update(productRef, updates);
          batchCount++;
          updatedCount++;
          
          // Firestore batch limit is 500
          if (batchCount >= 500) {
            await batch.commit();
            console.log(`  ✅ Committed batch of ${batchCount} updates`);
            batchCount = 0;
          }
        } else {
          skippedCount++;
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing product ${productId}:`, error);
        errorCount++;
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`  ✅ Committed final batch of ${batchCount} updates`);
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Updated: ${updatedCount} products`);
    console.log(`  ✅ Fixed: ${fixedCount} products (added missing vendorId or vendorEmail)`);
    console.log(`  ⏭️ Skipped: ${skippedCount} products (already correct)`);
    console.log(`  ❌ Errors: ${errorCount} products`);
    console.log(`\n🎉 Migration complete!`);
    
    // Validation: Check if all products now have vendorId
    console.log('\n🔍 Validation: Checking product-vendor relationships...');
    const validationSnapshot = await db.collection('products').get();
    let productsWithoutVendorId = 0;
    let productsWithoutVendorEmail = 0;
    let productsWithInvalidVendorId = 0;
    
    validationSnapshot.forEach(productDoc => {
      const product = productDoc.data();
      if (!product.vendorId) {
        productsWithoutVendorId++;
        console.warn(`  ⚠️ Product ${productDoc.id}: Missing vendorId`);
      }
      if (!product.vendorEmail) {
        productsWithoutVendorEmail++;
        console.warn(`  ⚠️ Product ${productDoc.id}: Missing vendorEmail`);
      }
      if (product.vendorId && !usersMap.has(product.vendorId)) {
        productsWithInvalidVendorId++;
        console.warn(`  ⚠️ Product ${productDoc.id}: vendorId "${product.vendorId}" does not exist in users collection`);
      }
    });
    
    console.log('\n📊 Validation Results:');
    console.log(`  ✅ Products with vendorId: ${validationSnapshot.size - productsWithoutVendorId}/${validationSnapshot.size}`);
    console.log(`  ✅ Products with vendorEmail: ${validationSnapshot.size - productsWithoutVendorEmail}/${validationSnapshot.size}`);
    console.log(`  ✅ Products with valid vendorId: ${validationSnapshot.size - productsWithInvalidVendorId}/${validationSnapshot.size}`);
    
    if (productsWithoutVendorId > 0 || productsWithoutVendorEmail > 0 || productsWithInvalidVendorId > 0) {
      console.log('\n⚠️ Some products still have missing or invalid vendor references. Manual review may be needed.');
    } else {
      console.log('\n✅ All products have valid vendor references!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
backfillProductVendorIds()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
