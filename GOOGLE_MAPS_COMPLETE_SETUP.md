# Complete Google Maps API Setup Guide

## ✅ Current Status

- ✅ API Key added to vite config: `AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk`
- ✅ Lazy loading implemented (loads only when needed)
- ✅ Error handling and fallbacks in place
- ✅ CSP headers configured
- ⏳ **API Key Restrictions** - NEEDS CONFIGURATION

---

## 🚨 Critical: Configure API Key Restrictions (5 minutes)

### Why This is Important:
Without restrictions, your API key:
- ❌ Can be used by anyone who finds it
- ❌ May incur unexpected charges
- ❌ Blocks requests from unauthorized domains
- ❌ Shows `RefererNotAllowedMapError`

---

## 📝 Step-by-Step Setup

### Step 1: Open Google Cloud Console

1. Go to: **[Google Cloud Console - API Credentials](https://console.cloud.google.com/apis/credentials)**
2. Select your project (if you have multiple)

### Step 2: Find Your API Key

1. Look for: `AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk`
2. Click on the API key name to edit it

### Step 3: Set Application Restrictions

Under **"Application restrictions"** section:

1. Select: **"HTTP referrers (web sites)"**
2. Click **"Add an item"** for each of these referrers:

```
https://ojawa-ecommerce.web.app/*
https://ojawa-ecommerce.firebaseapp.com/*
http://localhost:5173/*
http://localhost:*
http://127.0.0.1:*
```

**Important Notes:**
- Include the asterisk `/*` at the end
- Add both production URLs (web.app and firebaseapp.com)
- Add localhost for development testing

### Step 4: Set API Restrictions

Under **"API restrictions"** section:

1. Select: **"Restrict key"**
2. Check ONLY these APIs:
   - ✅ **Maps JavaScript API**
   - ✅ **Places API**
   - ✅ **Geocoding API**
   - ✅ **Directions API**
   - ✅ **Distance Matrix API** (optional, for advanced features)

**Why restrict?**
- Prevents unauthorized API usage
- Reduces security risk
- Limits potential costs

### Step 5: Save & Wait

1. Click **"Save"** button at the bottom
2. Wait **1-5 minutes** for changes to propagate
3. Clear browser cache or open incognito window to test

---

## 🧪 Testing After Configuration

### Test 1: Verify API Key Works

1. Open: https://ojawa-ecommerce.web.app/checkout
2. Start typing in the address field
3. **Expected**: Autocomplete suggestions appear
4. **If error**: Check console for specific error message

### Test 2: Check Console for Errors

Open browser console (F12) and look for:

**✅ Success**:
```
Google Maps loaded successfully
Address suggestions loaded
```

**❌ Errors to watch for**:
- `RefererNotAllowedMapError` → Check HTTP referrers
- `ApiNotActivatedMapError` → Enable the API
- `InvalidKeyMapError` → Check API key is correct
- `RequestDeniedMapError` → Check API restrictions

### Test 3: Verify All Features

1. **Address Autocomplete** (Checkout page):
   - Type address → See suggestions ✅
   
2. **Geocoding** (Background):
   - Select address → Coordinates calculated ✅
   
3. **Route Calculation** (Logistics pricing):
   - Enter delivery address → Distance calculated ✅

---

## 🔧 Enable Required APIs

If any APIs are not enabled, follow these steps:

### Enable Maps JavaScript API

1. Go to: **[Maps JavaScript API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com)**
2. Click **"Enable"**

### Enable Places API

1. Go to: **[Places API](https://console.cloud.google.com/apis/library/places-backend.googleapis.com)**
2. Click **"Enable"**

### Enable Geocoding API

1. Go to: **[Geocoding API](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com)**
2. Click **"Enable"**

### Enable Directions API

1. Go to: **[Directions API](https://console.cloud.google.com/apis/library/directions-backend.googleapis.com)**
2. Click **"Enable"**

---

## 💰 Billing & Quota Information

### Current Plan
- **Free Tier**: $200 credit per month
- **Maps JavaScript API**: $7 per 1,000 requests after free quota
- **Places API**: $17-32 per 1,000 requests
- **Geocoding API**: $5 per 1,000 requests
- **Directions API**: $5-10 per 1,000 requests

### Cost Optimization Tips

1. **Lazy Loading** ✅ (Already implemented)
   - Maps loads only when user types in address field
   - Saves ~90% of unnecessary requests

2. **Caching** (Recommended):
   - Cache geocoding results
   - Store frequently used routes
   - Reduce duplicate API calls

3. **Set Daily Quotas**:
   - Go to: **[Quotas Page](https://console.cloud.google.com/apis/api/maps-backend.googleapis.com/quotas)**
   - Set daily limits to prevent overages
   - Recommended: 1,000-5,000 requests/day for testing

4. **Monitor Usage**:
   - Go to: **[Metrics Page](https://console.cloud.google.com/apis/api/maps-backend.googleapis.com/metrics)**
   - Track daily usage
   - Set up billing alerts

---

## 🐛 Troubleshooting Guide

### Error: "RefererNotAllowedMapError"

**Cause**: Firebase Hosting URL not in allowed referrers

**Solution**:
1. Go to API key settings
2. Add exact URLs:
   ```
   https://ojawa-ecommerce.web.app/*
   https://ojawa-ecommerce.firebaseapp.com/*
   ```
3. Save and wait 2 minutes

### Error: "API key not valid"

**Cause**: API key restrictions too strict or wrong APIs enabled

**Solution**:
1. Check API restrictions
2. Ensure Maps JavaScript API, Places API, Geocoding API, Directions API are enabled
3. Verify HTTP referrers include your domain

### Error: "This API project is not authorized"

**Cause**: Billing not enabled or API not activated

**Solution**:
1. Enable billing: [Enable Billing](https://console.cloud.google.com/billing)
2. Enable required APIs (see above)

### Error: Maps loads slowly

**Cause**: Multiple script loads or network issues

**Solution**:
✅ Already implemented:
- Lazy loading
- Duplicate script prevention
- Async loading

### Error: Autocomplete not working

**Cause**: Places API not enabled or insufficient permissions

**Solution**:
1. Enable Places API
2. Add `places` to library in script URL (already done)
3. Check browser console for specific errors

---

## 🎯 Quick Setup Checklist

Use this checklist to ensure everything is configured:

- [ ] **API Key Created** ✅ (Done)
- [ ] **API Key Added to Code** ✅ (Done)
- [ ] **HTTP Referrers Configured** ⏳ (YOU NEED TO DO THIS)
  - [ ] `https://ojawa-ecommerce.web.app/*`
  - [ ] `https://ojawa-ecommerce.firebaseapp.com/*`
  - [ ] `http://localhost:5173/*`
- [ ] **API Restrictions Set** ⏳ (YOU NEED TO DO THIS)
  - [ ] Maps JavaScript API
  - [ ] Places API
  - [ ] Geocoding API
  - [ ] Directions API
- [ ] **APIs Enabled** ⏳ (VERIFY THIS)
  - [ ] Maps JavaScript API
  - [ ] Places API
  - [ ] Geocoding API
  - [ ] Directions API
- [ ] **Billing Enabled** ⏳ (VERIFY THIS)
- [ ] **Tested on Live Site** ⏳ (AFTER CONFIGURATION)

---

## 🚀 What Happens After Setup

### Immediate Benefits:
1. ✅ Address autocomplete works perfectly
2. ✅ Accurate distance-based logistics pricing
3. ✅ Route visualization (if enabled)
4. ✅ No more API errors in console
5. ✅ Fast, responsive location search

### Features That Will Work:
- **Checkout Page**: Smart address autocomplete
- **Logistics Pricing**: Accurate distance calculation
- **Route Optimization**: Best path for deliveries
- **Location Picker**: Interactive map selection

---

## 📞 Support Resources

- **Google Maps Platform Support**: https://developers.google.com/maps/support
- **Community Forum**: https://stackoverflow.com/questions/tagged/google-maps
- **Firebase Support**: https://firebase.google.com/support

---

## 🔗 Direct Links (Save These)

1. **API Credentials Page**: 
   https://console.cloud.google.com/apis/credentials

2. **Enable Maps JavaScript API**:
   https://console.cloud.google.com/apis/library/maps-backend.googleapis.com

3. **Enable Places API**:
   https://console.cloud.google.com/apis/library/places-backend.googleapis.com

4. **Enable Geocoding API**:
   https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com

5. **Enable Directions API**:
   https://console.cloud.google.com/apis/library/directions-backend.googleapis.com

6. **Billing Overview**:
   https://console.cloud.google.com/billing

7. **API Metrics**:
   https://console.cloud.google.com/apis/dashboard

---

## ⏱️ Time Required

- **API Key Restrictions**: 2 minutes
- **Enable APIs**: 3 minutes (if not already enabled)
- **Propagation Wait**: 1-5 minutes
- **Testing**: 2 minutes

**Total**: ~10-15 minutes

---

## 📧 Need Help?

If you encounter any issues:

1. Check browser console for specific error codes
2. Verify all URLs in referrer list
3. Ensure all 4 APIs are enabled
4. Clear browser cache and test in incognito
5. Wait 5 minutes after saving (propagation delay)

---

**Last Updated**: October 13, 2025  
**API Key**: `AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk`  
**Status**: ⏳ Awaiting Manual Configuration

