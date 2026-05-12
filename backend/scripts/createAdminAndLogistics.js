// Create Admin and Logistics Mock Accounts
const fetch = require('node-fetch');

const API_BASE = 'https://ojawaecommerce.onrender.com';

// Admin Account Data
const adminData = {
  email: 'admin@ojawa.africa',
  password: 'admin123',
  displayName: 'Ojawa System Administrator',
  role: 'admin',
  profile: {
    department: 'IT Administration',
    accessLevel: 'super_admin',
    permissions: ['all'],
    employeeId: 'ADMIN-001',
    department: 'System Administration',
    officeLocation: 'Lagos Headquarters',
    workSchedule: '24/7 On-call',
    emergencyContact: '+2348012345678',
    adminLevel: 'super_admin',
    systemAccess: ['dashboard', 'users', 'vendors', 'orders', 'payments', 'analytics', 'settings', 'logs'],
    securityClearance: 'level_5',
    lastSecurityTraining: new Date('2024-01-15'),
    certifications: ['CISSP', 'CISA', 'CompTIA Security+']
  }
};

// Logistics Account Data
const logisticsData = {
  email: 'logistics@ojawa.africa',
  password: 'logistics123',
  displayName: 'Ojawa Logistics Manager',
  role: 'logistics',
  profile: {
    companyName: 'Ojawa Express Logistics',
    department: 'Logistics & Delivery',
    position: 'Logistics Operations Manager',
    employeeId: 'LOG-001',
    officeLocation: 'Lagos Distribution Center',
    warehouseAddress: '45 Logistics Road, Ikeja, Lagos, Nigeria',
    contactPhone: '+2348098765432',
    whatsappNumber: '+2348098765432',
    emergencyContact: '+2348012345678',
    workSchedule: 'Monday-Saturday 6AM-10PM',
    fleetSize: 25,
    deliveryAreas: ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Benin City', 'Aba', 'Enugu'],
    serviceAreas: {
      coverage: 'National',
      states: 36,
      cities: 150,
      deliveryTime: 'Same-day (Lagos), 1-3 days (other states)'
    },
    services: {
      standardDelivery: true,
      expressDelivery: true,
      internationalShipping: false,
      freightShipping: true,
      warehousing: true,
      inventoryManagement: true,
      returnsManagement: true,
      trackingSystem: true
    },
    pricing: {
      baseRate: 1500, // NGN
      perKmRate: 100,
      weightRate: 50, // per kg
      expressSurcharge: 500,
      insuranceRate: 0.02 // 2% of item value
    },
    fleet: {
      motorcycles: 15,
      vans: 8,
      trucks: 2,
      drivers: 25,
      supportStaff: 10
    },
    performance: {
      onTimeDeliveryRate: 94.5,
      customerSatisfaction: 4.6,
      averageDeliveryTime: '2.3 hours',
      dailyCapacity: 500,
      monthlyVolume: 15000
    },
    certifications: ['ISO 9001:2015', 'Logistics Management Certificate', 'Supply Chain Professional'],
    established: '2020',
    licenseNumber: 'LOG-LAG-2020-5678',
    insuranceProvider: 'AXA Insurance Nigeria',
    insurancePolicy: 'LIP-2024-12345'
  }
};

async function createAdminAccount() {
  try {
    console.log('👑 Creating Admin Account...\n');
    
    // Try to register admin
    console.log('1️⃣ Attempting admin registration...');
    try {
      const registerResponse = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: adminData.email,
          password: adminData.password,
          displayName: adminData.displayName,
          role: adminData.role
        })
      });
      
      const registerResult = await registerResponse.json();
      
      if (registerResponse.ok) {
        console.log('✅ Admin registration successful!');
        console.log('📋 Registration Response:', JSON.stringify(registerResult, null, 2));
      } else if (registerResponse.status === 400 && registerResult.error && registerResult.error.includes('already exists')) {
        console.log('ℹ️ Admin account already exists, proceeding to login...');
      } else {
        console.log('❌ Admin registration failed:', registerResult);
        return { success: false, error: registerResult.error };
      }
    } catch (error) {
      console.log('❌ Registration error:', error.message);
      return { success: false, error: error.message };
    }
    
    // Try to login
    console.log('\n2️⃣ Attempting admin login...');
    try {
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: adminData.email,
          password: adminData.password
        })
      });
      
      const loginResult = await loginResponse.json();
      
      if (loginResponse.ok) {
        console.log('✅ Admin login successful!');
        console.log('🔑 Authentication Token:', loginResult.token);
        console.log('👤 Admin Info:', JSON.stringify(loginResult.user, null, 2));
        
        return {
          success: true,
          token: loginResult.token,
          user: loginResult.user
        };
      } else {
        console.log('❌ Admin login failed:', loginResult);
        return { success: false, error: 'Login failed' };
      }
    } catch (error) {
      console.log('❌ Login error:', error.message);
      return { success: false, error: error.message };
    }
    
  } catch (error) {
    console.error('❌ Admin creation error:', error);
    return { success: false, error: error.message };
  }
}

async function createLogisticsAccount() {
  try {
    console.log('\n🚚 Creating Logistics Account...\n');
    
    // Try to register logistics
    console.log('1️⃣ Attempting logistics registration...');
    try {
      const registerResponse = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: logisticsData.email,
          password: logisticsData.password,
          displayName: logisticsData.displayName,
          role: logisticsData.role
        })
      });
      
      const registerResult = await registerResponse.json();
      
      if (registerResponse.ok) {
        console.log('✅ Logistics registration successful!');
        console.log('📋 Registration Response:', JSON.stringify(registerResult, null, 2));
      } else if (registerResponse.status === 400 && registerResult.error && registerResult.error.includes('already exists')) {
        console.log('ℹ️ Logistics account already exists, proceeding to login...');
      } else {
        console.log('❌ Logistics registration failed:', registerResult);
        return { success: false, error: registerResult.error };
      }
    } catch (error) {
      console.log('❌ Registration error:', error.message);
      return { success: false, error: error.message };
    }
    
    // Try to login
    console.log('\n2️⃣ Attempting logistics login...');
    try {
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: logisticsData.email,
          password: logisticsData.password
        })
      });
      
      const loginResult = await loginResponse.json();
      
      if (loginResponse.ok) {
        console.log('✅ Logistics login successful!');
        console.log('🔑 Authentication Token:', loginResult.token);
        console.log('👤 Logistics Info:', JSON.stringify(loginResult.user, null, 2));
        
        return {
          success: true,
          token: loginResult.token,
          user: loginResult.user
        };
      } else {
        console.log('❌ Logistics login failed:', loginResult);
        return { success: false, error: 'Login failed' };
      }
    } catch (error) {
      console.log('❌ Login error:', error.message);
      return { success: false, error: error.message };
    }
    
  } catch (error) {
    console.error('❌ Logistics creation error:', error);
    return { success: false, error: error.message };
  }
}

async function createLogisticsServices(token) {
  console.log('\n📦 Setting up Logistics Services...');
  
  const logisticsServices = [
    {
      name: 'Standard Delivery',
      type: 'standard',
      description: 'Regular delivery service within 2-3 business days',
      estimatedTime: '2-3 business days',
      price: 1500,
      features: ['Door-to-door', 'Tracking available', 'Insurance included'],
      coverage: ['Lagos', 'Abuja', 'Port Harcourt']
    },
    {
      name: 'Express Delivery',
      type: 'express',
      description: 'Fast delivery service within 24 hours',
      estimatedTime: '24 hours',
      price: 3000,
      features: ['Same-day delivery', 'Real-time tracking', 'Priority handling', 'Insurance included'],
      coverage: ['Lagos', 'Abuja']
    },
    {
      name: 'Freight Shipping',
      type: 'freight',
      description: 'Bulk and heavy item shipping service',
      estimatedTime: '5-7 business days',
      price: 5000,
      features: ['Heavy items', 'Bulk shipping', 'Warehouse pickup', 'Full insurance'],
      coverage: ['All states']
    },
    {
      name: 'International Shipping',
      type: 'international',
      description: 'International shipping to select countries',
      estimatedTime: '7-14 business days',
      price: 15000,
      features: ['Customs clearance', 'International tracking', 'Full insurance', 'Export documentation'],
      coverage: ['Ghana', 'Kenya', 'South Africa', 'UK', 'USA']
    }
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < logisticsServices.length; i++) {
    const service = logisticsServices[i];
    
    try {
      const response = await fetch(`${API_BASE}/api/logistics/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(service)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Created service ${i + 1}: ${service.name}`);
        successCount++;
      } else {
        console.log(`❌ Failed service ${i + 1}: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Error service ${i + 1}: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 Logistics services created: ${successCount}/${logisticsServices.length}`);
}

// Main execution
async function main() {
  console.log('🎯 Creating Admin and Logistics Mock Accounts\n');
  console.log('=' .repeat(60));
  
  // Create Admin Account
  const adminResult = await createAdminAccount();
  
  // Create Logistics Account
  const logisticsResult = await createLogisticsAccount();
  
  // Setup Logistics Services
  if (logisticsResult.success && logisticsResult.token) {
    await createLogisticsServices(logisticsResult.token);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('🎉 ACCOUNT CREATION SUMMARY\n');
  
  console.log('👑 ADMIN ACCOUNT:');
  console.log(`📧 Email: ${adminData.email}`);
  console.log(`🔑 Password: ${adminData.password}`);
  console.log(`👤 Name: ${adminData.displayName}`);
  console.log(`✅ Status: ${adminResult.success ? 'Created/Verified' : 'Failed'}`);
  
  console.log('\n🚚 LOGISTICS ACCOUNT:');
  console.log(`📧 Email: ${logisticsData.email}`);
  console.log(`🔑 Password: ${logisticsData.password}`);
  console.log(`👤 Name: ${logisticsData.displayName}`);
  console.log(`✅ Status: ${logisticsResult.success ? 'Created/Verified' : 'Failed'}`);
  
  console.log('\n🔗 ACCESS LINKS:');
  console.log('🌐 Frontend Login: https://ojawa.africa/login');
  console.log('👑 Admin Dashboard: https://ojawa.africa/admin');
  console.log('🚚 Logistics Dashboard: https://ojawa.africa/logistics');
  console.log('📦 Products: https://ojawa.africa/products');
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Login as admin to access system management');
  console.log('2. Login as logistics to manage deliveries');
  console.log('3. Configure logistics zones and pricing');
  console.log('4. Test order fulfillment workflow');
  console.log('5. Monitor system performance and analytics');
  
  console.log('\n🎯 SYSTEM READY FOR FULL TESTING!');
}

if (require.main === module) {
  main().then(() => {
    console.log('\n✅ Script completed!');
  });
}

module.exports = { createAdminAccount, createLogisticsAccount, adminData, logisticsData };
