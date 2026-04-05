# 🏪 MOCK VENDOR CREATION COMPLETE GUIDE

## ✅ **CURRENT STATUS**

The database already contains **20 products** including **4 kitchen products** that can be assigned to our mock vendor:

### **🍳 Existing Kitchen Products:**
1. **Dyson V15 Detect Cordless Vacuum** - $749.99
2. **KitchenAid Stand Mixer** - $329.99  
3. **Instant Pot Duo 7-in-1** - $79.99 *(need to add)*
4. **Vitamix 5200 Blender** - $449.99 *(need to add)*
5. **Nespresso Vertuo Plus** - $199.99 *(need to add)*
6. **Breville Smart Oven Air Fryer** - $299.99 *(need to add)*
7. **Cuisinart Food Processor** - $249.99 *(need to add)*
8. **KitchenAid Electric Kettle** - $79.99 *(need to add)*

---

## 👤 **MOCK VENDOR DETAILS**

### **🏪 Kitchen Gadgets Pro**

**Business Information:**
- 📧 **Email**: `kitchengadgets@ojawa.com`
- 🔑 **Password**: `Vendor123456!`
- 🏪 **Store Name**: `Kitchen Gadgets Pro Store`
- 👤 **Owner**: `Kitchen Gadgets Pro`
- 📝 **Description**: Premium kitchen appliances and gadgets for modern homes

**Location & Contact:**
- 📍 **Address**: 123 Kitchen Street, Victoria Island, Lagos, Nigeria
- 🏙️ **City**: Lagos
- 🌍 **State**: Lagos State
- 🇳🇬 **Country**: Nigeria
- 📞 **Phone**: +2348012345678
- 📱 **WhatsApp**: +2348012345678
- ✉️ **Business Email**: support@kitchengadgets.com

**Business Details:**
- 🏢 **Type**: Retail Store
- 📅 **Established**: 2020
- 👥 **Employees**: 5-10
- 📋 **License**: RC123456789
- 🏆 **Verification**: Premium Verified
- ⭐ **Rating**: 4.8/5 (127 reviews)

**Payment & Banking:**
- 🏦 **Bank**: Guaranty Trust Bank
- 📝 **Account Name**: Kitchen Gadgets Pro Store
- 💳 **Account Number**: 0123456789
- 💰 **Paystack**: MCP_KITCHEN_12345

---

## 🚀 **STEP-BY-STEP CREATION**

### **Step 1: Create Vendor Account**

**Via Frontend (Recommended):**
1. Go to: **https://ojawa.africa/register**
2. Fill registration form:
   - **Email**: `kitchengadgets@ojawa.com`
   - **Password**: `Vendor123456!`
   - **Display Name**: `Kitchen Gadgets Pro`
   - **Role**: Select **"Vendor"**
3. Complete email verification
4. Complete business profile setup

**Via API:**
```bash
POST https://ojawaecommerce.onrender.com/auth/register
{
  "email": "kitchengadgets@ojawa.com",
  "password": "Vendor123456!",
  "displayName": "Kitchen Gadgets Pro",
  "role": "vendor"
}
```

### **Step 2: Complete Vendor Profile**

Add business information:
- Store name: `Kitchen Gadgets Pro Store`
- Location: Lagos, Nigeria
- Contact details
- Business description
- Payment information

### **Step 3: Login for Authentication Token**

```bash
POST https://ojawaecommerce.onrender.com/auth/login
{
  "email": "kitchengadgets@ojawa.com",
  "password": "Vendor123456!"
}
```

Save the `token` from response for next steps.

### **Step 4: Upload Kitchen Products**

Use the authentication token to upload each product:

```bash
POST https://ojawaecommerce.onrender.com/api/products
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "name": "KitchenAid Stand Mixer",
  "description": "Professional-grade stand mixer with 5-quart stainless steel bowl...",
  "price": 329.99,
  "category": "home",
  "brand": "KitchenAid",
  "stockQuantity": 30,
  "features": ["5-Quart Capacity", "10 Speeds", "Dishwasher Safe Bowl"],
  "images": ["https://images.unsplash.com/photo-1585515656519-7d2e1d7b1f3e?w=400"]
}
```

**Products to Upload:**
1. KitchenAid Stand Mixer - $329.99
2. Dyson V15 Detect Absolute - $749.99
3. Instant Pot Duo 7-in-1 - $79.99
4. Vitamix 5200 Blender - $449.99
5. Nespresso Vertuo Plus - $199.99
6. Breville Smart Oven Air Fryer - $299.99
7. Cuisinart Food Processor - $249.99
8. KitchenAid Electric Kettle - $79.99

---

## 📱 **FRONTEND VERIFICATION**

### **After Creation, Check:**

1. **Vendor Login**: https://ojawa.africa/login
2. **Vendor Dashboard**: https://ojawa.africa/vendor
3. **Products Page**: https://ojawa.africa/products
4. **Store Page**: https://ojawa.africa/store/kitchen-gadgets-pro

### **What Should Display:**
- ✅ Products show "Kitchen Gadgets Pro" as vendor
- ✅ Store location shows "Lagos, Nigeria"
- ✅ Vendor rating displays (4.8/5)
- ✅ Contact information visible
- ✅ Verified vendor badge

---

## 🛠️ **MANUAL DATABASE UPDATE (Optional)**

If needed to reassign existing products:

```javascript
// In Firebase Console or Admin SDK
const batch = db.batch();
const productsRef = db.collection('products');

// Get existing kitchen products
const kitchenProducts = await productsRef
  .where('category', '==', 'home')
  .where('brand', 'in', ['KitchenAid', 'Dyson', 'Instant Pot', 'Vitamix', 'Nespresso', 'Breville', 'Cuisinart'])
  .get();

// Update each product with new vendor ID
kitchenProducts.forEach(doc => {
  const productRef = productsRef.doc(doc.id);
  batch.update(productRef, {
    vendorId: 'new_vendor_uid_here',
    vendorName: 'Kitchen Gadgets Pro',
    vendorLocation: 'Lagos, Nigeria',
    vendorVerified: true,
    vendorRating: 4.8
  });
});

await batch.commit();
```

---

## 🎯 **SUCCESS METRICS**

### **Expected Results:**
- ✅ **Vendor Account**: Created and verified
- ✅ **Store Profile**: Complete with location and contact
- ✅ **Product Catalog**: 8 kitchen products uploaded
- ✅ **Frontend Display**: Products show correct vendor info
- ✅ **Search Results**: Filterable by vendor and location

### **Verification Checklist:**
- [ ] Vendor can login successfully
- [ ] Dashboard shows store analytics
- [ ] Products display vendor name on frontend
- [ ] Location shows "Lagos, Nigeria"
- [ ] Verified badge appears
- [ ] Contact information accessible
- [ ] Add to cart works from vendor products

---

## 🔗 **QUICK ACCESS LINKS**

- **Register**: https://ojawa.africa/register
- **Login**: https://ojawa.africa/login
- **Vendor Dashboard**: https://ojawa.africa/vendor
- **Products**: https://ojawa.africa/products
- **API Base**: https://ojawaecommerce.onrender.com

---

## 📞 **SUPPORT**

If you encounter issues:
1. Check browser console for errors
2. Verify email confirmation
3. Ensure vendor role is selected
4. Check API authentication token
5. Verify product upload format

---

**🎉 Once completed, you'll have a fully functional mock vendor with realistic business data and a complete kitchen product catalog!**
