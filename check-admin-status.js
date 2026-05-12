// Simple script to check admin account status
// Run this with: node check-admin-status.js

console.log(`
🔐 OJAWA ADMIN ACCOUNT STATUS CHECK
==================================

Please follow these steps to verify your admin account:

1. FIREBASE AUTHENTICATION CHECK:
   ===============================
   - Go to: https://console.firebase.google.com/
   - Select your project: ojawa-ecommerce
   - Go to Authentication → Users
   - Look for: admin@ojawa.com
   - If NOT found: Click "Add User" and create with:
     * Email: admin@ojawa.com
     * Password: Admin123!

2. FIRESTORE DATABASE CHECK:
   =========================
   - Go to Firestore Database
   - Navigate to 'users' collection
   - Find the document with email: admin@ojawa.com
   - Check if it has:
     * role: "admin"
     * isAdmin: true
   - If missing: Update the document with:
     {
       "role": "admin",
       "isAdmin": true
     }

3. TEST LOGIN:
   ===========
   - Go to: https://ojawa-ecommerce.web.app/admin/login
   - Try logging in with:
     * Email: admin@ojawa.com
     * Password: Admin123!

4. COMMON ISSUES:
   ===============
   ❌ "User not found" → Create user in Firebase Auth
   ❌ "Wrong password" → Reset password in Firebase Auth
   ❌ "Access denied" → Update Firestore user document
   ❌ "Invalid email" → Check email format

5. MANUAL FIXES:
   =============
   If automatic fixes don't work:
   
   A. Create Admin User in Firebase Console:
      - Authentication → Users → Add User
      - Email: admin@ojawa.com
      - Password: Admin123!
   
   B. Update Firestore User Document:
      - Go to Firestore → users collection
      - Find the user document (by UID from step A)
      - Update with:
        {
          "uid": "USER_UID_FROM_STEP_A",
          "email": "admin@ojawa.com",
          "displayName": "Ojawa Admin",
          "role": "admin",
          "isAdmin": true,
          "suspended": false
        }

6. VERIFICATION:
   =============
   After setup, test:
   - https://ojawa-ecommerce.web.app/admin/login
   - Should redirect to: https://ojawa-ecommerce.web.app/admin
   - Should show admin dashboard

Need help? Check the browser console for detailed error messages.
`);

// If you want to run this as a Node.js script with Firebase SDK:
/*
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function checkAdmin() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, 'admin@ojawa.com', 'Admin123!');
    const user = userCredential.user;
    console.log('✅ Auth successful:', user.email);
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ Firestore profile:', userData);
      console.log('Role:', userData.role);
      console.log('Is Admin:', userData.isAdmin);
    } else {
      console.log('❌ No Firestore profile found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdmin();
*/
