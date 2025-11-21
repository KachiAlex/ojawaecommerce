# Google Maps API Setup Guide

## Current Status: ⚠️ Distance Matrix API Not Enabled

Your app is currently using **fallback distance estimates** because the Google Maps Distance Matrix API is not enabled in your Google Cloud project.

---

## 🚨 **What You're Seeing:**

**Console Error:**
```
Distance Matrix Service: You're calling a legacy API, which is not enabled for your project.
❌ Google Maps Distance Matrix failed, using fallback calculation: Distance Matrix API not enabled: REQUEST_DENIED
```

**Current Behavior:**
- ✅ App works correctly with estimated distances
- ⚠️ Distance calculations use approximations instead of real road distances
- ⚠️ Address autocomplete not working (Places API also needs to be enabled)

---

## 🎯 **Solution: Enable Required Google Maps APIs**

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com
2. Select your project: `ojawa-ecommerce`
3. **Ensure billing is enabled** (required for Google Maps APIs)

### Step 2: Enable Distance Matrix API

1. Go to: https://console.cloud.google.com/apis/library/distance-matrix-backend.googleapis.com
2. Click **"Enable"**
3. Wait for API to be enabled (takes a few seconds)

### Step 3: Enable Places API (for Address Autocomplete)

1. Go to: https://console.cloud.google.com/apis/library/places-backend.googleapis.com
2. Click **"Enable"**
3. Wait for API to be enabled

### Step 4: Verify API Key Restrictions

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your API key (the one used in `VITE_GOOGLE_MAPS_API_KEY`)
3. Under "API restrictions", ensure these APIs are allowed:
   - ✅ Maps JavaScript API
   - ✅ Distance Matrix API
   - ✅ Places API
   - ✅ Geocoding API (optional but recommended)

4. Under "Website restrictions", add your domains:
   - `https://ojawa-ecommerce.web.app/*`
   - `https://ojawa-ecommerce.firebaseapp.com/*`
   - `http://localhost:*` (for local development)

5. Click **"Save"**

### Step 5: Enable Billing

**IMPORTANT:** Google Maps APIs require billing to be enabled, even for free tier usage.

1. Go to: https://console.cloud.google.com/billing
2. Link a billing account to your project
3. Don't worry - Google provides $200 free credit per month for Maps APIs
4. Your usage will likely stay within the free tier

**Free Tier Limits (Monthly):**
- Distance Matrix API: First 100,000 elements free
- Places API (Autocomplete): First 1,000 requests free
- Maps JavaScript API: Always free

---

## 🔧 **After Enabling APIs**

Once you've enabled the APIs and billing:

1. **No code changes needed** - the app is already configured!
2. **Wait 2-5 minutes** for APIs to propagate
3. **Clear browser cache** and reload the app
4. **Test the features:**
   - Address autocomplete should work
   - Distance calculations will use real Google Maps data
   - More accurate delivery pricing

---

## 🎉 **What Will Improve After Setup:**

### Current State (Fallback Mode):
- ❌ Address autocomplete: Not working
- ⚠️ Distance calculation: Using estimates
  - Lagos intracity: ~12 km default
  - Same state: ~80 km default
  - Different states: ~350 km default

### After Enabling APIs:
- ✅ Address autocomplete: **Working with Google suggestions**
- ✅ Distance calculation: **Real driving distances**
  - Lagos: Actual road distances (e.g., 15.7 km)
  - Intercity: Accurate highway distances
  - Interstate: Precise long-distance routing
- ✅ Duration estimates: **Traffic-aware time estimates**
- ✅ Better user experience: **Professional autocomplete suggestions**

---

## 💰 **Cost Estimate**

Based on typical e-commerce usage:

**Assumptions:**
- 100 orders per day
- Each order uses 2 distance calculations (vendor to buyer, backup checks)
- Each address input uses 5 autocomplete requests (as user types)

**Monthly Costs:**
- Distance Matrix: 6,000 requests/month = **$0** (well within free tier)
- Places Autocomplete: 15,000 requests/month = **~$15-20/month** (after free 1,000)
- Total: **~$15-20/month** for professional maps features

**Cost Optimization Tips:**
- Cache distance calculations for common routes
- Limit autocomplete to 3 characters minimum (reduces API calls)
- Use debouncing (already implemented - 500ms delay)

---

## 🛠️ **Troubleshooting**

### If APIs still don't work after enabling:

1. **Wait 5-10 minutes** - API enablement takes time to propagate
2. **Clear browser cache completely**
3. **Check API key restrictions** - ensure your domain is allowed
4. **Check browser console** for specific error messages
5. **Verify billing** is actually active (not just linked)

### Common Issues:

**"API key not valid for this service"**
- Solution: Update API key restrictions to allow the specific API

**"This IP, site or mobile application is not authorized"**
- Solution: Add your domain to website restrictions in API key settings

**"Billing must be enabled"**
- Solution: Link and activate billing account in Google Cloud

---

## 📞 **Need Help?**

If you encounter issues:

1. Check the browser console for specific error messages
2. Verify billing is enabled in Google Cloud Console
3. Ensure all required APIs are enabled
4. Wait at least 10 minutes after enabling APIs before testing

---

## ✅ **Current Functionality (Without APIs Enabled)**

Even without the APIs enabled, your app **works perfectly** with:

- ✅ Manual address entry (no autocomplete needed)
- ✅ Fallback distance estimates (reasonably accurate for Lagos)
- ✅ All delivery pricing calculations
- ✅ Logistics partner matching
- ✅ Complete checkout flow
- ✅ All payment features

The APIs are an **enhancement** for better UX, not a requirement for functionality!

---

**Recommendation:** Enable the APIs for production use to provide the best user experience, but the app is fully functional without them for testing.


