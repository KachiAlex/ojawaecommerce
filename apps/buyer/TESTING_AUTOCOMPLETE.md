# 🧪 Testing Google Maps Autocomplete

## Quick Test Page

I've created a dedicated test page to help you debug and verify the autocomplete functionality.

### Access the Test Page

1. **Start your development server:**
   ```bash
   cd apps/buyer
   npm run dev
   ```

2. **Open the test page:**
   ```
   http://localhost:5173/test-autocomplete
   ```

### What You'll See

The test page includes:

1. **✅ System Diagnostics**
   - Google Maps loaded status
   - Places API availability
   - API key configuration
   - Service initialization status

2. **🎯 Live Test Form**
   - Real AddressInput component
   - Type and see autocomplete suggestions
   - Watch the component in action

3. **📊 Activity Log**
   - Real-time debugging information
   - See exactly what's happening
   - Identify any errors instantly

4. **💡 Instructions & Troubleshooting**
   - Step-by-step testing guide
   - Common issues and fixes
   - Quick diagnostic help

---

## How to Test

### 1. Check Diagnostics (Top Section)

All four items should show ✅ green checkmarks:
- ✅ Google Maps Loaded
- ✅ Places API Available  
- ✅ API Key Configured
- ✅ Service Initialized

**If you see ❌ red X marks, check the troubleshooting section below.**

### 2. Test the Autocomplete

1. Click on the "Street Address" field
2. Start typing: **"15 Marina"** or **"Victoria Island"**
3. Wait ~0.5 seconds
4. **You should see a dropdown with suggestions**
5. Click any suggestion
6. All fields should auto-fill!

### 3. Check the Activity Log

Scroll down to see detailed logs of what's happening:
- 🔍 When you start typing
- 📍 When predictions are fetched
- ✅ When suggestions appear
- ❌ Any errors that occur

---

## Expected Behavior

### ✅ Working Correctly

When autocomplete is working, you'll see:

```
🚀 Starting Google Maps initialization...
📡 Google Maps initialized: true
🎯 Creating AutocompleteService...
✅ Google Places Autocomplete fully initialized!
🔍 Fetching predictions for "15 Mar" (type: street)
📍 Autocomplete status: OK
📍 Predictions received: 5
✅ Setting autocomplete results: 5
```

**AND** you'll see a dropdown like this:

```
┌─────────────────────────────────────────┐
│ 📍 Powered by Google Maps               │
├─────────────────────────────────────────┤
│ 📍 15 Marina Street                     │
│    Lagos Island, Lagos, Nigeria         │
├─────────────────────────────────────────┤
│ 📍 15 Marine Road                       │
│    Apapa, Lagos, Nigeria                │
└─────────────────────────────────────────┘
```

### ❌ Common Issues

#### Issue 1: No Dropdown Appears

**Symptoms:**
- You type but nothing happens
- No dropdown shows up

**Check:**
1. Open browser console (F12)
2. Look for error messages
3. Check if you see: "Autocomplete service not available"

**Solutions:**
- Verify internet connection
- Check API key in `vite.config.js`
- Ensure Places API is enabled in Google Cloud Console
- Reload the page (Ctrl+R)

#### Issue 2: "REQUEST_DENIED" Error

**Symptoms:**
- Console shows "REQUEST_DENIED"
- Autocomplete doesn't work

**Solutions:**
1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your API key
3. Under "HTTP referrers", add:
   ```
   http://localhost:5173/*
   http://localhost:*
   https://ojawa-ecommerce.web.app/*
   ```
4. Click "Save"
5. Wait 1-2 minutes for changes to take effect
6. Reload the page

#### Issue 3: "ZERO_RESULTS"

**Symptoms:**
- Dropdown doesn't appear
- Console shows "ZERO_RESULTS"

**Solutions:**
- Try a more common address (e.g., "Lagos" instead of obscure street)
- Make sure you're typing at least 3 characters
- Check your country restriction (currently set to Nigeria)

#### Issue 4: Google Maps Not Loading

**Symptoms:**
- Diagnostics show ❌ for "Google Maps Loaded"
- Console shows script loading errors

**Solutions:**
1. Check your internet connection
2. Verify API key in `apps/buyer/vite.config.js`:
   ```javascript
   VITE_GOOGLE_MAPS_API_KEY: 'AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk'
   ```
3. Make sure the API key is valid
4. Check if APIs are enabled in Google Cloud Console

---

## Debugging with Browser Console

### Open Console

- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)
- **Firefox**: Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
- **Safari**: Enable "Develop" menu → Develop → Show JavaScript Console

### What to Look For

**Good Signs (Everything Working):**
```
✅ Google Maps loaded successfully
✅ Google Places Autocomplete fully initialized!
🔍 Fetching predictions for "15 Mar" (type: street)
📍 Autocomplete status: OK
📍 Predictions received: 5
```

**Bad Signs (Something's Wrong):**
```
❌ Failed to initialize Google Maps
❌ Autocomplete error: REQUEST_DENIED
⚠️ Autocomplete service not available yet
❌ Google Maps Places API not available
```

---

## Testing on Different Pages

Once the test page works, try it on real pages:

### 1. Cart Page (`/cart`)
```
http://localhost:5173/cart
```
- Scroll to delivery address section
- Type in the address field
- Should see autocomplete!

### 2. Vendor Registration (`/become-vendor`)
```
http://localhost:5173/become-vendor
```
- Find business address section
- Type in the address field
- Should see autocomplete!

---

## Verifying API Setup

### Check API Key

1. Open `apps/buyer/vite.config.js`
2. Verify this line exists:
   ```javascript
   'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify('AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk'),
   ```

### Check Google Cloud Console

1. Go to [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Find your API key: `AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk`
3. Click on it

**Verify HTTP Referrers:**
```
http://localhost:5173/*
http://localhost:*
http://127.0.0.1:*
https://ojawa-ecommerce.web.app/*
https://ojawa-ecommerce.firebaseapp.com/*
```

**Verify Enabled APIs:**
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API
- ✅ Directions API

---

## Performance Testing

### Test Different Scenarios

1. **Fast Typing:**
   - Type "Lagos" quickly
   - Autocomplete should debounce (wait 0.5s)
   - Should show 1 request, not multiple

2. **Slow Typing:**
   - Type "L"... wait... "a"... wait... "g"
   - Should trigger multiple requests (each after 0.5s pause)

3. **Backspace:**
   - Type "Lagos"
   - Backspace to "Lag"
   - Suggestions should update

4. **Clear and Retype:**
   - Type something, select it
   - Clear the field
   - Type something else
   - Should work again

---

## Next Steps

### If Test Page Works ✅

Great! The autocomplete is working. Now:
1. Test on `/cart` page
2. Test on `/become-vendor` page
3. Test on mobile devices
4. Deploy to production

### If Test Page Doesn't Work ❌

Don't worry! Follow these steps:
1. Check the diagnostics section (all should be ✅)
2. Look at the activity log for errors
3. Open browser console for detailed errors
4. Follow the troubleshooting guide above
5. If still stuck, check the documentation files:
   - `ADDRESS_AUTOCOMPLETE_GUIDE.md`
   - `GOOGLE_MAPS_AUTOCOMPLETE_SUMMARY.md`

---

## Support

### Documentation Files
- `ADDRESS_AUTOCOMPLETE_GUIDE.md` - Complete guide
- `AUTOCOMPLETE_VISUAL_GUIDE.md` - UI/UX reference
- `GOOGLE_MAPS_AUTOCOMPLETE_SUMMARY.md` - Technical overview
- `IMPLEMENTATION_COMPLETE.md` - Implementation details
- `TESTING_AUTOCOMPLETE.md` - This file

### Component Location
- **File**: `apps/buyer/src/components/AddressInput.jsx`
- **Test Page**: `apps/buyer/src/pages/TestAutocomplete.jsx`

---

## Quick Command Reference

```bash
# Start dev server
cd apps/buyer
npm run dev

# Open test page
# http://localhost:5173/test-autocomplete

# Check for errors
# Open browser console (F12)

# Rebuild if needed
npm run build
```

---

**Happy Testing!** 🚀

If everything works on the test page, it will work everywhere else too!

