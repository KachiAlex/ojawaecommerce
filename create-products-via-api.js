const https = require('https');

async function createProductsViaAPI() {
  try {
    console.log('🛒 Creating products via Render API for mock vendor...');
    
    // First login as mock vendor to get token
    const loginData = JSON.stringify({
      email: 'vendor.mock@ojawa.test',
      password: 'Vendor@12345'
    });
    
    const loginOptions = {
      hostname: 'ojawaecommerce.onrender.com',
      port: 443,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    let vendorToken;
    
    const loginReq = https.request(loginOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success) {
            vendorToken = response.data.token;
            console.log('✅ Vendor login successful!');
            console.log('Token:', vendorToken.substring(0, 50) + '...');
            
            // Create products
            createProducts(vendorToken);
          } else {
            console.log('❌ Vendor login failed:', response.error);
          }
        } catch (parseError) {
          console.error('Failed to parse login response:', parseError.message);
        }
      });
    });
    
    loginReq.on('error', (error) => {
      console.error('Login request failed:', error.message);
    });
    
    loginReq.write(loginData);
    loginReq.end();
    
  } catch (error) {
    console.error('Setup failed:', error.message);
  }
}

function createProducts(vendorToken) {
  const products = [
    {
      name: 'Premium Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life. Perfect for music lovers and professionals.',
      price: 299.99,
      category: 'Electronics',
      subcategory: 'Audio',
      brand: 'SoundMax',
      stockQuantity: 50,
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500'
      ],
      tags: ['wireless', 'headphones', 'noise-cancellation', 'premium']
    },
    {
      name: 'Smart Fitness Watch',
      description: 'Advanced fitness tracking watch with heart rate monitoring, GPS, and water resistance up to 50m.',
      price: 199.99,
      category: 'Electronics',
      subcategory: 'Wearables',
      brand: 'FitTech',
      stockQuantity: 75,
      images: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=500'
      ],
      tags: ['fitness', 'smartwatch', 'health', 'tracking']
    },
    {
      name: 'Organic Coffee Beans',
      description: 'Premium organic coffee beans from Ethiopia. Medium roast with notes of chocolate and citrus.',
      price: 24.99,
      category: 'Food & Beverages',
      subcategory: 'Coffee',
      brand: 'Ethiopian Gold',
      stockQuantity: 100,
      images: [
        'https://images.unsplash.com/photo-15590569120-52093fd79d69?w=500',
        'https://images.unsplash.com/photo-1447932925035-70b3ca3a06b6?w=500'
      ],
      tags: ['organic', 'coffee', 'ethiopian', 'premium']
    },
    {
      name: 'Professional Camera Lens',
      description: 'High-quality 50mm f/1.4 prime lens for professional photography. Perfect for portraits and low-light shooting.',
      price: 599.99,
      category: 'Electronics',
      subcategory: 'Photography',
      brand: 'LensPro',
      stockQuantity: 25,
      images: [
        'https://images.unsplash.com/photo-1606983340126-99ab4b5d5b5b?w=500',
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500'
      ],
      tags: ['camera', 'lens', 'photography', 'professional']
    },
    {
      name: 'Luxury Leather Wallet',
      description: 'Handcrafted genuine leather wallet with RFID blocking technology. Multiple card slots and cash compartments.',
      price: 89.99,
      category: 'Fashion',
      subcategory: 'Accessories',
      brand: 'LeatherCraft',
      stockQuantity: 60,
      images: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500'
      ],
      tags: ['leather', 'wallet', 'rfid', 'luxury']
    }
  ];
  
  let createdCount = 0;
  
  products.forEach((product, index) => {
    setTimeout(() => {
      const productData = JSON.stringify(product);
      
      const productOptions = {
        hostname: 'ojawaecommerce.onrender.com',
        port: 443,
        path: '/api/products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vendorToken}`,
          'Content-Length': Buffer.byteLength(productData)
        }
      };
      
      const productReq = https.request(productOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.success || response._id) {
              createdCount++;
              console.log(`✅ Created product: ${product.name}`);
              
              if (createdCount === products.length) {
                console.log(`\n🎉 All ${products.length} products created for mock vendor!`);
                console.log('📧 Vendor: vendor.mock@ojawa.test');
                console.log('🔑 Password: Vendor@12345');
                console.log('🏪 Store: Ojawa Mock Store');
                console.log('📍 Address: 12 Marina, Lagos Island, Lagos, NG');
                console.log('📦 Products now properly assigned to mock vendor!');
              }
            } else {
              console.log(`❌ Failed to create product: ${product.name}`, response);
            }
          } catch (parseError) {
            console.error('Failed to parse product response:', parseError.message);
          }
        });
      });
      
      productReq.on('error', (error) => {
        console.error(`Product creation failed for ${product.name}:`, error.message);
      });
      
      productReq.write(productData);
      productReq.end();
    }, index * 1000); // Stagger requests to avoid rate limiting
  });
}

createProductsViaAPI();
