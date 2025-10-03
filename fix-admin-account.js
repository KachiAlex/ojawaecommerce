const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

// Firebase configuration - you'll need to update this with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyBqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJ",
  authDomain: "ojawa-ecommerce.firebaseapp.com",
  projectId: "ojawa-ecommerce",
  storageBucket: "ojawa-ecommerce.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function fixAdminAccount() {
  try {
    console.log('🔍 Checking admin account...');
    
    // Try to sign in
    const userCredential = await signInWithEmailAndPassword(auth, 'admin@ojawa.com', 'Admin123!');
    const user = userCredential.user;
    console.log('✅ Successfully signed in as:', user.email);
    console.log('🆔 User ID:', user.uid);
    
    // Check user profile in Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('📋 Current user profile:');
      console.log('  - Role:', userData.role);
      console.log('  - Is Admin:', userData.isAdmin);
      console.log('  - Email:', userData.email);
      console.log('  - Display Name:', userData.displayName);
      
      if (userData.role !== 'admin') {
        console.log('🔧 Updating user role to admin...');
        await setDoc(doc(db, 'users', user.uid), {
          ...userData,
          role: 'admin',
          isAdmin: true
        }, { merge: true });
        console.log('✅ User role updated to admin');
      } else {
        console.log('✅ User already has admin role');
      }
    } else {
      console.log('❌ User profile not found in Firestore');
      console.log('🔧 Creating user profile...');
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: 'admin@ojawa.com',
        displayName: 'Ojawa Admin',
        phone: '+1234567890',
        address: 'Admin Office',
        createdAt: new Date(),
        role: 'admin',
        isVendor: false,
        isLogisticsPartner: false,
        isAdmin: true,
        vendorProfile: null,
        logisticsProfile: null,
        suspended: false
      });
      console.log('✅ User profile created in Firestore');
    }
    
    console.log('\n🎉 Admin account is ready!');
    console.log('📧 Email: admin@ojawa.com');
    console.log('🔑 Password: Admin123!');
    console.log('🌐 Login URL: https://ojawa-ecommerce.web.app/admin/login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('\n🔧 Admin account does not exist. Please create it manually:');
      console.log('1. Go to Firebase Console → Authentication → Users');
      console.log('2. Click "Add User"');
      console.log('3. Email: admin@ojawa.com');
      console.log('4. Password: Admin123!');
      console.log('5. Click "Add User"');
      console.log('6. Then run this script again');
    } else if (error.code === 'auth/wrong-password') {
      console.log('\n🔧 Wrong password. Please reset password:');
      console.log('1. Go to Firebase Console → Authentication → Users');
      console.log('2. Find admin@ojawa.com user');
      console.log('3. Click "Reset Password"');
      console.log('4. Set new password to: Admin123!');
    } else if (error.code === 'auth/invalid-email') {
      console.log('\n🔧 Invalid email format. Please check the email address.');
    } else {
      console.log('\n🔧 Unknown error. Please check Firebase configuration.');
    }
  }
}

fixAdminAccount();
