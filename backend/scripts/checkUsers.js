// User Database Checker Script
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function checkUsers() {
  try {
    console.log('🔍 Checking for users in the Ojawa app...\n');
    
    // Check Firestore users collection
    console.log('📊 Firestore Users Collection:');
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found in Firestore users collection');
    } else {
      console.log(`✅ Found ${usersSnapshot.size} users in Firestore:`);
      
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        console.log(`  👤 ${user.displayName || user.email} (${user.email})`);
        console.log(`     Role: ${user.role || 'user'}`);
        console.log(`     Created: ${user.createdAt?.toDate?.() || 'Unknown'}`);
        console.log(`     Status: ${user.status || 'active'}`);
        console.log('');
      });
    }
    
    // Check Firebase Authentication users
    console.log('🔐 Firebase Authentication Users:');
    try {
      const listUsers = await auth.listUsers();
      const authUsers = listUsers.users;
      
      if (authUsers.length === 0) {
        console.log('❌ No users found in Firebase Authentication');
      } else {
        console.log(`✅ Found ${authUsers.length} users in Firebase Auth:`);
        
        authUsers.forEach(user => {
          console.log(`  👤 ${user.displayName || user.email} (${user.email})`);
          console.log(`     UID: ${user.uid}`);
          console.log(`     Created: ${user.metadata.creationTime}`);
          console.log(`     Last Sign-in: ${user.metadata.lastSignInTime || 'Never'}`);
          console.log(`     Email Verified: ${user.emailVerified}`);
          console.log(`     Disabled: ${user.disabled}`);
          console.log('');
        });
      }
    } catch (authError) {
      console.log('❌ Error accessing Firebase Auth:', authError.message);
    }
    
    // Check for vendor-specific data
    console.log('🏪 Vendor Store Information:');
    const vendorQuery = await db.collection('users').where('role', '==', 'vendor').get();
    
    if (vendorQuery.empty) {
      console.log('❌ No vendors found');
    } else {
      console.log(`✅ Found ${vendorQuery.size} vendors:`);
      
      vendorQuery.forEach(doc => {
        const vendor = doc.data();
        console.log(`  🏪 ${vendor.displayName || vendor.email}`);
        console.log(`     Store: ${vendor.storeName || 'Not set'}`);
        console.log(`     Email: ${vendor.email}`);
        console.log(`     Status: ${vendor.status || 'active'}`);
        console.log('');
      });
    }
    
    // Check for recent activity
    console.log('📈 Recent User Activity:');
    const recentUsers = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    if (recentUsers.empty) {
      console.log('❌ No recent user activity found');
    } else {
      console.log(`✅ Recent user registrations:`);
      
      recentUsers.forEach(doc => {
        const user = doc.data();
        const created = user.createdAt?.toDate?.();
        console.log(`  👤 ${user.displayName || user.email} - Registered: ${created}`);
      });
    }
    
    // Summary statistics
    console.log('\n📊 User Statistics Summary:');
    console.log(`  • Total Firestore Users: ${usersSnapshot.size}`);
    console.log(`  • Total Auth Users: ${authUsers?.length || 0}`);
    console.log(`  • Total Vendors: ${vendorQuery.size}`);
    console.log(`  • Regular Users: ${usersSnapshot.size - vendorQuery.size}`);
    
    // Check for test users
    console.log('\n🧪 Test Users Detection:');
    const testUsers = usersSnapshot.docs.filter(doc => {
      const user = doc.data();
      return user.email?.includes('test') || user.email?.includes('demo') || 
             user.displayName?.includes('Test') || user.displayName?.includes('Demo');
    });
    
    if (testUsers.length > 0) {
      console.log(`⚠️  Found ${testUsers.length} test/demo users:`);
      testUsers.forEach(doc => {
        const user = doc.data();
        console.log(`  🧪 ${user.email} (${user.role})`);
      });
    } else {
      console.log('✅ No test users found');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  }
}

async function checkUserActivity() {
  try {
    console.log('\n📱 Checking User Activity on Frontend...');
    
    // Test if frontend is accessible
    const response = await fetch('https://ojawa.africa');
    if (response.ok) {
      console.log('✅ Frontend is accessible');
    } else {
      console.log('❌ Frontend not accessible');
    }
    
    // Check API endpoints for user-related data
    const authResponse = await fetch('https://ojawaecommerce.onrender.com/health');
    const authData = await authResponse.json();
    
    if (authData.services.authentication === 'connected') {
      console.log('✅ Authentication service is connected');
    } else {
      console.log('❌ Authentication service issue');
    }
    
  } catch (error) {
    console.error('❌ Error checking user activity:', error.message);
  }
}

// Run the checks
async function main() {
  console.log('🎯 OJAWA APP USER ANALYSIS\n');
  console.log('=' .repeat(50));
  
  await checkUsers();
  await checkUserActivity();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 User analysis complete!\n');
  
  console.log('📋 Next Steps:');
  console.log('1. If no users exist, create test accounts');
  console.log('2. Set up vendor accounts for testing');
  console.log('3. Monitor user registration and activity');
  console.log('4. Implement user analytics tracking');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkUsers, checkUserActivity };
