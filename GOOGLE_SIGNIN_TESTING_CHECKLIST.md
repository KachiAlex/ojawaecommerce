# Google Sign-In Testing Checklist ✅

You've enabled Google Sign-In in Firebase Console! Now let's test it thoroughly.

---

## 🎯 Quick Test (2 Minutes)

### **Step 1: Open Your Login Page**
Go to: **https://ojawa-ecommerce.web.app/login**

### **Step 2: Select User Type**
Click on **"I'm a Buyer"** (easiest to test first)

### **Step 3: Click Google Sign-In**
Click the **"Sign in with Google"** button

### **Step 4: Choose Account**
- A popup should open (desktop) or redirect (mobile)
- Select your Google account
- Grant permissions

### **Step 5: Verify Success**
You should be:
- ✅ Signed in automatically
- ✅ Redirected to `/dashboard`
- ✅ See your name/email in the navbar
- ✅ See escrow education modal (if new user)

---

## 🔍 Detailed Verification

### **Test 1: New Buyer Account**
```
1. Go to /login
2. Select "I'm a Buyer"
3. Click "Sign in with Google"
4. Use a NEW Google account (not used before)
5. Complete sign-in

Expected Results:
✅ User profile created in Firestore
✅ Wallet created
✅ Role set to "buyer"
✅ Escrow education modal shows
✅ Redirected to dashboard
```

### **Test 2: New Vendor Account**
```
1. Go to /login
2. Select "I'm a Vendor"
3. Click "Sign in with Google"
4. Use a DIFFERENT Google account
5. Complete sign-in

Expected Results:
✅ User profile created
✅ Wallet created
✅ Role set to "vendor"
✅ isVendor flag set to true
✅ Can access vendor dashboard
```

### **Test 3: Existing User Sign-In**
```
1. Sign out (if signed in)
2. Go to /login
3. Select "Already have an account? Sign in here"
4. Click "Sign in with Google"
5. Use account from Test 1 or 2

Expected Results:
✅ Instant sign-in (no profile creation)
✅ No escrow education (already seen)
✅ Redirected to dashboard
✅ All previous data intact
```

### **Test 4: Mobile Browser**
```
1. Open site on mobile device
2. Follow same steps as Test 1
3. Should use redirect flow (not popup)

Expected Results:
✅ Redirected to Google sign-in page
✅ After sign-in, redirected back to app
✅ Signed in successfully
✅ Everything works same as desktop
```

### **Test 5: From Checkout Flow**
```
1. Without signing in, add items to cart
2. Go to checkout
3. Click "Sign in to continue"
4. Sign in with Google
5. Complete sign-in

Expected Results:
✅ After sign-in, redirected BACK to checkout
✅ Cart items still there
✅ Can complete purchase
```

---

## 🔎 Verify in Firebase Console

### **Check 1: User in Authentication**
```
1. Go to Firebase Console → Authentication → Users
2. You should see your test users listed
3. Each user has a Google icon next to their email
4. Click on a user to see details
```

### **Check 2: User Profile in Firestore**
```
1. Go to Firebase Console → Firestore Database
2. Open "users" collection
3. Find your user document (by UID)
4. Verify fields:
   ✅ email: your-email@gmail.com
   ✅ displayName: Your Name
   ✅ photoURL: (Google profile pic)
   ✅ role: buyer/vendor/logistics
   ✅ signInMethod: "google"
   ✅ createdAt: timestamp
   ✅ isVendor: true/false
   ✅ suspended: false
```

### **Check 3: Wallet Created**
```
1. Still in Firestore
2. Open "wallets" collection
3. Find wallet document (userId = your UID)
4. Verify fields:
   ✅ userId: matches your UID
   ✅ balance: 0 (or default amount)
   ✅ currency: NGN
   ✅ status: active
   ✅ transactions: []
```

---

## 🚨 Common Issues & Fixes

### Issue 1: Popup Blocked
**Symptom**: Nothing happens when clicking button

**Fix**: 
- Allow popups for your domain in browser settings
- Try incognito/private mode
- On mobile, should use redirect automatically

---

### Issue 2: "App not verified" Warning
**Symptom**: Google shows "This app hasn't been verified"

**Fix**: 
- This is NORMAL for development
- Click "Advanced" → "Go to Ojawa (unsafe)"
- For production, submit app for Google verification
- Users will trust it once verified

---

### Issue 3: "Domain not authorized"
**Symptom**: Error saying domain not authorized

**Fix**:
1. Go to Firebase Console → Authentication → Sign-in method
2. Scroll to "Authorized domains"
3. Add your domain if missing
4. Try again

---

### Issue 4: Profile Not Created
**Symptom**: Signed in but profile missing in Firestore

**Check**:
1. Firestore rules allow write to users collection
2. Console for JavaScript errors
3. Network tab for failed requests

**Fix**:
```javascript
// Your current Firestore rules should have:
match /users/{userId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth.uid == userId;
}
```

---

### Issue 5: Wallet Not Created
**Symptom**: User exists but no wallet

**Fix**:
- Wallet creation might have failed silently
- Check console for wallet errors
- Manually create wallet or try signing in again

---

## 📊 What to Monitor

### **Success Metrics:**
- [ ] Users can sign in with one click
- [ ] Profiles created correctly
- [ ] Wallets created automatically
- [ ] Correct role assignment
- [ ] Smooth redirect after sign-in
- [ ] Works on mobile and desktop
- [ ] Escrow education shows for new users

### **Performance:**
- [ ] Sign-in completes in < 3 seconds
- [ ] No JavaScript errors in console
- [ ] No failed network requests
- [ ] Profile loads immediately after sign-in

---

## 🎨 UI/UX Checks

### **Visual Verification:**
- [ ] Google button has proper logo
- [ ] Google colors are correct (blue, red, yellow, green)
- [ ] Button shows loading spinner during sign-in
- [ ] "Or continue with" divider looks good
- [ ] Button is disabled during loading
- [ ] Error messages are clear and helpful

### **Responsive Design:**
- [ ] Button looks good on mobile
- [ ] Button looks good on tablet
- [ ] Button looks good on desktop
- [ ] Touch-friendly on mobile
- [ ] Hover effects on desktop

---

## 🔐 Security Checks

### **Verify Security:**
- [ ] Google OAuth flow is secure (https)
- [ ] User tokens are managed by Firebase
- [ ] No sensitive data exposed in console
- [ ] Firestore rules protect user data
- [ ] Email verification from Google

### **Privacy:**
- [ ] Only email and name requested
- [ ] No access to user's Google Drive/Gmail
- [ ] User can revoke access in Google account
- [ ] Privacy policy mentions Google sign-in

---

## 📱 Cross-Browser Testing

### **Desktop Browsers:**
- [ ] Chrome (popup flow)
- [ ] Firefox (popup flow)
- [ ] Safari (popup flow)
- [ ] Edge (popup flow)

### **Mobile Browsers:**
- [ ] Chrome Mobile (redirect flow)
- [ ] Safari iOS (redirect flow)
- [ ] Firefox Mobile (redirect flow)
- [ ] Samsung Internet (redirect flow)

---

## 🎯 Advanced Testing

### **Test Edge Cases:**

#### 1. **User Cancels Sign-In**
```
1. Click "Sign in with Google"
2. Close popup/cancel
3. Should return to login page
4. No error message (graceful handling)
```

#### 2. **Network Error During Sign-In**
```
1. Open DevTools → Network tab
2. Throttle to Slow 3G
3. Try signing in
4. Should show appropriate error
```

#### 3. **Multiple Quick Clicks**
```
1. Click "Sign in with Google" button rapidly
2. Should prevent multiple popups
3. Button should be disabled during loading
```

#### 4. **Sign Out and Sign Back In**
```
1. Sign in with Google
2. Sign out
3. Sign in again with same account
4. Should work instantly
```

#### 5. **Different User Types**
```
1. Sign in as Buyer with Account A
2. Sign out
3. Sign in as Vendor with Account B
4. Verify correct roles assigned
```

---

## 📈 Analytics to Track

### **After Launch, Monitor:**
1. **Adoption Rate**:
   - % using Google vs email/password
   - Track in Firestore: count signInMethod: "google"

2. **Conversion Rate**:
   - Before: X% complete checkout
   - After: Y% complete checkout
   - Expected: 30-40% improvement

3. **Sign-Up Speed**:
   - Before: ~2 minutes (email/password)
   - After: ~5 seconds (Google)

4. **Device Split**:
   - Desktop users: popup flow
   - Mobile users: redirect flow

---

## ✅ Final Checklist

Before rolling out to all users:

- [ ] Tested on desktop with new user
- [ ] Tested on mobile with new user
- [ ] Tested with existing user
- [ ] Verified profile in Firestore
- [ ] Verified wallet creation
- [ ] Checked console for errors
- [ ] Tested in incognito mode
- [ ] Tested sign out and back in
- [ ] Tested from checkout flow
- [ ] Tested all user types (buyer/vendor/logistics)
- [ ] UI looks good on all devices
- [ ] Error handling works
- [ ] Loading states work
- [ ] Google branding correct

---

## 🚀 Ready for Production?

### **If All Tests Pass:**
✅ Google Sign-In is production-ready!
✅ Roll out to all users
✅ Monitor adoption and conversion rates
✅ Gather user feedback

### **Next Steps:**
1. Announce the feature to users
2. Update onboarding materials
3. Monitor Firebase Console for any issues
4. Consider adding more providers (Facebook, Apple)

---

## 🎉 Success!

If you've completed all tests and everything works:

**Congratulations!** 🎊

Your users can now sign in with one click using Google!

---

## 📞 Need Help?

### **If Something's Not Working:**

1. **Check Console Logs**:
   - Open browser DevTools (F12)
   - Look for errors in Console tab
   - Share errors if you need help

2. **Check Network Tab**:
   - See if any requests fail
   - Check Firebase auth requests

3. **Verify Firebase Settings**:
   - Google provider enabled: ✅
   - Support email set: ✅
   - Domain authorized: ✅

4. **Check Firestore Rules**:
   - Users collection writable
   - Wallets collection writable

---

## 📝 Document Issues

If you find any issues during testing:

```markdown
## Issue Template

**What I was doing:**
[e.g., Signing in as new buyer on mobile]

**What happened:**
[e.g., Popup didn't open, no error message]

**Expected:**
[e.g., Should open Google sign-in page]

**Browser/Device:**
[e.g., Chrome on iPhone 12]

**Console Errors:**
[Copy any errors from browser console]
```

---

## 🎯 Summary

**You've enabled Google Sign-In!** ✅

**Now:**
1. Test it yourself (all scenarios above)
2. Share with team for testing
3. Monitor for any issues
4. Roll out to users!

**Expected Results:**
- Faster sign-ups
- Higher conversion rates
- Better user experience
- Less password resets

---

**Let's test it! Start with the Quick Test (Step 1-5) and let me know how it goes!** 🚀

