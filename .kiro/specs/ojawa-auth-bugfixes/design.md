# Ojawa Auth Bugfixes Design

## Overview

This design document addresses two critical bugs in the Ojawa e-commerce authentication flow that prevent users from completing registration and accessing their role-specific dashboards. The first bug causes OTP sending to fail with a "Email is required" error during account creation. The second bug prevents users from being redirected to their appropriate dashboards after email verification. These bugs significantly impact the onboarding experience for all user types (buyers, vendors, and logistics partners).

The fix strategy involves:
1. Correcting the OTP service's API call to include the email parameter properly
2. Adding post-verification redirect logic to Register component
3. Implementing role-based dashboard routing in Login component
4. Ensuring user role/type is properly stored and retrieved from AuthContext

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when users attempt to create accounts or verify emails, the OTP sending fails or redirects are missing
- **Property (P)**: The desired behavior when users complete registration and verification - OTP sends successfully and users are redirected to role-specific dashboards
- **Preservation**: Existing authentication flows, form validation, and user profile management that must remain unchanged
- **emailOTPService**: The utility in `apps/buyer/src/utils/emailOTPService.js` that handles OTP generation, storage, and email delivery
- **AuthContext**: The context in `apps/buyer/src/contexts/AuthContext.jsx` that manages user authentication state and user profile data
- **Register**: The component in `apps/buyer/src/pages/Register.jsx` that handles user account creation and email verification
- **Login**: The component in `apps/buyer/src/pages/Login.jsx` that handles user authentication and post-login redirects
- **userType**: The property that identifies the user's role (buyer, vendor, or logistics)

## Bug Details

### Bug Condition

The bugs manifest when:
1. A user creates a new account (buyer, vendor, or logistics) - the OTP sending fails with "Email is required" error
2. A user verifies their email during registration - no redirect occurs to any dashboard
3. A user verifies their email and logs in - redirect goes to generic `/dashboard` instead of role-specific route

The `emailOTPService.sendOTP()` function is either not passing the email parameter correctly to the backend endpoint, or the backend endpoint is not receiving it. The Register and Login components lack proper redirect logic after email verification.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type {action: string, userType: string, email: string}
  OUTPUT: boolean
  
  RETURN (input.action IN ['create_account', 'verify_email', 'login_after_verify'])
         AND input.email IS NOT NULL
         AND input.userType IN ['buyer', 'vendor', 'logistics']
         AND (
           (input.action = 'create_account' AND otpSendFails(input.email))
           OR (input.action = 'verify_email' AND noRedirectOccurs())
           OR (input.action = 'login_after_verify' AND redirectsToGenericDashboard())
         )
END FUNCTION
```

### Examples

**Example 1: OTP Send Failure During Registration**
- User fills registration form with email "buyer@example.com" and user type "buyer"
- User clicks "Create Account" button
- Expected: OTP email sent successfully, user sees verification prompt
- Actual: Error "Email is required" appears, user cannot proceed

**Example 2: Missing Redirect After Email Verification**
- User creates account and receives OTP email
- User clicks verification link in email
- Expected: User redirected to `/buyer` dashboard (for buyer user type)
- Actual: User remains on verification page or redirected to generic `/dashboard`

**Example 3: Generic Dashboard Redirect After Login**
- Vendor user verifies email and logs in
- Expected: User redirected to `/vendor` dashboard
- Actual: User redirected to generic `/dashboard` route

**Example 4: Logistics Partner Onboarding**
- Logistics partner creates account with email "logistics@example.com"
- Expected: OTP sent successfully, then redirected to `/logistics` after verification
- Actual: OTP send fails with "Email is required" error

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Registration form validation must continue to work (email format, password strength, required fields)
- User profile creation and storage must remain unchanged
- Wallet creation for new users must continue to work
- Email verification flow must continue to function
- Login form validation and authentication must remain unchanged
- Logout functionality must continue to work
- Google Sign-In must continue to work
- User profile updates must continue to work
- Cart context and intended destination tracking must continue to work

**Scope:**
All inputs that do NOT involve account creation, email verification, or post-login redirects should be completely unaffected by this fix. This includes:
- Existing user logins (already verified)
- Password reset flows
- Profile update operations
- Logout operations
- Navigation between pages
- Form validation logic

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Incorrect Email Parameter in OTP Service**: The `emailOTPService.sendOTP()` function calls `apiPost('/sendEmailOTP', {...})` but the backend endpoint may expect the email in a different parameter name or format. The email might not be passed correctly to the backend.

2. **Missing Redirect Logic in Register Component**: The Register component successfully creates the account and triggers OTP sending, but lacks redirect logic after email verification. The component shows a verification prompt but doesn't navigate to the dashboard after verification completes.

3. **Generic Dashboard Redirect in Login Component**: The Login component redirects to a hardcoded `/dashboard` route after successful login, without checking the user's role/type. It should redirect to `/buyer`, `/vendor`, or `/logistics` based on the user's userType.

4. **User Role Not Stored in AuthContext**: The AuthContext may not be properly storing or retrieving the user's role/type, making it impossible for components to determine the correct dashboard route.

5. **Missing Role-Based Routing Logic**: Neither Register nor Login components implement logic to determine the correct dashboard URL based on user type. They need to either:
   - Query the user's profile to get their role
   - Use the userType from the signup/login flow
   - Store the role in AuthContext for later retrieval

## Correctness Properties

Property 1: Bug Condition - OTP Sending and Dashboard Redirect

_For any_ input where a user creates an account with a valid email and user type, the fixed authentication flow SHALL successfully send the OTP email without "Email is required" errors, and after email verification SHALL redirect the user to their role-specific dashboard (buyer → /buyer, vendor → /vendor, logistics → /logistics).

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Existing Authentication Flows

_For any_ input that does NOT involve account creation or post-verification redirects (existing user logins, password resets, profile updates, logout), the fixed code SHALL produce the same result as the original code, preserving all existing authentication functionality and user experience.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `apps/buyer/src/utils/emailOTPService.js`

**Function**: `sendOTP(email, purpose, customMessage)`

**Specific Changes**:
1. **Verify Email Parameter Passing**: Ensure the email parameter is correctly passed to the backend endpoint. The `apiPost('/sendEmailOTP', {...})` call should include `email` in the request body with the correct parameter name expected by the backend.

2. **Add Email Validation**: Add validation to ensure email is not null/undefined before making the API call. Throw a clear error if email is missing.

3. **Improve Error Handling**: Enhance error messages to distinguish between "email missing" errors and other API errors.

---

**File 2**: `apps/buyer/src/pages/Register.jsx`

**Function**: `handleSubmit(e)` and component logic

**Specific Changes**:
1. **Store Post-Verification Destination**: After successful signup, store the intended dashboard URL based on the user's userType in component state (already partially done with `postVerificationDestination`).

2. **Add Redirect After Verification**: Implement logic to detect when email verification is complete and redirect to the role-specific dashboard. This could be done by:
   - Monitoring for verification completion (e.g., via a callback or polling)
   - Using the `postVerificationDestination` state to navigate after verification
   - Providing a button that navigates to the dashboard after user confirms verification

3. **Determine Dashboard URL**: Create a helper function that maps userType to dashboard URL:
   - 'buyer' → '/buyer'
   - 'vendor' → '/vendor'
   - 'logistics' → '/logistics'

---

**File 3**: `apps/buyer/src/pages/Login.jsx`

**Function**: `handleSubmit(e)` and `handleGoogleSignIn()`

**Specific Changes**:
1. **Retrieve User Role After Login**: After successful login, retrieve the user's role/type from the authenticated user object or from AuthContext.

2. **Implement Role-Based Redirect**: Replace the hardcoded `/dashboard` redirect with role-specific routing:
   - If user.userType or userProfile.userType is 'buyer', redirect to '/buyer'
   - If user.userType or userProfile.userType is 'vendor', redirect to '/vendor'
   - If user.userType or userProfile.userType is 'logistics', redirect to '/logistics'
   - Fall back to '/dashboard' if role cannot be determined

3. **Apply to Both Email/Password and Google Sign-In**: Ensure role-based redirect logic is applied to both `handleSubmit()` (email/password login) and `handleGoogleSignIn()` (Google Sign-In).

---

**File 4**: `apps/buyer/src/contexts/AuthContext.jsx`

**Function**: `signin()` and `signInWithGoogle()`

**Specific Changes**:
1. **Ensure User Role is Stored**: Verify that the user object returned from the backend includes the userType/role field. If not, fetch it from the user profile.

2. **Store Role in User Object**: Ensure the user object stored in `currentUser` state includes the userType field so it's available to components.

3. **Expose Role in Context Value**: Ensure the userType is accessible from the context value returned by `useAuth()` hook.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate account creation, email verification, and login flows for each user type. Run these tests on the UNFIXED code to observe failures and understand the root causes.

**Test Cases**:
1. **OTP Send Test - Buyer**: Create a buyer account and verify OTP is sent without "Email is required" error (will fail on unfixed code)
2. **OTP Send Test - Vendor**: Create a vendor account and verify OTP is sent without errors (will fail on unfixed code)
3. **OTP Send Test - Logistics**: Create a logistics account and verify OTP is sent without errors (will fail on unfixed code)
4. **Post-Verification Redirect - Buyer**: Verify email and confirm redirect to `/buyer` dashboard (will fail on unfixed code)
5. **Post-Verification Redirect - Vendor**: Verify email and confirm redirect to `/vendor` dashboard (will fail on unfixed code)
6. **Login Redirect - Buyer**: Login as buyer and confirm redirect to `/buyer` dashboard (will fail on unfixed code)
7. **Login Redirect - Vendor**: Login as vendor and confirm redirect to `/vendor` dashboard (will fail on unfixed code)
8. **Login Redirect - Logistics**: Login as logistics and confirm redirect to `/logistics` dashboard (will fail on unfixed code)

**Expected Counterexamples**:
- OTP send fails with "Email is required" error when email is provided
- After email verification, user is not redirected to any dashboard
- After login, user is redirected to generic `/dashboard` instead of role-specific route
- Possible causes: email parameter not passed correctly, missing redirect logic, hardcoded dashboard URL

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedAuthFlow(input)
  ASSERT otpSentSuccessfully(result)
  ASSERT userRedirectedToRoleDashboard(result, input.userType)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalAuthFlow(input) = fixedAuthFlow(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for existing user logins, password resets, and profile updates, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Existing User Login Preservation**: Verify existing users can still login and are redirected correctly
2. **Form Validation Preservation**: Verify registration form validation continues to work
3. **Profile Creation Preservation**: Verify user profiles are created correctly
4. **Wallet Creation Preservation**: Verify wallets are created for new users
5. **Logout Preservation**: Verify logout functionality continues to work
6. **Google Sign-In Preservation**: Verify Google Sign-In continues to work

### Unit Tests

- Test OTP sending with valid email for each user type
- Test OTP sending with missing email (should fail gracefully)
- Test post-verification redirect logic for each user type
- Test role-based dashboard routing in Login component
- Test that user role is properly stored in AuthContext
- Test that existing login flows continue to work

### Property-Based Tests

- Generate random user types and verify correct dashboard redirect
- Generate random email addresses and verify OTP sending works
- Generate random login scenarios and verify role-based routing
- Test that all non-buggy inputs produce same behavior as original code

### Integration Tests

- Test full registration flow for each user type (create account → receive OTP → verify email → redirect to dashboard)
- Test full login flow for each user type (login → redirect to role-specific dashboard)
- Test Google Sign-In flow for each user type
- Test switching between user types and verifying correct redirects
- Test that verified users can login and access their dashboards
