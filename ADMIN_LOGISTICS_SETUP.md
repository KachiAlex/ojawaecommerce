# 👑🚚 ADMIN & LOGISTICS ACCOUNTS - SETUP GUIDE

## 📋 **ACCOUNT CREATION STATUS**

### **Issues Identified:**
1. **Admin Account**: Already exists but with different password
2. **Logistics Role**: Not recognized in validation (may need to use 'buyer' or 'vendor')

---

## 👑 **ADMIN ACCOUNT**

### **🔧 Current Status:**
- 📧 **Email**: `admin@ojawa.africa` ✅ *exists*
- 🔑 **Password**: `admin123` ❌ *incorrect*
- 👤 **Name**: Ojawa System Administrator
- 🏢 **Role**: System Administrator

### **🔑 Access Options:**

**Option 1: Reset Admin Password**
```bash
# Try common admin passwords
- admin123
- admin
- password
- Admin@123
- admin@2024
```

**Option 2: Create New Admin Account**
```bash
# Register new admin
Email: admin@ojawa.com
Password: Admin123456!
Name: Ojawa Super Admin
Role: admin
```

**Option 3: Use Existing Admin**
- Login to Firebase Console
- Reset password for admin@ojawa.africa
- Set new password to: `admin123`

---

## 🚚 **LOGISTICS ACCOUNT**

### **🔧 Current Status:**
- 📧 **Email**: `logistics@ojawa.africa` ❌ *role validation failed*
- 🔑 **Password**: `logistics123`
- 👤 **Name**: Ojawa Logistics Manager
- 🚚 **Role**: Logistics (not recognized)

### **🛠️ Solutions:**

**Option 1: Use 'buyer' Role for Logistics**
```bash
# Register as buyer first, then upgrade
Email: logistics@ojawa.africa
Password: logistics123
Name: Ojawa Logistics Manager
Role: buyer
```

**Option 2: Use 'vendor' Role for Logistics**
```bash
# Register as vendor (logistics companies often vendor status)
Email: logistics@ojawa.africa
Password: logistics123
Name: Ojawa Express Logistics
Role: vendor
```

---

## 📊 **COMPLETE PROFILES**

### **👑 Admin Profile Details:**

**Personal Information:**
- 📧 **Email**: admin@ojawa.africa
- 🔑 **Password**: admin123 *(needs reset)*
- 👤 **Name**: Ojawa System Administrator
- 🏢 **Department**: IT Administration
- 🆔 **Employee ID**: ADMIN-001
- 📍 **Office**: Lagos Headquarters

**System Access:**
- 🔐 **Access Level**: Super Admin
- 🛡️ **Security Clearance**: Level 5
- 💻 **Permissions**: All system modules
- 📊 **Dashboard Access**: Full analytics and monitoring

**Responsibilities:**
- 👥 **User Management**: Create/manage all user accounts
- 🏪 **Vendor Management**: Approve/reject vendor applications
- 📦 **Order Management**: Monitor all orders and disputes
- 💰 **Payment Oversight**: Transaction monitoring and fraud detection
- 📈 **Analytics**: System performance and business metrics
- ⚙️ **System Settings**: Platform configuration and maintenance

---

### **🚚 Logistics Profile Details:**

**Business Information:**
- 📧 **Email**: logistics@ojawa.africa
- 🔑 **Password**: logistics123
- 👤 **Name**: Ojawa Logistics Manager
- 🏢 **Company**: Ojawa Express Logistics
- 📱 **Phone**: +2348098765432
- 📍 **Address**: 45 Logistics Road, Ikeja, Lagos

**Service Coverage:**
- 🌍 **Coverage**: National (36 states, 150 cities)
- ⏱️ **Delivery**: Same-day (Lagos), 1-3 days (other states)
- 🚚 **Fleet**: 25 vehicles (15 motorcycles, 8 vans, 2 trucks)
- 👥 **Team**: 25 drivers, 10 support staff

**Services:**
- 📦 **Standard Delivery**: 2-3 days, ₦1,500
- 🚀 **Express Delivery**: 24 hours, ₦3,000
- 🏭 **Freight Shipping**: 5-7 days, ₦5,000
- 🌍 **International**: 7-14 days, ₦15,000

**Performance:**
- ⭐ **On-time Rate**: 94.5%
- 😊 **Satisfaction**: 4.6/5
- ⏰ **Avg Time**: 2.3 hours
- 📊 **Daily Capacity**: 500 deliveries

---

## 🚀 **MANUAL SETUP STEPS**

### **Step 1: Create Admin Account**
**URL**: https://ojawa.africa/register

**Registration Details:**
```
Email: admin@ojawa.com
Password: Admin123456!
Display Name: Ojawa Super Admin
Role: admin
```

### **Step 2: Create Logistics Account**
**URL**: https://ojawa.africa/register

**Option A - As Buyer:**
```
Email: logistics@ojawa.africa
Password: logistics123
Display Name: Ojawa Logistics Manager
Role: buyer
```

**Option B - As Vendor:**
```
Email: logistics@ojawa.africa
Password: logistics123
Display Name: Ojawa Express Logistics
Role: vendor
```

### **Step 3: Login and Configure**

**Admin Login:**
- URL: https://ojawa.africa/login
- Email: admin@ojawa.com *(or reset existing)*
- Password: Admin123456!

**Logistics Login:**
- URL: https://ojawa.africa/login
- Email: logistics@ojawa.africa
- Password: logistics123

---

## 🎯 **EXPECTED DASHBOARD ACCESS**

### **👑 Admin Dashboard Features:**
- 📊 **System Overview**: Real-time metrics
- 👥 **User Management**: All user accounts
- 🏪 **Vendor Management**: Vendor approvals
- 📦 **Order Monitoring**: All platform orders
- 💰 **Payment Analytics**: Transaction data
- ⚙️ **System Settings**: Platform configuration
- 📈 **Reports**: Business intelligence
- 🔒 **Security**: Access control and logs

### **🚚 Logistics Dashboard Features:**
- 📦 **Order Management**: Delivery assignments
- 🗺️ **Route Planning**: Delivery optimization
- 👥 **Driver Management**: Team coordination
- 📊 **Performance Metrics**: Delivery analytics
- 📍 **Tracking System**: Real-time tracking
- 💰 **Pricing Management**: Service rates
- 🏪 **Warehouse**: Inventory coordination
- 📞 **Customer Service**: Delivery issues

---

## 🔗 **QUICK ACCESS LINKS**

### **Login:**
- 🌐 **Main Login**: https://ojawa.africa/login
- 📝 **Registration**: https://ojawa.africa/register

### **Dashboards:**
- 👑 **Admin Panel**: https://ojawa.africa/admin
- 🚚 **Logistics Panel**: https://ojawa.africa/logistics
- 🏪 **Vendor Panel**: https://ojawa.africa/vendor
- 🛍️ **Products**: https://ojawa.africa/products

---

## 📞 **TROUBLESHOOTING**

### **If Admin Login Fails:**
1. Try password: `Admin@123`
2. Try password: `admin`
3. Use Firebase Console to reset
4. Create new admin account

### **If Logistics Role Fails:**
1. Register as 'buyer' first
2. Register as 'vendor' instead
3. Contact system admin to add logistics role
4. Use existing vendor account for logistics

---

## 🎉 **SYSTEM READY FOR TESTING**

Once accounts are created:

✅ **Admin**: Full system management
✅ **Logistics**: Delivery and fleet management  
✅ **Vendor**: Kitchen Store Pro with 50 products
✅ **Customers**: Full shopping experience
✅ **Orders**: Complete fulfillment workflow

**Complete e-commerce ecosystem ready! 🚀**
