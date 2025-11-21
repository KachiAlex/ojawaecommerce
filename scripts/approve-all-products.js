const { admin, db } = require('./adminInit');

async function approveAllProducts() {
  try {
    console.log('Fetching all pending products...');
    
    // Get all products with pending status
    const pendingSnapshot = await db.collection('products')
      .where('status', '==', 'pending')
      .get();
    
    console.log(`Found ${pendingSnapshot.size} pending products`);
    
    // Also get products without status field (old products)
    const noStatusSnapshot = await db.collection('products')
      .get();
    
    let approvedCount = 0;
    const batch = db.batch();
    
    noStatusSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.status || data.status === 'pending') {
        batch.update(doc.ref, { 
          status: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        approvedCount++;
        console.log(`Approving: ${data.name}`);
      }
    });
    
    await batch.commit();
    
    console.log(`✅ Successfully approved ${approvedCount} products!`);
    console.log('All products are now active and visible to buyers.');
    
  } catch (error) {
    console.error('Error approving products:', error);
  } finally {
    process.exit();
  }
}

approveAllProducts();

