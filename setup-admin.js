// Quick Admin Setup Script
// This script will help you create an admin user quickly

console.log(`
🔐 OJAWA ADMIN SETUP
===================

To create an admin user, you have two options:

OPTION 1: Firebase Console (Easiest)
====================================
1. Go to Firebase Console → Authentication → Users
2. Click "Add User"
3. Email: admin@ojawa.com
4. Password: Admin123!
5. Click "Add User"

Then go to Firestore Database and update the user document:

1. Find the user document in 'users' collection
2. Update with this data:
{
  "role": "admin",
  "isAdmin": true,
  "suspended": false
}

OPTION 2: Use Registration Form
================================
1. Go to your app's registration page
2. Temporarily add admin option to userType select
3. Register with:
   - Email: admin@ojawa.com
   - Password: Admin123!
   - User Type: admin

ADMIN LOGIN DETAILS:
===================
📧 Email: admin@ojawa.com
🔑 Password: Admin123!
🌐 Login URL: http://localhost:3000/login
👑 Admin Dashboard: http://localhost:3000/admin

ADMIN FEATURES:
===============
✅ User Management (suspend/unsuspend users)
✅ Vendor Verification (approve/reject vendors)
✅ Dispute Resolution (resolve disputes with refunds)
✅ Platform Analytics (revenue, orders, users)
✅ Order Management (view all platform orders)
✅ System Monitoring (platform health)

SECURITY NOTES:
===============
⚠️  Change password after first login
⚠️  Use strong password in production
⚠️  Enable 2FA for admin accounts
⚠️  Regular security audits

Need help? Check ADMIN_SETUP.md for detailed instructions.
`);

// If you want to run this as a Node.js script, uncomment below:
/*
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'admin@ojawa.com', 
      'Admin123!'
    );
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      role: 'admin',
      isAdmin: true,
      email: 'admin@ojawa.com',
      displayName: 'Ojawa Admin',
      suspended: false
    });
    
    console.log('Admin user created successfully!');
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();
*/
