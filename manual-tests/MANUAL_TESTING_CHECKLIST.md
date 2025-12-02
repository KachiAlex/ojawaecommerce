# Manual Testing Checklist

## Security Manual Tests

### Authentication & Authorization

- [ ] **Unauthenticated Access**
  - Try accessing `/admin` without login → Should redirect to login
  - Try accessing `/vendor` without login → Should redirect to login
  - Try accessing user profile without login → Should redirect to login

- [ ] **Role-Based Access**
  - Login as buyer → Try accessing `/admin` → Should be denied
  - Login as vendor → Try accessing `/admin` → Should be denied
  - Login as admin → Should access all areas

- [ ] **Session Management**
  - Login → Close browser → Reopen → Should stay logged in (if remember me)
  - Login → Wait 30+ minutes → Try action → Should require re-login
  - Logout → Try accessing protected route → Should redirect to login

### Input Validation

- [ ] **XSS Attempts**
  - Enter `<script>alert('xss')</script>` in name field → Should be sanitized
  - Enter `javascript:alert('xss')` in URL field → Should be blocked
  - Enter `<img src=x onerror=alert('xss')>` → Should be sanitized

- [ ] **SQL/NoSQL Injection**
  - Enter `' OR '1'='1` in search → Should handle safely
  - Enter `{ "$ne": null }` in form → Should be rejected

- [ ] **File Upload**
  - Upload `.exe` file → Should be rejected
  - Upload `.php` file → Should be rejected
  - Upload file > 10MB → Should be rejected
  - Upload file with `../` in name → Should be sanitized

### API Security

- [ ] **Unauthenticated API Calls**
  - Call Firebase Function without auth → Should return 401
  - Check browser console → No API keys visible
  - Check network tab → No secrets in requests

- [ ] **CORS Validation**
  - Make request from unauthorized domain → Should be blocked
  - Check CORS headers → Should only allow whitelisted origins

---

## Functional Manual Tests

### User Registration

- [ ] **Valid Registration**
  - Fill all required fields
  - Submit → Should create account
  - Should redirect to dashboard/home
  - Should receive confirmation

- [ ] **Invalid Registration**
  - Submit empty form → Should show errors
  - Invalid email → Should show error
  - Weak password → Should show error
  - Mismatched passwords → Should show error

### Product Browsing

- [ ] **Browse Products**
  - View products page → Should load products
  - Filter by category → Should filter correctly
  - Search products → Should return results
  - Sort products → Should sort correctly

- [ ] **Product Details**
  - Click product → Should show details
  - View images → Should load
  - Check price → Should be correct
  - Add to cart → Should work

### Shopping Cart

- [ ] **Cart Operations**
  - Add item → Should appear in cart
  - Remove item → Should be removed
  - Update quantity → Should update total
  - Clear cart → Should empty cart

### Checkout

- [ ] **Checkout Flow**
  - Proceed to checkout → Should show form
  - Fill shipping address → Should save
  - Select payment method → Should work
  - Complete payment → Should create order

### Payment

- [ ] **Payment Processing**
  - Test with Flutterwave test mode → Should work
  - Cancel payment → Should return to cart
  - Payment success → Should create order
  - Check order confirmation → Should be sent

---

## Performance Manual Tests

- [ ] **Page Load Times**
  - Homepage → Should load in < 3s
  - Products page → Should load in < 3s
  - Checkout page → Should load in < 2s

- [ ] **Network Conditions**
  - Test on slow 3G → Should still work
  - Test offline → Should show cached content
  - Test with throttling → Should handle gracefully

---

## Browser Compatibility

- [ ] **Desktop Browsers**
  - Chrome (latest) → All features work
  - Firefox (latest) → All features work
  - Safari (latest) → All features work
  - Edge (latest) → All features work

- [ ] **Mobile Browsers**
  - Chrome Mobile → All features work
  - Safari Mobile → All features work
  - Responsive design → Should adapt

---

## Accessibility Manual Tests

- [ ] **Keyboard Navigation**
  - Tab through all interactive elements → Should be accessible
  - Enter/Space on buttons → Should work
  - Escape on modals → Should close

- [ ] **Screen Reader**
  - Test with NVDA/JAWS → Should announce correctly
  - Check ARIA labels → Should be present
  - Check heading hierarchy → Should be logical

- [ ] **Visual**
  - High contrast mode → Should be readable
  - Zoom to 200% → Should be usable
  - Color blind mode → Should be distinguishable

---

## Security Checklist

- [ ] No API keys in browser console
- [ ] No sensitive data in localStorage
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] CSP working correctly
- [ ] File uploads secured
- [ ] Authentication required
- [ ] Authorization enforced
- [ ] Input sanitized
- [ ] XSS prevented

---

**Last Updated**: November 29, 2024

