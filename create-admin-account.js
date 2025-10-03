const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

// Firebase configuration
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

async function createAdminAccount() {
  try {
    console.log('🔐 Creating admin account...');
    
    // First, try to create the user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'admin@ojawa.com', 
      'Admin123!'
    );
    
    const user = userCredential.user;
    console.log('✅ Admin user created in Firebase Auth:', user.uid);
    
    // Create user profile in Firestore
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
    
    console.log('✅ Admin profile created in Firestore');
    
    // Create admin wallet
    await setDoc(doc(db, 'wallets'), {
      userId: user.uid,
      type: 'admin',
      balance: 0,
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Admin wallet created');
    
    console.log('\n🎉 Admin account created successfully!');
    console.log('📧 Email: admin@ojawa.com');
    console.log('🔑 Password: Admin123!');
    console.log('🌐 Login URL: https://ojawa-ecommerce.web.app/admin/login');
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️  Admin account already exists in Firebase Auth');
      console.log('🔍 Checking Firestore profile...');
      
      try {
        // Try to sign in to get the user
        const userCredential = await signInWithEmailAndPassword(auth, 'admin@ojawa.com', 'Admin123!');
        const user = userCredential.user;
        
        // Check if user profile exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('📋 Current user profile:', userData);
          
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
        
      } catch (signInError) {
        console.error('❌ Error signing in:', signInError.message);
        console.log('\n🔧 Manual setup required:');
        console.log('1. Go to Firebase Console → Authentication');
        console.log('2. Find admin@ojawa.com user');
        console.log('3. Reset password to: Admin123!');
        console.log('4. Go to Firestore → users collection');
        console.log('5. Update user document with role: "admin"');
      }
    } else {
      console.error('❌ Error creating admin account:', error.message);
    }
  }
}

createAdminAccount();
