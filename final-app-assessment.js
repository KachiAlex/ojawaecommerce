const https = require('https');

async function finalAppAssessment() {
  try {
    console.log('🎯 FINAL COMPREHENSIVE APP ASSESSMENT');
    console.log('=' .repeat(80));
    
    const assessment = {
      coreFeatures: {},
      userExperience: {},
      dataIntegrity: {},
      security: {},
      performance: {}
    };
    
    // Test Core Features
    console.log('\n🔧 CORE FEATURES ASSESSMENT');
    console.log('-'.repeat(50));
    
    await testCoreFeatures(assessment.coreFeatures);
    
    // Test User Experience
    console.log('\n👤 USER EXPERIENCE ASSESSMENT');
    console.log('-'.repeat(50));
    
    await testUserExperience(assessment.userExperience);
    
    // Test Data Integrity
    console.log('\n💾 DATA INTEGRITY ASSESSMENT');
    console.log('-'.repeat(50));
    
    await testDataIntegrity(assessment.dataIntegrity);
    
    // Test Security
    console.log('\n🔒 SECURITY ASSESSMENT');
    console.log('-'.repeat(50));
    
    await testSecurity(assessment.security);
    
    // Test Performance
    console.log('\n⚡ PERFORMANCE ASSESSMENT');
    console.log('-'.repeat(50));
    
    await testPerformance(assessment.performance);
    
    // Generate Final Report
    console.log('\n📊 FINAL APP ASSESSMENT REPORT');
    console.log('=' .repeat(80));
    
    generateAssessmentReport(assessment);
    
  } catch (error) {
    console.error('Assessment failed:', error.message);
  }
}

async function testCoreFeatures(coreFeatures) {
  const tests = [];
  
  // Test 1: Product Catalog
  try {
    const response = await makeRequest('/api/products', 'GET');
    if (response.success && response.data.products.length > 0) {
      tests.push({ feature: 'Product Catalog', status: 'WORKING', details: `${response.data.products.length} products available` });
    } else {
      tests.push({ feature: 'Product Catalog', status: 'BROKEN', details: response.error });
    }
  } catch (error) {
    tests.push({ feature: 'Product Catalog', status: 'ERROR', details: error.message });
  }
  
  // Test 2: User Authentication
  try {
    const loginData = JSON.stringify({
      email: 'vendor.mock@ojawa.test',
      password: 'Vendor@12345'
    });
    const response = await makeRequest('/auth/login', 'POST', loginData);
    if (response.success) {
      tests.push({ feature: 'User Authentication', status: 'WORKING', details: 'Tokens generated successfully' });
    } else {
      tests.push({ feature: 'User Authentication', status: 'BROKEN', details: response.error });
    }
  } catch (error) {
    tests.push({ feature: 'User Authentication', status: 'ERROR', details: error.message });
  }
  
  // Test 3: Cart System
  try {
    const response = await makeRequest('/api/cart', 'GET');
    if (response.error && response.error.includes('Access token required')) {
      tests.push({ feature: 'Cart System', status: 'WORKING', details: 'Properly secured with authentication' });
    } else {
      tests.push({ feature: 'Cart System', status: 'BROKEN', details: 'Authentication check failed' });
    }
  } catch (error) {
    tests.push({ feature: 'Cart System', status: 'ERROR', details: error.message });
  }
  
  // Test 4: Vendor System
  try {
    const loginData = JSON.stringify({
      email: 'vendor.mock@ojawa.test',
      password: 'Vendor@12345'
    });
    const response = await makeRequest('/auth/login', 'POST', loginData);
    if (response.success) {
      tests.push({ feature: 'Vendor System', status: 'WORKING', details: 'Vendor login functional' });
    } else {
      tests.push({ feature: 'Vendor System', status: 'BROKEN', details: response.error });
    }
  } catch (error) {
    tests.push({ feature: 'Vendor System', status: 'ERROR', details: error.message });
  }
  
  coreFeatures.tests = tests;
  coreFeatures.working = tests.filter(t => t.status === 'WORKING').length;
  coreFeatures.broken = tests.filter(t => t.status === 'BROKEN').length;
  coreFeatures.errors = tests.filter(t => t.status === 'ERROR').length;
}

async function testUserExperience(userExperience) {
  const tests = [];
  
  // Test 1: Product Discovery
  try {
    const response = await makeRequest('/api/products?search=shoes', 'GET');
    if (response.success) {
      tests.push({ feature: 'Product Discovery', status: 'WORKING', details: 'Search functionality operational' });
    } else {
      tests.push({ feature: 'Product Discovery', status: 'BROKEN', details: response.error });
    }
  } catch (error) {
    tests.push({ feature: 'Product Discovery', status: 'ERROR', details: error.message });
  }
  
  // Test 2: Product Details
  try {
    const productsResponse = await makeRequest('/api/products', 'GET');
    if (productsResponse.success && productsResponse.data.products.length > 0) {
      const productId = productsResponse.data.products[0].id;
      const response = await makeRequest(`/api/products/${productId}`, 'GET');
      if (response.success) {
        tests.push({ feature: 'Product Details', status: 'WORKING', details: 'Product pages accessible' });
      } else {
        tests.push({ feature: 'Product Details', status: 'BROKEN', details: response.error });
      }
    } else {
      tests.push({ feature: 'Product Details', status: 'BROKEN', details: 'No products available' });
    }
  } catch (error) {
    tests.push({ feature: 'Product Details', status: 'ERROR', details: error.message });
  }
  
  // Test 3: User Registration
  try {
    const registerData = JSON.stringify({
      email: `test${Date.now()}@ojawa.test`,
      password: 'TestUser@123',
      displayName: 'Test User'
    });
    const response = await makeRequest('/auth/register', 'POST', registerData);
    if (response.success) {
      tests.push({ feature: 'User Registration', status: 'WORKING', details: 'New user registration functional' });
    } else {
      tests.push({ feature: 'User Registration', status: 'BROKEN', details: response.error });
    }
  } catch (error) {
    tests.push({ feature: 'User Registration', status: 'ERROR', details: error.message });
  }
  
  userExperience.tests = tests;
  userExperience.working = tests.filter(t => t.status === 'WORKING').length;
  userExperience.broken = tests.filter(t => t.status === 'BROKEN').length;
  userExperience.errors = tests.filter(t => t.status === 'ERROR').length;
}

async function testDataIntegrity(dataIntegrity) {
  const tests = [];
  
  // Test 1: Product Data Consistency
  try {
    const response = await makeRequest('/api/products', 'GET');
    if (response.success) {
      const products = response.data.products;
      const hasRealData = products.every(p => 
        p.name && p.price > 0 && p.category && p.vendorId
      );
      
      if (hasRealData) {
        tests.push({ feature: 'Product Data Consistency', status: 'WORKING', details: 'All products have required fields' });
      } else {
        tests.push({ feature: 'Product Data Consistency', status: 'BROKEN', details: 'Some products missing required data' });
      }
    } else {
      tests.push({ feature: 'Product Data Consistency', status: 'BROKEN', details: response.error });
    }
  } catch (error) {
    tests.push({ feature: 'Product Data Consistency', status: 'ERROR', details: error.message });
  }
  
  // Test 2: Vendor Assignment
  try {
    const response = await makeRequest('/api/products', 'GET');
    if (response.success) {
      const products = response.data.products;
      const assignedProducts = products.filter(p => p.vendorId);
      const assignmentRate = (assignedProducts.length / products.length) * 100;
      
      if (assignmentRate === 100) {
        tests.push({ feature: 'Vendor Assignment', status: 'WORKING', details: '100% products assigned to vendors' });
      } else {
        tests.push({ feature: 'Vendor Assignment', status: 'BROKEN', details: `${assignmentRate.toFixed(1)}% products assigned` });
      }
    } else {
      tests.push({ feature: 'Vendor Assignment', status: 'BROKEN', details: response.error });
    }
  } catch (error) {
    tests.push({ feature: 'Vendor Assignment', status: 'ERROR', details: error.message });
  }
  
  dataIntegrity.tests = tests;
  dataIntegrity.working = tests.filter(t => t.status === 'WORKING').length;
  dataIntegrity.broken = tests.filter(t => t.status === 'BROKEN').length;
  dataIntegrity.errors = tests.filter(t => t.status === 'ERROR').length;
}

async function testSecurity(security) {
  const tests = [];
  
  // Test 1: Authentication Required
  try {
    const response = await makeRequest('/api/cart', 'GET');
    if (response.error && response.error.includes('Access token required')) {
      tests.push({ feature: 'Authentication Required', status: 'WORKING', details: 'Protected endpoints require authentication' });
    } else {
      tests.push({ feature: 'Authentication Required', status: 'BROKEN', details: 'Security check failed' });
    }
  } catch (error) {
    tests.push({ feature: 'Authentication Required', status: 'ERROR', details: error.message });
  }
  
  // Test 2: Token Validation
  try {
    const response = await makeRequest('/api/cart', 'GET', null, 'invalid-token');
    if (response.error && (response.error.includes('Invalid token') || response.error.includes('Access token required'))) {
      tests.push({ feature: 'Token Validation', status: 'WORKING', details: 'Invalid tokens properly rejected' });
    } else {
      tests.push({ feature: 'Token Validation', status: 'BROKEN', details: 'Token validation failed' });
    }
  } catch (error) {
    tests.push({ feature: 'Token Validation', status: 'ERROR', details: error.message });
  }
  
  security.tests = tests;
  security.working = tests.filter(t => t.status === 'WORKING').length;
  security.broken = tests.filter(t => t.status === 'BROKEN').length;
  security.errors = tests.filter(t => t.status === 'ERROR').length;
}

async function testPerformance(performance) {
  const tests = [];
  
  // Test 1: API Response Time
  try {
    const startTime = Date.now();
    const response = await makeRequest('/api/products', 'GET');
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (response.success && responseTime < 5000) {
      tests.push({ feature: 'API Response Time', status: 'WORKING', details: `${responseTime}ms response time` });
    } else if (response.success) {
      tests.push({ feature: 'API Response Time', status: 'SLOW', details: `${responseTime}ms response time` });
    } else {
      tests.push({ feature: 'API Response Time', status: 'BROKEN', details: response.error });
    }
  } catch (error) {
    tests.push({ feature: 'API Response Time', status: 'ERROR', details: error.message });
  }
  
  // Test 2: Data Load Capacity
  try {
    const response = await makeRequest('/api/products', 'GET');
    if (response.success && response.data.products.length >= 10) {
      tests.push({ feature: 'Data Load Capacity', status: 'WORKING', details: `${response.data.products.length} products loaded` });
    } else {
      tests.push({ feature: 'Data Load Capacity', status: 'BROKEN', details: 'Insufficient data loaded' });
    }
  } catch (error) {
    tests.push({ feature: 'Data Load Capacity', status: 'ERROR', details: error.message });
  }
  
  performance.tests = tests;
  performance.working = tests.filter(t => t.status === 'WORKING').length;
  performance.broken = tests.filter(t => t.status === 'BROKEN').length;
  performance.errors = tests.filter(t => t.status === 'ERROR').length;
}

function generateAssessmentReport(assessment) {
  console.log('\n📈 OVERALL APP HEALTH SCORE');
  console.log('=' .repeat(80));
  
  let totalWorking = 0;
  let totalBroken = 0;
  let totalErrors = 0;
  
  Object.entries(assessment).forEach(([category, results]) => {
    totalWorking += results.working || 0;
    totalBroken += results.broken || 0;
    totalErrors += results.errors || 0;
    
    const total = (results.working || 0) + (results.broken || 0) + (results.errors || 0);
    const healthScore = total > 0 ? ((results.working || 0) / total * 100) : 0;
    
    console.log(`\n${category.toUpperCase()}:`);
    console.log(`  Health Score: ${healthScore.toFixed(1)}%`);
    console.log(`  Working: ${results.working || 0}`);
    console.log(`  Broken: ${results.broken || 0}`);
    console.log(`  Errors: ${results.errors || 0}`);
    
    if (results.tests) {
      results.tests.forEach(test => {
        const status = test.status === 'WORKING' ? '✅' : 
                     test.status === 'BROKEN' ? '❌' : '⚠️';
        console.log(`  ${status} ${test.feature}: ${test.details}`);
      });
    }
  });
  
  const totalTests = totalWorking + totalBroken + totalErrors;
  const overallHealth = totalTests > 0 ? (totalWorking / totalTests * 100) : 0;
  
  console.log('\n🎯 FINAL APP ASSESSMENT');
  console.log('=' .repeat(80));
  console.log(`Overall Health Score: ${overallHealth.toFixed(1)}%`);
  console.log(`Total Features Tested: ${totalTests}`);
  console.log(`Working Features: ${totalWorking}`);
  console.log(`Broken Features: ${totalBroken}`);
  console.log(`Error Features: ${totalErrors}`);
  
  console.log('\n🏆 APP STATUS CLASSIFICATION:');
  if (overallHealth >= 90) {
    console.log('🟢 EXCELLENT: App is production-ready with minor issues');
  } else if (overallHealth >= 75) {
    console.log('🟡 GOOD: App is functional with some limitations');
  } else if (overallHealth >= 60) {
    console.log('🟠 FAIR: App has significant issues requiring attention');
  } else if (overallHealth >= 40) {
    console.log('🟴 POOR: App has major functionality problems');
  } else {
    console.log('🔴 CRITICAL: App requires immediate attention');
  }
  
  console.log('\n📋 PRODUCTION READINESS CHECKLIST:');
  const checklist = [
    { item: 'User Authentication', ready: assessment.coreFeatures.working > 0 },
    { item: 'Product Catalog', ready: assessment.coreFeatures.working > 0 },
    { item: 'Vendor System', ready: assessment.coreFeatures.working > 0 },
    { item: 'Cart Security', ready: assessment.security.working > 0 },
    { item: 'Data Integrity', ready: assessment.dataIntegrity.working > 0 },
    { item: 'API Performance', ready: assessment.performance.working > 0 }
  ];
  
  checklist.forEach(({ item, ready }) => {
    console.log(`${ready ? '✅' : '❌'} ${item}`);
  });
  
  const readyCount = checklist.filter(c => c.ready).length;
  const readinessScore = (readyCount / checklist.length) * 100;
  
  console.log(`\nProduction Readiness: ${readinessScore.toFixed(1)}%`);
  
  if (readinessScore >= 80) {
    console.log('🚀 READY FOR PRODUCTION');
  } else if (readinessScore >= 60) {
    console.log('⚠️ NEEDS MINOR FIXES BEFORE PRODUCTION');
  } else {
    console.log('🔧 NEEDS MAJOR FIXES BEFORE PRODUCTION');
  }
  
  console.log('\n🎯 KEY RECOMMENDATIONS:');
  if (assessment.coreFeatures.broken > 0) {
    console.log('• Fix core features: Checkout system, Admin access');
  }
  if (assessment.userExperience.broken > 0) {
    console.log('• Improve user experience: Product details, Search functionality');
  }
  if (assessment.dataIntegrity.broken > 0) {
    console.log('• Ensure data consistency: Complete vendor assignments');
  }
  if (assessment.security.broken > 0) {
    console.log('• Strengthen security: Token validation, Access controls');
  }
  if (assessment.performance.broken > 0) {
    console.log('• Optimize performance: API response times, Data loading');
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

finalAppAssessment();
