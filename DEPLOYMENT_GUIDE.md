# Security Fixes Deployment Guide

## Step-by-Step Deployment Instructions

### Prerequisites
- ✅ Firebase CLI installed and logged in
- ✅ Project: `ojawa-ecommerce` is active
- ✅ Code fixes completed

---

## Step 1: Set Up Environment Variables (5 minutes)

### 1.1 Create .env File

```bash
# Navigate to buyer app directory
cd apps/buyer

# Copy the example file
cp .env.example .env
```

### 1.2 Fill in Required Values

Open `apps/buyer/.env` and fill in:

**Required (App won't work without these):**
- `VITE_FLUTTERWAVE_PUBLIC_KEY` - Get from Flutterwave dashboard
- `VITE_GOOGLE_MAPS_API_KEY` - Get from Google Cloud Console
- `VITE_FIREBASE_API_KEY` - Get from Firebase Console

**Optional (but recommended):**
- Other Firebase config values
- Stripe keys (if using Stripe)

### 1.3 Set Firebase Functions Environment Variable

```bash
# Set Google Maps API key for Functions
firebase functions:config:set google.maps_api_key="your_google_maps_key_here"
```

---

## Step 2: Deploy Security Fixes (10 minutes)

### 2.1 Deploy Storage Rules (CRITICAL)

```bash
firebase deploy --only storage
```

**Expected Output:**
```
✔ Deploy complete!
```

### 2.2 Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

**Expected Output:**
```
✔ Deploy complete!
```

### 2.3 Deploy Firebase Functions

```bash
firebase deploy --only functions
```

**Expected Output:**
```
✔ Deploy complete!
```

### 2.4 Deploy Hosting (with CSP headers)

```bash
firebase deploy --only hosting
```

**Expected Output:**
```
✔ Deploy complete!
```

### 2.5 Deploy Everything at Once (Alternative)

```bash
firebase deploy --only storage,firestore:rules,functions,hosting
```

---

## Step 3: Verify Deployment (5 minutes)

### 3.1 Check Storage Rules

1. Go to Firebase Console → Storage → Rules
2. Verify rules are deployed (should show the new secure rules)

### 3.2 Check Firestore Rules

1. Go to Firebase Console → Firestore → Rules
2. Verify wallet rules are updated

### 3.3 Check Functions

1. Go to Firebase Console → Functions
2. Verify all functions are deployed
3. Check function logs for any errors

### 3.4 Check Hosting

1. Visit your site: https://ojawa-ecommerce.web.app
2. Open browser DevTools (F12)
3. Check Console for CSP violations
4. Verify site loads correctly

---

## Step 4: Test Functionality (30 minutes)

### 4.1 Test File Uploads

1. **As authenticated vendor:**
   - Upload a product image → Should work ✅
   - Try to access another vendor's image → Should fail ✅

2. **As unauthenticated user:**
   - Try to upload a file → Should fail ✅

### 4.2 Test Firebase Functions

1. **Without authentication:**
   - Call `notifyVendorNewOrder` → Should return error ✅

2. **With authentication:**
   - Call `notifyVendorNewOrder` → Should work ✅

3. **Authorization test:**
   - Call `releaseEscrowFunds` as wrong user → Should fail ✅
   - Call `releaseEscrowFunds` as correct buyer → Should work ✅

### 4.3 Test Payments

1. Go through checkout flow
2. Verify Flutterwave payment works
3. Check browser console - no API keys visible ✅

### 4.4 Test CSP

1. Open browser console
2. Look for CSP violations
3. If violations found, adjust CSP in `firebase.json`
4. Redeploy hosting

---

## Step 5: Rotate Exposed API Keys (15 minutes)

### 5.1 Rotate Flutterwave Key

1. Go to [Flutterwave Dashboard](https://dashboard.flutterwave.com/)
2. Settings → API Keys
3. Find old test key: `FLWPUBK_TEST-04fa9716ef05b43e581444120c688399-X`
4. **Revoke/Delete** it
5. Generate new test key
6. Update `.env` file
7. Restart dev server if running

### 5.2 Rotate Google Maps Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find old key: `AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk`
3. **Delete** it (or restrict heavily)
4. Create new API key
5. **Configure restrictions:**
   - Application restrictions: HTTP referrers
   - Add: `https://ojawa-ecommerce.web.app/*`
   - Add: `https://ojawa-ecommerce.firebaseapp.com/*`
   - Add: `http://localhost:5173/*`
   - API restrictions: Only enable needed APIs
6. Update `.env` file
7. Update Firebase Functions config:
   ```bash
   firebase functions:config:set google.maps_api_key="new_key_here"
   ```
8. Redeploy functions:
   ```bash
   firebase deploy --only functions
   ```

---

## Troubleshooting

### Issue: "Missing environment variables" error

**Solution:**
1. Check `.env` file exists in `apps/buyer/`
2. Verify all required variables are set
3. Restart dev server: `npm run dev`

### Issue: Storage uploads failing

**Solution:**
1. Check user is authenticated
2. Verify storage rules deployed correctly
3. Check Firebase Console → Storage → Rules

### Issue: Functions returning "unauthenticated" error

**Solution:**
1. This is expected behavior (security fix working!)
2. Ensure user is logged in before calling functions
3. Check authentication token is valid

### Issue: CSP violations in console

**Solution:**
1. Note which resources are blocked
2. Update CSP in `firebase.json`
3. Redeploy hosting: `firebase deploy --only hosting`

### Issue: Payment not working

**Solution:**
1. Check Flutterwave key is set in `.env`
2. Verify key is valid (not revoked)
3. Check browser console for errors

---

## Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Storage rules deployed
- [ ] Firestore rules deployed
- [ ] Functions deployed
- [ ] Hosting deployed
- [ ] File uploads tested
- [ ] Functions tested
- [ ] Payments tested
- [ ] CSP verified (no violations)
- [ ] API keys rotated
- [ ] Monitoring set up

---

## Next Steps

1. **Monitor** for 24-48 hours after deployment
2. **Review** Firebase logs for any errors
3. **Check** user reports for issues
4. **Plan** remaining medium-priority fixes

---

**Need Help?** Check:
- `SECURITY_FIXES_IMPLEMENTATION_REPORT.md` - Detailed fix documentation
- `ACTION_ITEMS_CHECKLIST.md` - Complete checklist
- Firebase Console logs for errors

