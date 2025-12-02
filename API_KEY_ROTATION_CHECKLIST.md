# API Key Rotation Checklist

## 🔴 CRITICAL: Rotate These Keys Immediately

Two API keys were exposed in the codebase and MUST be rotated before production use.

---

## Key 1: Flutterwave Test Key

### Current Status
- **Exposed Key**: `FLWPUBK_TEST-04fa9716ef05b43e581444120c688399-X`
- **Location Found**: `apps/buyer/src/config/env.js` (now removed ✅)
- **Risk**: HIGH - Payment processing key exposed

### Rotation Steps

1. **Login to Flutterwave Dashboard**
   - URL: https://dashboard.flutterwave.com/
   - Navigate to: **Settings** → **API Keys**

2. **Find the Exposed Key**
   - Look for: `FLWPUBK_TEST-04fa9716ef05b43e581444120c688399-X`
   - Or search for keys created around the time of exposure

3. **Revoke/Delete Old Key**
   - Click on the key
   - Click **Revoke** or **Delete**
   - Confirm deletion

4. **Generate New Test Key**
   - Click **Generate New Key**
   - Select **Test Key** (or Live if going to production)
   - Copy the new public key

5. **Update Configuration**
   - Open `apps/buyer/.env`
   - Update: `VITE_FLUTTERWAVE_PUBLIC_KEY=new_key_here`
   - Save file

6. **Test Payment Flow**
   - Restart dev server
   - Test checkout process
   - Verify payment works

### Verification
- [ ] Old key revoked/deleted
- [ ] New key generated
- [ ] `.env` file updated
- [ ] Payment flow tested
- [ ] No errors in console

---

## Key 2: Google Maps API Key

### Current Status
- **Exposed Key**: `AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk`
- **Locations Found**: 
  - Documentation files (now redacted ✅)
  - `functions/src/mapsProxy.js` (now uses env var ✅)
  - `apps/buyer/vite.config.js` (now removed ✅)
- **Risk**: HIGH - Can be used by anyone, may incur charges

### Rotation Steps

1. **Login to Google Cloud Console**
   - URL: https://console.cloud.google.com/apis/credentials
   - Select project: `ojawa-ecommerce` (or your project)

2. **Find the Exposed Key**
   - Look for: `AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk`
   - Click on the key to edit

3. **Delete Old Key** (Recommended)
   - Click **Delete**
   - Confirm deletion
   - **OR** heavily restrict it if you want to keep it

4. **Create New API Key**
   - Click **Create Credentials** → **API Key**
   - Copy the new key immediately

5. **Configure Key Restrictions** (CRITICAL)

   **Application Restrictions:**
   - Select: **HTTP referrers (web sites)**
   - Click **Add an item** for each:
     ```
     https://ojawa-ecommerce.web.app/*
     https://ojawa-ecommerce.firebaseapp.com/*
     https://ojawa-ecommerce-staging.web.app/*
     https://ojawa-ecommerce-staging.firebaseapp.com/*
     http://localhost:5173/*
     http://localhost:*
     http://127.0.0.1:*
     ```

   **API Restrictions:**
   - Select: **Restrict key**
   - Enable ONLY these APIs:
     - ✅ Maps JavaScript API
     - ✅ Places API
     - ✅ Geocoding API
     - ✅ Directions API
     - ✅ Distance Matrix API (if used)
   
   - Click **Save**

6. **Update Configuration**

   **Frontend (.env file):**
   - Open `apps/buyer/.env`
   - Update: `VITE_GOOGLE_MAPS_API_KEY=new_key_here`
   - Save file

   **Firebase Functions:**
   ```bash
   firebase functions:config:set google.maps_api_key="new_key_here"
   ```

7. **Wait for Propagation**
   - Changes take 1-5 minutes to propagate
   - Clear browser cache
   - Test in incognito window

8. **Test Functionality**
   - Test address autocomplete (checkout page)
   - Test Google Maps features
   - Verify no API errors in console

### Verification
- [ ] Old key deleted or heavily restricted
- [ ] New key created
- [ ] Application restrictions configured
- [ ] API restrictions configured
- [ ] `.env` file updated
- [ ] Firebase Functions config updated
- [ ] Maps features tested
- [ ] No API errors

---

## Security Best Practices Applied

### ✅ What We Fixed
1. Removed hardcoded keys from code
2. Removed keys from documentation
3. Updated code to use environment variables
4. Added validation to fail if keys missing

### ✅ What You Need to Do
1. Rotate the exposed keys
2. Set up environment variables
3. Configure key restrictions
4. Test functionality

---

## Timeline

### Immediate (Do Now)
- [ ] Rotate Flutterwave key
- [ ] Rotate Google Maps key
- [ ] Update `.env` file
- [ ] Set Functions config

### Within 24 Hours
- [ ] Test all functionality
- [ ] Verify no keys exposed
- [ ] Monitor for unauthorized usage

### Ongoing
- [ ] Monitor API usage
- [ ] Review key access logs
- [ ] Rotate keys periodically (every 90 days)

---

## Cost Monitoring

After rotating keys, monitor usage:

### Google Maps
- Dashboard: https://console.cloud.google.com/apis/dashboard
- Set up billing alerts
- Monitor daily usage

### Flutterwave
- Dashboard: https://dashboard.flutterwave.com/
- Review transaction logs
- Monitor for suspicious activity

---

## Emergency Response

If you suspect a key is compromised:

1. **Immediately revoke** the key
2. **Generate** a new key
3. **Update** all configurations
4. **Review** usage logs for unauthorized access
5. **Notify** your team
6. **Monitor** for suspicious activity

---

## Completion Checklist

- [ ] Flutterwave key rotated
- [ ] Google Maps key rotated
- [ ] All configurations updated
- [ ] Key restrictions configured
- [ ] Functionality tested
- [ ] No errors in production
- [ ] Monitoring set up
- [ ] Team notified

---

**Priority**: 🔴 **CRITICAL - Do Immediately**  
**Estimated Time**: 15-20 minutes  
**Status**: ⬜ **PENDING**

