const { admin, db } = require('./adminInit');

async function fixProductData() {
  try {
    console.log('Starting product data fix...');

    // Get all products
    const productsSnapshot = await db.collection('products').get();
    
    console.log(`Found ${productsSnapshot.docs.length} products to fix`);

    const batch = db.batch();
    let updateCount = 0;

    productsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const updates = {};

      // Fix currency format if missing
      if (!data.currency) {
        updates.currency = '₦ NGN';
      }

      // Fix stock field if using stockQuantity
      if (data.stockQuantity && !data.stock) {
        updates.stock = data.stockQuantity;
      }

      // Fix images field if using single image
      if (data.image && (!data.images || data.images.length === 0)) {
        updates.images = [data.image];
      }

      // Add vendorName if missing
      if (!data.vendorName) {
        updates.vendorName = 'Sample Vendor';
      }

      // Add vendorId if missing
      if (!data.vendorId) {
        updates.vendorId = 'sample-vendor-id';
      }

      // Update timestamp
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      // Apply updates if there are any
      if (Object.keys(updates).length > 0) {
        batch.update(doc.ref, updates);
        updateCount++;
        console.log(`Updating product: ${data.name}`);
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updateCount} products`);
    } else {
      console.log('No products needed updating');
    }

    console.log('Product data fix completed successfully!');
  } catch (error) {
    console.error('Error fixing product data:', error);
  } finally {
    process.exit();
  }
}

fixProductData();
