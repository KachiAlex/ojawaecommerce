// Test script for vendor product upload functionality
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test vendor authentication token (you'll need to get this from a real login)
const VENDOR_TOKEN = 'your_vendor_token_here';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Sample product data for upload
const sampleProductData = {
  name: 'Test Product - Designer Watch',
  description: 'Luxury designer watch with Swiss movement and premium materials. Features a sapphire crystal display and genuine leather strap.',
  price: 899.99,
  currency: 'USD',
  category: 'accessories',
  brand: 'Luxury Swiss',
  stockQuantity: 25,
  inStock: true,
  features: [
    'Swiss Movement',
    'Sapphire Crystal',
    'Genuine Leather Strap',
    'Water Resistant',
    '2-Year Warranty'
  ],
  specifications: {
    movement: 'Swiss Quartz',
    case: 'Stainless Steel 316L',
    display: 'Sapphire Crystal',
    strap: 'Genuine Leather',
    water_resistance: '50 meters',
    warranty: '2 Years International'
  }
};

async function testProductUpload() {
  try {
    console.log('🧪 Testing vendor product upload...');
    
    // Create form data
    const form = new FormData();
    
    // Add product fields
    Object.keys(sampleProductData).forEach(key => {
      if (typeof sampleProductData[key] === 'object') {
        form.append(key, JSON.stringify(sampleProductData[key]));
      } else {
        form.append(key, sampleProductData[key]);
      }
    });
    
    // Add mock images (in production, these would be actual image files)
    const mockImages = [
      { fieldname: 'images', filename: 'watch1.jpg', mimetype: 'image/jpeg' },
      { fieldname: 'images', filename: 'watch2.jpg', mimetype: 'image/jpeg' }
    ];
    
    // Create placeholder image files for testing
    mockImages.forEach((img, index) => {
      const placeholderPath = path.join(__dirname, `test_image_${index}.jpg`);
      if (!fs.existsSync(placeholderPath)) {
        // Create a small test image (1x1 pixel JPEG)
        const jpegHeader = Buffer.from([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
          0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
        ]);
        fs.writeFileSync(placeholderPath, jpegHeader);
      }
      form.append(img.fieldname, fs.createReadStream(placeholderPath), {
        filename: img.filename,
        contentType: img.mimetype
      });
    });
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VENDOR_TOKEN}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Product upload successful!');
      console.log('📦 Product details:', result.data);
    } else {
      console.error('❌ Product upload failed:', result);
    }
    
    // Cleanup test images
    mockImages.forEach((_, index) => {
      const placeholderPath = path.join(__dirname, `test_image_${index}.jpg`);
      if (fs.existsSync(placeholderPath)) {
        fs.unlinkSync(placeholderPath);
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing product upload:', error);
  }
}

async function testProductUploadDirect() {
  try {
    console.log('🧪 Testing direct product creation (without images)...');
    
    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VENDOR_TOKEN}`
      },
      body: JSON.stringify(sampleProductData)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Direct product creation successful!');
      console.log('📦 Product details:', result.data);
    } else {
      console.error('❌ Direct product creation failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Error testing direct product creation:', error);
  }
}

async function testVendorAuth() {
  try {
    console.log('🧪 Testing vendor authentication...');
    
    // Test login with sample vendor credentials
    const loginData = {
      email: 'vendor@ojawa.com', // You'll need to create this user first
      password: 'vendor123'
    };
    
    const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Vendor authentication successful!');
      console.log('🔑 Token:', result.token);
      console.log('👤 User info:', result.user);
      return result.token;
    } else {
      console.error('❌ Vendor authentication failed:', result);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error testing vendor auth:', error);
    return null;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting vendor upload functionality tests...\n');
  
  // Test 1: Authentication
  const token = await testVendorAuth();
  if (!token) {
    console.log('❌ Cannot proceed without valid authentication token');
    return;
  }
  
  // Update token for other tests
  VENDOR_TOKEN = token;
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Direct product creation (without images)
  await testProductUploadDirect();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Product upload with images
  await testProductUpload();
  
  console.log('\n🎉 All tests completed!');
}

// Instructions for running this script
function printInstructions() {
  console.log(`
📋 Vendor Upload Testing Instructions:

1. Make sure the Render backend is running:
   cd services/render-backend
   npm start

2. Create a vendor user first (you can use the signup endpoint):
   POST /api/auth/signup
   {
     "email": "vendor@ojawa.com",
     "password": "vendor123",
     "profile": {
       "role": "vendor",
       "storeName": "Test Store"
     }
   }

3. Update the VENDOR_TOKEN in this script or run with authentication test

4. Run the test script:
   node scripts/testVendorUpload.js

5. Check the results in the browser at:
   https://ojawaecommerce.onrender.com/api/products

🔧 Required Environment Variables:
   - API_BASE_URL (defaults to http://localhost:3001)
   - FIREBASE_PROJECT_ID (should be set in .env)

📁 Test Files:
   - This script creates temporary test images and cleans them up
   - Products are created in the test environment
   - Check the console output for success/failure details
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printInstructions();
  } else {
    runTests();
  }
}

module.exports = { 
  testProductUpload, 
  testProductUploadDirect, 
  testVendorAuth, 
  sampleProductData 
};
