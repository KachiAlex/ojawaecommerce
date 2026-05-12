# Product Approval System

## Overview
All new products require admin approval before being listed on the platform. This ensures quality control and prevents spam or inappropriate listings.

## System Flow

### 1. Product Creation
When a vendor creates a new product:
- **Status**: Automatically set to `'pending'`
- **Visibility**: NOT visible to buyers
- **Location**: `apps/buyer/src/services/firebaseService.js` line 203

```javascript
status: 'pending' // Require admin approval
```

### 2. Buyer View
Buyers can ONLY see approved products:
- **Filter**: Automatic filter for `status: 'active'`
- **Implementation**: 
  - `apps/buyer/src/hooks/useRealTimeProducts.js` (lines 31-38)
  - `apps/buyer/src/services/firebaseService.js` (lines 225-230)
- **Pages Affected**: Home, Products, Categories, Search

### 3. Admin Approval
Admins can approve/reject products:
- **View**: Admin Dashboard → Products Tab
- **Access**: All products (pending, active, rejected)
- **Actions**:
  - ✅ **Approve** → Changes status to `'active'`
  - ❌ **Reject** → Changes status to `'rejected'`
  - 📝 **Add Rejection Reason** → Stored with product

## Status Values

| Status | Description | Visible to Buyers | Can Be Edited |
|--------|-------------|-------------------|---------------|
| `pending` | Awaiting admin approval | ❌ No | ✅ Yes (by vendor) |
| `active` | Approved and listed | ✅ Yes | ✅ Yes (by vendor) |
| `rejected` | Rejected by admin | ❌ No | ✅ Yes (can resubmit) |
| `draft` | Work in progress | ❌ No | ✅ Yes (by vendor) |
| `outofstock` | No inventory | ❌ No | ✅ Yes (by vendor) |

## Key Files Modified

### 1. `apps/buyer/src/hooks/useRealTimeProducts.js`
**Purpose**: Real-time product fetching for buyers
**Change**: Added automatic filter for `status: 'active'`

```javascript
// Only show approved (active) products to buyers by default
if (filters.status) {
  q = query(q, where('status', '==', filters.status));
} else if (filters.showAll !== true) {
  // Default: only show active products to buyers
  q = query(q, where('status', '==', 'active'));
}
```

### 2. `apps/buyer/src/services/firebaseService.js`
**Purpose**: Product service API
**Changes**:
- Line 203: New products default to `'pending'`
- Lines 225-230: `getAll()` filters to active products by default

```javascript
// New product creation
status: 'pending' // Require admin approval

// Product fetching
if (filters.status) {
  q = query(q, where('status', '==', filters.status));
} else if (!filters.showAll) {
  // Default: only show active products unless showAll is true
  q = query(q, where('status', '==', 'active'));
}
```

### 3. `apps/buyer/src/pages/Admin.jsx`
**Purpose**: Admin dashboard
**Change**: Explicitly fetches ALL products for review

```javascript
// Load all products (including pending, active, and rejected for admin review)
const productsData = await firebaseService.products.getAll({ showAll: true });
```

## Vendor Experience

### Creating a Product
1. Vendor fills out product form
2. Clicks "Submit"
3. Product is created with `status: 'pending'`
4. Vendor sees notification: "Product submitted for review"
5. Product appears in vendor's dashboard with "Pending Approval" badge

### After Admin Review
- **If Approved**: Product goes live, buyers can see it
- **If Rejected**: Vendor sees rejection reason, can edit and resubmit

## Admin Experience

### Reviewing Products
1. Login to admin dashboard
2. Navigate to "Products" tab
3. See three sections:
   - **Pending Products** (awaiting review)
   - **Active Products** (approved and live)
   - **Rejected Products** (with rejection reasons)

### Approval Actions
- **View Details**: Click product to see full details
- **Approve**: Changes status to `'active'`, product goes live
- **Reject**: Provide reason, changes status to `'rejected'`
- **Edit**: Admin can also edit product details before approving

## Firestore Indexes

Ensure these indexes exist in `firestore.indexes.json`:

```json
{
  "collectionGroup": "products",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "products",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "category", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

## Security Rules

Update `firestore.rules` to enforce status:

```javascript
match /products/{productId} {
  // Anyone can read active products
  allow read: if resource.data.status == 'active' || 
                 request.auth.uid == resource.data.vendorId || 
                 isAdmin();
  
  // Vendors can create products (will be pending)
  allow create: if isAuthenticated() && 
                   request.resource.data.vendorId == request.auth.uid &&
                   request.resource.data.status == 'pending';
  
  // Vendors can update their own products
  allow update: if isAuthenticated() && 
                   resource.data.vendorId == request.auth.uid;
  
  // Only admins can change status to active/rejected
  allow update: if isAdmin() && 
                   request.resource.data.status in ['active', 'rejected'];
  
  // Only admins can delete
  allow delete: if isAdmin();
}
```

## Benefits

✅ **Quality Control**: Prevents low-quality or spam products
✅ **Compliance**: Ensures products meet platform standards
✅ **Brand Protection**: Maintains platform reputation
✅ **User Experience**: Buyers only see vetted products
✅ **Vendor Transparency**: Clear approval process with feedback

## Future Enhancements

1. **Email Notifications**: Notify vendors of approval/rejection
2. **Bulk Actions**: Approve/reject multiple products at once
3. **Auto-Approval**: For trusted vendors with good history
4. **AI Pre-Screening**: Flag suspicious products automatically
5. **Review Comments**: Allow admins to add notes during review
6. **Appeal Process**: Let vendors appeal rejections

---

**Status**: ✅ Implemented and Deployed
**Date**: October 13, 2025
**Version**: 1.0.0

