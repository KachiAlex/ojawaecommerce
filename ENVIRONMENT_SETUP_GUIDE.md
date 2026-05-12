# Environment Variables Setup Guide

## Quick Setup (5 minutes)

### Step 1: Verify .env File Exists

The `.env` file has been created at `apps/buyer/.env` with template values.

### Step 2: Fill in Required Keys

Open `apps/buyer/.env` and replace these placeholders:

#### 🔴 CRITICAL - Must Replace:

1. **Flutterwave Public Key**
   ```
   VITE_FLUTTERWAVE_PUBLIC_KEY=YOUR_FLUTTERWAVE_PUBLIC_KEY_HERE
   ```
   - Get from: [Flutterwave Dashboard](https://dashboard.flutterwave.com/settings/developers)
   - ⚠️ **ROTATE** the old exposed test key first!

2. **Google Maps API Key**
   ```
   VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
   ```
   - Get from: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - ⚠️ **ROTATE** the old exposed key first!

#### ✅ Already Set (Firebase):

Firebase configuration is already filled in from your existing config. These are correct:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Step 3: Set Firebase Functions Config

For Google Maps API key in Firebase Functions:

```bash
firebase functions:config:set google.maps_api_key="YOUR_GOOGLE_MAPS_API_KEY_HERE"
```

---

## API Key Rotation Guide

### 🔴 CRITICAL: Rotate These Keys Immediately

#### 1. Flutterwave Test Key

**Old Key (EXPOSED - DO NOT USE):**
```
FLWPUBK_TEST-04fa9716ef05b43e581444120c688399-X
```

**Steps:**
1. Go to [Flutterwave Dashboard](https://dashboard.flutterwave.com/)
2. Navigate to **Settings** → **API Keys**
3. Find the test key: `FLWPUBK_TEST-04fa9716ef05b43e581444120c688399-X`
4. Click **Revoke** or **Delete**
5. Click **Generate New Key**
6. Copy the new public key
7. Update `.env` file:
   ```
   VITE_FLUTTERWAVE_PUBLIC_KEY=new_key_here
   ```
8. Restart your dev server if running

#### 2. Google Maps API Key

**Old Key (EXPOSED - DO NOT USE):**
```
AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk
```

**Steps:**
1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Find the key: `AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk`
3. Click on it to edit
4. Click **Delete** (or restrict heavily if you want to keep it)
5. Click **Create Credentials** → **API Key**
6. **Configure the new key:**
   
   **Application Restrictions:**
   - Select: **HTTP referrers (web sites)**
   - Add these referrers:
     ```
     https://ojawa-ecommerce.web.app/*
     https://ojawa-ecommerce.firebaseapp.com/*
     https://ojawa-ecommerce-staging.web.app/*
     http://localhost:5173/*
     ```
   
   **API Restrictions:**
   - Select: **Restrict key**
   - Enable only these APIs:
     - ✅ Maps JavaScript API
     - ✅ Places API
     - ✅ Geocoding API
     - ✅ Directions API
     - ✅ Distance Matrix API (if used)
   
7. Click **Save**
8. Copy the new API key
9. Update `.env` file:
   ```
   VITE_GOOGLE_MAPS_API_KEY=new_key_here
   ```
10. Update Firebase Functions config:
    ```bash
    firebase functions:config:set google.maps_api_key="new_key_here"
    firebase deploy --only functions
    ```

---

## Verification Steps

### 1. Check .env File

```bash
# Navigate to buyer app
cd apps/buyer

# Verify .env exists (should NOT be empty)
cat .env | grep -v "^#" | grep -v "^$"
```

### 2. Test Environment Variables

Start the dev server and check for errors:

```bash
cd apps/buyer
npm run dev
```

**Expected:**
- ✅ No "Missing environment variable" errors
- ✅ App loads successfully
- ✅ No API key errors in console

**If errors:**
- Check `.env` file exists
- Verify all required variables are set
- Restart dev server

### 3. Verify Keys Are Not Exposed

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Type: `import.meta.env`
4. Check that:
   - ✅ No hardcoded keys visible
   - ✅ Only environment variables shown
   - ✅ No fallback test keys

---

## Production Deployment

### For Production Builds

Environment variables are automatically included in the build. Make sure:

1. `.env` file is set before building:
   ```bash
   cd apps/buyer
   npm run build
   ```

2. For Firebase Hosting, variables are baked into the build, so:
   - Set `.env` before building
   - Build includes the variables
   - Deploy the build

### For Firebase Functions

Set config separately:

```bash
firebase functions:config:set google.maps_api_key="your_key"
```

---

## Security Checklist

- [ ] `.env` file created and filled
- [ ] Flutterwave key rotated and updated
- [ ] Google Maps key rotated and updated
- [ ] Firebase Functions config set
- [ ] `.env` file is in `.gitignore` (already done ✅)
- [ ] No keys visible in browser console
- [ ] No keys in version control
- [ ] Old exposed keys revoked/deleted

---

## Troubleshooting

### Issue: "Missing environment variable" error

**Solution:**
1. Check `.env` file exists in `apps/buyer/`
2. Verify variable name matches exactly (case-sensitive)
3. Restart dev server: `npm run dev`

### Issue: App works but keys still visible

**Solution:**
1. Check `apps/buyer/src/config/env.js` - should use `import.meta.env`
2. Verify no hardcoded fallbacks
3. Clear browser cache
4. Rebuild: `npm run build`

### Issue: Functions can't access Google Maps key

**Solution:**
1. Set Functions config:
   ```bash
   firebase functions:config:set google.maps_api_key="your_key"
   ```
2. Redeploy functions:
   ```bash
   firebase deploy --only functions
   ```

---

## Next Steps

After setting up environment variables:

1. ✅ Rotate exposed API keys
2. ✅ Test application functionality
3. ✅ Verify no keys in browser console
4. ✅ Deploy to production

---

**Last Updated**: November 29, 2024  
**Status**: Ready for configuration

