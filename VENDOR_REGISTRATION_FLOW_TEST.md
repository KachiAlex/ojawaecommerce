# Vendor Registration Flow - Comprehensive Test Checklist

## 🎯 Test Objective
Verify that the complete `/become-vendor` flow works end-to-end, from registration to vendor dashboard access.

**Live URL**: https://ojawa.africa/become-vendor

---

## 📋 Pre-Test Requirements

- [ ] Fresh browser session (clear cache or use incognito mode)
- [ ] Valid test email address (not previously registered)
- [ ] 11-digit NIN for testing (use: 12345678901)
- [ ] Network connection stable
- [ ] Console open to check for errors (F12)

---

## ✅ Step-by-Step Test Cases

### **Step 1: Account Creation**

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **1.1** Load form | Navigate to https://ojawa.africa/become-vendor | Form loads with Step 1 displayed, email input focused | ☐ |
| **1.2** Empty email | Click Next without entering data | Error: "Please fill in all account fields" | ☐ |
| **1.3** Invalid email | Enter "notanemail" | Error: "Please enter a valid email address" | ☐ |
| **1.4** Short password | Enter password "123" | Error: "Password must be at least 6 characters" | ☐ |
| **1.5** Non-matching passwords | Enter password "Test123", confirm "Test456" | Error: "Passwords do not match" | ☐ |
| **1.6** Valid account info | Email: vendor-test@example.com, Password: TestPass123, Display Name: Test Vendor | Click Next successfully, proceed to Step 2 | ☐ |

### **Step 2: Business Information**

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **2.1** Back button | Click ← Back from Step 2 | Return to Step 1, data persists | ☐ |
| **2.2** Empty NIN | Leave NIN blank | Error: "Please fill in all required business fields" | ☐ |
| **2.3** Short NIN | Enter "12345" | Error: "NIN must be 11 digits" | ☐ |
| **2.4** Complete BUSINESS info | NIN: 12345678901, Business Name: TestBiz, Address: Lagos, Business Phone: 08012345678 | Click Next successfully, proceed to Step 3 | ☐ |

### **Step 3: Store Setup**

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **3.1** Empty store name | Leave store name blank | Error: "Please fill in store information" | ☐ |
| **3.2** Empty description | Fill store name but leave description blank | Error: "Please fill in store information" | ☐ |
| **3.3** Valid store info | Store Name: "My Test Store", Description: "Premium test store" | Click Next successfully, proceed to Step 4 | ☐ |

### **Step 4: Review & Submit**

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| **4.1** Review display | View summary | All entered data displays correctly | ☐ |
| **4.2** Back button | Click ← Back | Return to Step 3, data persists | ☐ |
| **4.3** Submit form | Click "🚀 Become a Vendor" | Loading state appears, button shows "Submitting..." | ☐ |
| **4.4** Account creation | - | Account successfully created in Firebase Auth | ☐ |
| **4.5** Vendor profile | - | Vendor profile saved to Firestore with `isVendor: true` | ☐ |
| **4.6** Vendor wallet | - | Wallet created for vendor | ☐ |
| **4.7** Success message | - | Alert shows "🎉 Welcome to Ojawa! Your vendor account is ready..." | ☐ |
| **4.8** Redirect | - | Redirects to `/vendor` dashboard | ☐ |

---

## 🔍 Backend Verification Checklist

After successful submission, check Firebase Console:

- [ ] **Firebase Auth**: New user appears with email entered in Step 1
- [ ] **Firestore - Collection 'users'**: 
  - [ ] User document exists with `uid` as ID
  - [ ] `isVendor: true`
  - [ ] `vendorProfile` object contains all business info
  - [ ] `displayName` matches Step 1 entry
- [ ] **Firestore - Collection 'vendor_profiles'**: 
  - [ ] Document exists with vendor NIN
  - [ ] `verificationStatus: 'pending'`
  - [ ] `onboardedAt` timestamp present
  - [ ] `storeName` and `storeDescription` correct
- [ ] **Firestore - Collection 'wallets'**: 
  - [ ] Wallet document exists for vendor user
  - [ ] `type: 'vendor'`
  - [ ] `balance: 0`

---

## 🚨 Error Handling Tests

| Error Scenario | Expected Behavior | Status |
|---|---|---|
| Email already registered | Show error message, stay on Step 1 | ☐ |
| Network error during signup | Show error, keep form data, allow retry | ☐ |
| Invalid NIN format | Show validation error before submission | ☐ |
| Missing required fields | Block Next button, show field-specific errors | ☐ |
| Address autocomplete fails | Show manual address entry option | ☐ |

---

## 🧪 Browser Console Tests

Open Developer Tools (F12) → Console tab

| Test | Expected | Status |
|------|----------|--------|
| Clear of errors | No red errors in console | ☐ |
| Auth debugging | "📝 Registering new vendor account..." logged | ☐ |
| Account creation | "✅ Account created:" + uid logged | ☐ |
| Vendor onboarding | "🏪 Completing vendor onboarding..." logged | ☐ |
| Profile creation | "✅ Vendor profile created:" + profile logged | ☐ |

---

## 🔐 Security Verification

| Security Check | Expected Behavior | Status |
|---|---|---|
| Password visible in HTML | Never visible in plaintext source | ☐ |
| HTTPS | URL shows https:// (locked padlock) | ☐ |
| Secure session | After login, session token in localStorage | ☐ |
| CORS headers | Requests from ojawa.africa allowed | ☐ |
| Input sanitization | Special characters handled safely | ☐ |

---

## 📱 Cross-Device Tests

| Device | Resolution | Status | Notes |
|--------|-----------|--------|-------|
| Desktop | 1920x1080 | ☐ | Forms properly spaced |
| Tablet | 768x1024 | ☐ | Buttons easily tappable |
| Mobile | 375x667 | ☐ | Single column layout |
| Mobile | 425x812 | ☐ | Landscape orientation |

---

## 🎭 User Flow Simulation

### Scenario A: Fresh User Registration
1. [ ] Navigate to `/become-vendor` (completely new user)
2. [ ] Fill all 4 steps with valid data
3. [ ] Submit successfully
4. [ ] Verify vendor dashboard loads
5. [ ] Verify user can access vendor-only features

### Scenario B: Already Logged In User
1. [ ] Log out completely
2. [ ] Navigate to `/become-vendor`
3. [ ] Verify form loads (public access)
4. [ ] Enter new registration data
5. [ ] Submit successfully

### Scenario C: Email Exists
1. [ ] Try registering with already-used email
2. [ ] Verify appropriate error message
3. [ ] Suggest existing user login instead

---

## 📊 Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Page load time | < 3s | ☐ | ☐ |
| Form render | < 1s | ☐ | ☐ |
| Account creation | < 5s | ☐ | ☐ |
| Vendor onboarding | < 5s | ☐ | ☐ |
| Redirect to dashboard | < 2s | ☐ | ☐ |

---

## ✨ Edge Cases

| Edge Case | Expected Behavior | Status |
|-----------|------------------|--------|
| Copy-paste email with spaces | Trimmed and validated | ☐ |
| Very long business name | Truncated or wrapped properly | ☐ |
| Special characters in business name | Handled safely | ☐ |
| Rapid form submission clicks | Only one submission registered | ☐ |
| Browser back button mid-flow | Session data preserved or cleared gracefully | ☐ |

---

## 🎯 Final Sign-Off

**Test Date**: _______________

**Tester Name**: _______________

**Overall Result**: 

- [ ] ✅ **PASS** - All critical tests passed. Ready for production.
- [ ] ⚠️ **PASS WITH WARNINGS** - Minor issues found but non-blocking.
- [ ] ❌ **FAIL** - Critical issues found. Do not deploy.

**Issues Found** (if any):
```
1. 
2. 
3. 
```

**Recommendations**:
```


```

---

## 📞 Support

If you encounter issues during testing:

1. **Check Console**: Open F12, look for error messages
2. **Check Network**: Network tab to see API calls
3. **Check Firebase**: Verify connection and permissions
4. **Clear Cache**: Ctrl+Shift+Delete or use incognito mode
5. **Contact Support**: Include console errors and exact reproduction steps

---

## 🚀 Deployment Status

- **Status**: Ready for production
- **URL**: https://ojawa.africa/become-vendor
- **Backup Link**: https://ojawa-ecommerce-staging.web.app/become-vendor
- **Rollback**: Previous version available on GitHub
