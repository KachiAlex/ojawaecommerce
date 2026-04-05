// Frontend Product Display Test
console.log('🧪 Testing Frontend Product Display...\n');

// Test if the API fix is working
fetch('/api/products')
  .then(response => {
    console.log('📡 API Response Status:', response.status);
    return response.json();
  })
  .then(data => {
    if (data.success && data.data) {
      console.log('✅ Products loaded successfully!');
      console.log(`📊 Found ${data.data.products.length} products`);
      
      // Show first few products
      data.data.products.slice(0, 5).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} - $${product.price}`);
      });
      
      // Test product categories
      const categories = [...new Set(data.data.products.map(p => p.category))];
      console.log(`🏷️  Categories: ${categories.join(', ')}`);
      
      // Check for images
      const withImages = data.data.products.filter(p => p.images && p.images.length > 0);
      console.log(`🖼️  Products with images: ${withImages.length}/${data.data.products.length}`);
      
      console.log('\n🎉 Frontend should now display these products!');
      
    } else {
      console.log('❌ API response error:', data);
    }
  })
  .catch(error => {
    console.log('❌ API call failed:', error.message);
    
    // Try direct Render API as fallback
    console.log('\n🔄 Trying direct Render API...');
    fetch('https://ojawaecommerce.onrender.com/api/products')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('✅ Direct Render API works!');
          console.log(`📊 ${data.data.products.length} products available`);
        }
      })
      .catch(err => {
        console.log('❌ Even direct API failed:', err.message);
      });
  });

// Check if API fix script is loaded
if (window.fetch.toString().includes('renderUrl')) {
  console.log('✅ API Fix script is active');
} else {
  console.log('❌ API Fix script not detected');
}
