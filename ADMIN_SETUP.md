# 🔐 Admin User Setup Guide

## Method 1: Firebase Console (Recommended)

### Step 1: Create Admin User in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Users**
4. Click **Add User**
5. Enter the following details:
   - **Email**: `admin@ojawa.com`
   - **Password**: `Admin123!`
6. Click **Add User**

### Step 2: Update User Profile in Firestore
1. Go to **Firestore Database**
2. Navigate to the `users` collection
3. Find the user document (it will have the UID from step 1)
4. Update the document with the following data:

```json
{
  "uid": "USER_UID_FROM_AUTH",
  "email": "admin@ojawa.com",
  "displayName": "Ojawa Admin",
  "phone": "+1234567890",
  "address": "Admin Office",
  "createdAt": "2024-01-01T00:00:00Z",
  "role": "admin",
  "isVendor": false,
  "isLogisticsPartner": false,
  "isAdmin": true,
  "vendorProfile": null,
  "logisticsProfile": null,
  "suspended": false
}
```

### Step 3: Create Admin Wallet
1. In Firestore, go to the `wallets` collection
2. Create a new document with the same UID as the user
3. Add the following data:

```json
{
  "userId": "USER_UID_FROM_AUTH",
  "balance": 0,
  "currency": "USD",
  "createdAt": "2024-01-01T00:00:00Z",
  "transactions": []
}
```

## Method 2: Using the Registration Form (Alternative)

### Step 1: Modify Registration Temporarily
1. Go to `apps/buyer/src/pages/Register.jsx`
2. Add an admin option to the userType select:

```jsx
<option value="admin">👑 Admin - Platform Administrator</option>
```

### Step 2: Register as Admin
1. Go to `/register` in your app
2. Select "Admin" as user type
3. Fill in the form with:
   - **Name**: Ojawa Admin
   - **Email**: admin@ojawa.com
   - **Password**: Admin123!

## 🎯 Admin Login Details

Once set up, you can login with:

- **Email**: `admin@ojawa.com`
- **Password**: `Admin123!`
- **Login URL**: `http://localhost:3000/login`
- **Admin Dashboard**: `http://localhost:3000/admin`

## 🔧 Admin Features Available

- **User Management**: View, suspend, and manage all users
- **Vendor Verification**: Approve/reject vendor applications
- **Dispute Resolution**: Resolve disputes with refund processing
- **Platform Analytics**: Monitor revenue, orders, and user activity
- **Order Management**: View and manage all platform orders
- **System Monitoring**: Track platform health and performance

## 🚨 Security Notes

- Change the default password after first login
- Use a strong, unique password in production
- Consider enabling 2FA for admin accounts
- Regularly audit admin access and permissions

## 🆘 Troubleshooting

If you can't access the admin dashboard:
1. Check that the user has `role: "admin"` in Firestore
2. Verify the user document exists in the `users` collection
3. Ensure the user is not suspended (`suspended: false`)
4. Check browser console for any authentication errors
