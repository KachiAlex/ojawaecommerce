# 🏪 MOCK VENDOR CREATION GUIDE

## 📋 **Kitchen Gadgets Pro - Mock Vendor**

### **👤 Vendor Account Details:**

**Login Credentials:**
- 📧 **Email**: `kitchengadgets@ojawa.com`
- 🔑 **Password**: `Vendor123456!`
- 🏪 **Display Name**: `Kitchen Gadgets Pro`

### **📍 Business Information:**

**Store Details:**
- 🏪 **Store Name**: Kitchen Gadgets Pro Store
- 📝 **Description**: Premium kitchen appliances and gadgets for modern homes
- 📍 **Location**: 123 Kitchen Street, Victoria Island, Lagos, Nigeria
- 📞 **Phone**: +2348012345678
- 📱 **WhatsApp**: +2348012345678
- ✉️ **Business Email**: support@kitchengadgets.com

**Verification Status:**
- ✅ **Verified**: Yes
- ⭐ **Rating**: 4.8/5
- 📊 **Reviews**: 127 reviews
- 🏆 **Level**: Premium Verified Vendor

### **📦 Products to Assign:**

8 Kitchen-Focused Products:

1. **KitchenAid Stand Mixer** - $329.99
   - 5-Quart Capacity, 10 Speeds, Professional Grade
   - Stock: 30 units

2. **Dyson V15 Detect Absolute** - $749.99
   - Laser Dust Detection, 60-min Runtime, HEPA Filtration
   - Stock: 60 units

3. **Instant Pot Duo 7-in-1** - $79.99
   - Multi-cooker, 14 Smart Programs, Stainless Steel
   - Stock: 120 units

4. **Vitamix 5200 Blender** - $449.99
   - 2 HP Motor, Variable Speed, 64-oz Container
   - Stock: 25 units

5. **Nespresso Vertuo Plus** - $199.99
   - Centrifusion Technology, One-touch Brewing
   - Stock: 45 units

6. **Breville Smart Oven Air Fryer** - $299.99
   - Air Fry Function, 13 Smart Presets, Large Capacity
   - Stock: 35 units

7. **Cuisinart Food Processor** - $249.99
   - 14-Cup Capacity, Stainless Steel Blades
   - Stock: 40 units

8. **KitchenAid Electric Kettle** - $79.99
   - 1.7L Capacity, Fast Boiling, Dual Windows
   - Stock: 50 units

---

## 🚀 **STEP-BY-STEP CREATION PROCESS**

### **Step 1: Create Vendor Account**

**Method A: Frontend Registration**
1. Go to: https://ojawa.africa/register
2. Fill in:
   - Email: `kitchengadgets@ojawa.com`
   - Password: `Vendor123456!`
   - Display Name: `Kitchen Gadgets Pro`
   - Role: Select "Vendor"
3. Complete verification process

**Method B: API Registration**
```bash
POST https://ojawaecommerce.onrender.com/auth/register
{
  "email": "kitchengadgets@ojawa.com",
  "password": "Vendor123456!",
  "displayName": "Kitchen Gadgets Pro",
  "role": "vendor"
}
```

### **Step 2: Login and Get Token**

```bash
POST https://ojawaecommerce.onrender.com/auth/login
{
  "email": "kitchengadgets@ojawa.com",
  "password": "Vendor123456!"
}
```

### **Step 3: Upload Products**

Use the token from Step 2 to upload each product:

```bash
POST https://ojawaecommerce.onrender.com/api/products
Authorization: Bearer <token_from_step_2>
Content-Type: application/json

{
  "name": "KitchenAid Stand Mixer",
  "description": "Professional-grade stand mixer with 5-quart stainless steel bowl...",
  "price": 329.99,
  "category": "home",
  "brand": "KitchenAid",
  "stockQuantity": 30,
  "features": ["5-Quart Capacity", "10 Speeds", "Dishwasher Safe Bowl"],
  "images": ["https://images.unsplash.com/photo-1585515656519-7d2e1d7b1f3e?w=400"],
  "tags": ["kitchen", "baking", "professional"]
}
```

---

## 📊 **Expected Results**

After completion:

✅ **Vendor Account**: `kitchengadgets@ojawa.com` active and verified
✅ **Store Profile**: Complete business information and location
✅ **Product Catalog**: 8 kitchen products assigned to vendor
✅ **Inventory**: All products with stock quantities
✅ **Frontend Display**: Products show vendor information on frontend

---

## 🎯 **Verification Checklist**

**After creation, verify:**

- [ ] Vendor can login at https://ojawa.africa/login
- [ ] Vendor dashboard accessible at https://ojawa.africa/vendor
- [ ] Products display vendor name "Kitchen Gadgets Pro"
- [ ] Store location shows "Lagos, Nigeria"
- [ ] All 8 products appear on https://ojawa.africa/products
- [ ] Product pages show vendor information
- [ ] Search and filtering works for vendor products

---

## 🔗 **Quick Access Links**

- **Login**: https://ojawa.africa/login
- **Vendor Dashboard**: https://ojawa.africa/vendor
- **Products Page**: https://ojawa.africa/products
- **Store Page**: https://ojawa.africa/store/kitchen-gadgets-pro

---

## 📱 **Mobile Testing**

Test on mobile:
- Vendor login works
- Product display responsive
- Store information visible
- Add to cart functions

---

**🎉 Once completed, you'll have a fully functional mock vendor with realistic data and products!**
