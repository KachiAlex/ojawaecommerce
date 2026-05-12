const https = require('https');

async function verifyProductAssignments() {
  try {
    console.log('Verifying Product Vendor Assignments...');
    
    // Get all products
    console.log('\n1. Fetching all products...');
    const productsResponse = await makeRequest('/api/products', 'GET');
    
    if (!productsResponse.success) {
      console.log('Failed to get products:', productsResponse.error);
      return;
    }
    
    const products = productsResponse.data.products;
    console.log(`Found ${products.length} total products`);
    
    // Analyze vendor assignments
    const vendorStats = {};
    let totalAssigned = 0;
    let totalUnassigned = 0;
    
    console.log('\n2. Analyzing vendor assignments...');
    
    products.forEach((product, index) => {
      const vendorId = product.vendorId;
      const vendorName = product.vendorName;
      const vendorEmail = product.vendorEmail;
      
      if (vendorId && vendorId !== 'No ID') {
        totalAssigned++;
        
        if (!vendorStats[vendorId]) {
          vendorStats[vendorId] = {
            name: vendorName || 'Unknown',
            email: vendorEmail || 'No email',
            count: 0,
            products: []
          };
        }
        
        vendorStats[vendorId].count++;
        vendorStats[vendorId].products.push({
          name: product.name,
          price: product.price,
          category: product.category
        });
      } else {
        totalUnassigned++;
      }
      
      // Show first 10 products with details
      if (index < 10) {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   Price: $${product.price}`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Vendor ID: ${vendorId || 'Not assigned'}`);
        console.log(`   Vendor Name: ${vendorName || 'Not assigned'}`);
        console.log(`   Vendor Email: ${vendorEmail || 'Not assigned'}`);
        console.log(`   Stock: ${product.stockQuantity || 'Not specified'}`);
        console.log(`   Images: ${product.images?.length || 0} images`);
        console.log(`   Status: ${vendorId ? 'ASSIGNED' : 'UNASSIGNED'}`);
      }
    });
    
    // Show vendor statistics
    console.log('\n3. Vendor Assignment Summary:');
    console.log(`Total Products: ${products.length}`);
    console.log(`Assigned Products: ${totalAssigned}`);
    console.log(`Unassigned Products: ${totalUnassigned}`);
    console.log(`Assignment Rate: ${((totalAssigned / products.length) * 100).toFixed(1)}%`);
    
    console.log('\n4. Vendor Breakdown:');
    Object.entries(vendorStats).forEach(([vendorId, stats]) => {
      console.log(`\nVendor ID: ${vendorId}`);
      console.log(`  Name: ${stats.name}`);
      console.log(`  Email: ${stats.email}`);
      console.log(`  Products: ${stats.count}`);
      console.log(`  Product List: ${stats.products.map(p => p.name).join(', ')}`);
    });
    
    // Check for mock vendor specifically
    console.log('\n5. Mock Vendor Analysis:');
    const mockVendorId = '4aqQlfFlNWXRBgGugyPVtV4YEn53';
    const mockVendorStats = vendorStats[mockVendorId];
    
    if (mockVendorStats) {
      console.log(`Mock Vendor Found: ${mockVendorStats.count} products`);
      console.log(`Vendor Name: ${mockVendorStats.name}`);
      console.log(`Vendor Email: ${mockVendorStats.email}`);
      
      if (mockVendorStats.email === 'No email' || mockVendorStats.name === 'Unknown') {
        console.log('WARNING: Mock vendor has incomplete information');
      } else {
        console.log('SUCCESS: Mock vendor has complete information');
      }
    } else {
      console.log('Mock vendor not found in assignments');
    }
    
    // Test product data completeness
    console.log('\n6. Product Data Quality Check:');
    let completeProducts = 0;
    let incompleteProducts = 0;
    
    products.forEach(product => {
      const hasName = product.name && product.name.trim() !== '';
      const hasPrice = product.price && product.price > 0;
      const hasCategory = product.category && product.category.trim() !== '';
      const hasDescription = product.description && product.description.trim() !== '';
      const hasImages = product.images && product.images.length > 0;
      const hasStock = product.stockQuantity !== undefined;
      
      if (hasName && hasPrice && hasCategory && hasDescription && hasImages && hasStock) {
        completeProducts++;
      } else {
        incompleteProducts++;
      }
    });
    
    console.log(`Complete Products: ${completeProducts}`);
    console.log(`Incomplete Products: ${incompleteProducts}`);
    console.log(`Data Quality: ${((completeProducts / products.length) * 100).toFixed(1)}%`);
    
    // Final assessment
    console.log('\n7. Final Assessment:');
    
    if (totalAssigned === products.length && completeProducts === products.length) {
      console.log('EXCELLENT: All products are properly assigned and complete');
    } else if (totalAssigned > 0 && completeProducts > 0) {
      console.log('GOOD: Most products are assigned and complete');
      console.log('RECOMMENDATION: Fix remaining unassigned/incomplete products');
    } else {
      console.log('POOR: Many products are unassigned or incomplete');
      console.log('RECOMMENDATION: Complete product vendor assignments');
    }
    
    // Check if products operate as real data
    console.log('\n8. Real Data Verification:');
    
    const sampleProduct = products[0];
    if (sampleProduct) {
      console.log('Sample Product Analysis:');
      console.log(`  Has Real Name: ${sampleProduct.name?.length > 0}`);
      console.log(`  Has Real Price: ${sampleProduct.price > 0}`);
      console.log(`  Has Real Category: ${sampleProduct.category?.length > 0}`);
      console.log(`  Has Real Description: ${sampleProduct.description?.length > 20}`);
      console.log(`  Has Real Images: ${sampleProduct.images?.length > 0}`);
      console.log(`  Has Real Stock: ${sampleProduct.stockQuantity >= 0}`);
      console.log(`  Has Real Vendor: ${!!sampleProduct.vendorId}`);
      
      const isRealData = sampleProduct.name?.length > 0 && 
                        sampleProduct.price > 0 && 
                        sampleProduct.category?.length > 0 && 
                        sampleProduct.description?.length > 20 && 
                        sampleProduct.images?.length > 0 && 
                        sampleProduct.stockQuantity >= 0 && 
                        !!sampleProduct.vendorId;
      
      console.log(`  CONCLUSION: ${isRealData ? 'REAL DATA' : 'MOCK DATA'}`);
    }
    
  } catch (error) {
    console.error('Verification failed:', error.message);
  }
}

function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ojawaecommerce.onrender.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (parseError) {
          console.error('Parse error:', parseError.message);
          resolve({ success: false, error: 'Parse error', raw: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

verifyProductAssignments();
