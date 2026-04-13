# Ojawa Auth Bugfixes - Implementation Tasks

## Overview

This task list implements the bugfix for OTP sending and dashboard redirect issues in the authentication flow. The workflow follows the exploratory bugfix methodology: first write tests to surface the bugs, then implement fixes, then verify the fixes work and preserve existing behavior.

---

## Phase 1: Bug Exploration & Preservation Testing

### Task 1: Write Bug Condition Exploration Test

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - OTP Sending and Dashboard Redirect Failures
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to concrete failing cases to ensure reproducibility
  
  **Test Implementation Details from Bug Condition in design:**
  - Test OTP sending for buyer account creation with email "buyer@example.com"
  - Test post-verification redirect for buyer (should redirect to /buyer)
  - Test login redirect for buyer (should redirect to /buyer)
  
  **The test assertions should match the Expected Behavior Properties from design:**
  - OTP sends successfully without "Email is required" error
  - User is redirected to role-specific dashboard after verification
  - User is redirected to role-specific dashboard after login
  
  **Run test on UNFIXED code:**
  - Create test file: `apps/buyer/src/__tests__/authBugCondition.test.js`
  - Run: `npm test -- authBugCondition.test.js --run`
  
  **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bugs exist)
  - OTP send fails with "Email is required" error
  - Post-verification redirect does not occur
  - Login redirect goes to generic /dashboard instead of role-specific route
  
  **Document counterexamples found to understand root cause:**
  - Record specific error messages from OTP send failures
  - Record actual redirect URLs vs expected redirect URLs
  - Identify which components/functions are responsible for each failure
  
  **Mark task complete when test is written, run, and failure is documented**
  - _Requirements: 1.1, 1.2, 1.3_

---

### Task 2: Write Preservation Property Tests

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Authentication Flows
  - **IMPORTANT**: Follow observation-first methodology
  - **GOAL**: Capture existing behavior that must be preserved after the fix
  
  **Observe behavior on UNFIXED code for non-buggy inputs:**
  - Test existing user login (user already verified) - should work normally
  - Test registration form validation - should reject invalid emails
  - Test logout functionality - should clear auth state
  
  **Write property-based tests capturing observed behavior patterns from Preservation Requirements:**
  - Property: For all existing verified users, login should succeed and redirect to dashboard
  - Property: For all invalid email formats, registration form should show validation error
  - Property: For all logout operations, user should be redirected to login page
  
  **Property-based testing generates many test cases for stronger guarantees:**
  - Use fast-check or similar library to generate random test cases
  - Test with various email formats, passwords, user types
  - Verify behavior is consistent across all generated cases
  
  **Run tests on UNFIXED code:**
  - Create test file: `apps/buyer/src/__tests__/authPreservation.test.js`
  - Run: `npm test -- authPreservation.test.js --run`
  
  **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - All existing authentication flows work as expected
  - Form validation works correctly
  - Logout and Google Sign-In work correctly
  - User profiles and wallets are created correctly
  
  **Mark task complete when tests are written, run, and passing on unfixed code**
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

---

## Phase 2: Implementation

### Task 3: Fix OTP Sending and Dashboard Redirect

- [x] 3. Fix for OTP sending and dashboard redirect bugs

  - [x] 3.1 Fix OTP sending in emailOTPService.js
    - **File**: `apps/buyer/src/utils/emailOTPService.js`
    - **Function**: `sendOTP(email, purpose, customMessage)`
    - **Changes**:
      1. Verify email parameter is correctly passed to backend endpoint
      2. Ensure the `apiPost('/sendEmailOTP', {...})` call includes email in request body with correct parameter name
      3. Add email validation to ensure email is not null/undefined before API call
      4. Throw clear error if email is missing
      5. Improve error handling to distinguish between "email missing" and other API errors
    - **Validation**: OTP should send successfully for all user types (buyer, vendor, logistics)
    - _Bug_Condition: isBugCondition(input) where input.action = 'create_account' AND input.email IS NOT NULL_
    - _Expected_Behavior: expectedBehavior(result) = OTP sent successfully without "Email is required" error_
    - _Preservation: Existing OTP functionality for password resets and other flows must continue to work_
    - _Requirements: 2.1_

  - [x] 3.2 Add post-verification redirect in Register.jsx
    - **File**: `apps/buyer/src/pages/Register.jsx`
    - **Function**: `handleSubmit(e)` and component logic
    - **Changes**:
      1. Store post-verification destination based on user's userType in component state
      2. Implement logic to detect when email verification is complete
      3. Create helper function to map userType to dashboard URL:
         - 'buyer' → '/buyer'
         - 'vendor' → '/vendor'
         - 'logistics' → '/logistics'
      4. Add redirect after verification completes (via callback, polling, or button)
      5. Ensure redirect happens automatically or provide clear user guidance
    - **Validation**: User should be redirected to role-specific dashboard after email verification
    - _Bug_Condition: isBugCondition(input) where input.action = 'verify_email' AND noRedirectOccurs()_
    - _Expected_Behavior: expectedBehavior(result) = User redirected to role-specific dashboard_
    - _Preservation: Registration form validation and user profile creation must continue to work_
    - _Requirements: 2.2_

  - [x] 3.3 Implement role-based redirect in Login.jsx
    - **File**: `apps/buyer/src/pages/Login.jsx`
    - **Function**: `handleSubmit(e)` and `handleGoogleSignIn()`
    - **Changes**:
      1. Retrieve user's role/type from authenticated user object or AuthContext after login
      2. Replace hardcoded `/dashboard` redirect with role-specific routing:
         - If user.userType = 'buyer', redirect to '/buyer'
         - If user.userType = 'vendor', redirect to '/vendor'
         - If user.userType = 'logistics', redirect to '/logistics'
         - Fall back to '/dashboard' if role cannot be determined
      3. Apply role-based redirect to both `handleSubmit()` (email/password) and `handleGoogleSignIn()` (Google Sign-In)
      4. Ensure redirect happens after user is fully authenticated
    - **Validation**: User should be redirected to role-specific dashboard after login
    - _Bug_Condition: isBugCondition(input) where input.action = 'login_after_verify' AND redirectsToGenericDashboard()_
    - _Expected_Behavior: expectedBehavior(result) = User redirected to role-specific dashboard based on userType_
    - _Preservation: Login form validation and authentication must continue to work for all user types_
    - _Requirements: 2.3_

  - [x] 3.4 Ensure user role is stored in AuthContext.jsx
    - **File**: `apps/buyer/src/contexts/AuthContext.jsx`
    - **Function**: `signin()` and `signInWithGoogle()`
    - **Changes**:
      1. Verify user object returned from backend includes userType/role field
      2. If not present, fetch userType from user profile after authentication
      3. Store userType in user object so it's available to components
      4. Expose userType in context value returned by `useAuth()` hook
      5. Ensure userType is accessible in Login and Register components
    - **Validation**: User role should be accessible from AuthContext after login/signup
    - _Bug_Condition: isBugCondition(input) where user.userType IS NULL OR UNDEFINED_
    - _Expected_Behavior: expectedBehavior(result) = user.userType is properly stored and accessible_
    - _Preservation: Existing authentication state management must continue to work_
    - _Requirements: 2.1, 2.2, 2.3_

---

## Phase 3: Verification

### Task 4: Verify Bug Condition Test Now Passes

- [x] 4. Verify bug condition exploration test now passes
  - **Property 1: Expected Behavior** - OTP Sending and Dashboard Redirect Success
  - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
  - **NOTE**: The test from task 1 encodes the expected behavior
  - **GOAL**: When this test passes, it confirms the expected behavior is satisfied
  
  **Run bug condition exploration test from step 1:**
  - Run: `npm test -- authBugCondition.test.js --run`
  
  **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
  - OTP sends successfully without "Email is required" error for all user types
  - User is redirected to role-specific dashboard after email verification
  - User is redirected to role-specific dashboard after login
  
  **Verify all counterexamples from task 1 are now resolved:**
  - OTP send succeeds for buyer, vendor, and logistics accounts
  - Post-verification redirect occurs to correct dashboard
  - Login redirect goes to role-specific dashboard, not generic /dashboard
  
  **Mark task complete when test passes**
  - _Requirements: 2.1, 2.2, 2.3_

---

### Task 5: Verify Preservation Tests Still Pass

- [x] 5. Verify preservation tests still pass
  - **Property 2: Preservation** - Existing Authentication Flows Unchanged
  - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
  - **NOTE**: The tests from task 2 capture real behavior that must be preserved
  - **GOAL**: When these tests pass, it confirms no regressions were introduced
  
  **Run preservation property tests from step 2:**
  - Run: `npm test -- authPreservation.test.js --run`
  
  **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
  - All existing authentication flows continue to work
  - Form validation continues to work correctly
  - Logout and Google Sign-In continue to work
  - User profiles and wallets continue to be created correctly
  
  **Confirm all tests still pass after fix:**
  - Existing user login works normally
  - Registration form validation works correctly
  - Logout functionality works correctly
  - Google Sign-In works correctly
  - User profiles and wallets are created correctly
  
  **Mark task complete when all tests pass**
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

---

### Task 6: Integration Testing

- [ ] 6. Integration testing for buyer user type
  - **Goal**: Verify complete registration and login flows work correctly for buyer user type
  
  - [x] 6.1 Test buyer registration and login flow
    - Create buyer account with email "buyer@example.com"
    - Verify OTP is sent successfully
    - Verify email verification works
    - Verify redirect to /buyer dashboard occurs
    - Verify buyer can login and is redirected to /buyer dashboard
    - _Requirements: 2.1, 2.2, 2.3_

---

### Task 7: Checkpoint - Ensure All Tests Pass

- [x] 7. Checkpoint - Ensure all tests pass
  - Run all unit tests: `npm test -- --run`
  - Run all integration tests
  - Verify bug condition tests pass
  - Verify preservation tests pass
  - Verify no console errors or warnings
  - Verify all user types can complete registration and login flows
  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

---

## Summary

This implementation plan follows the exploratory bugfix workflow:

1. **Explore** (Task 1): Write tests that surface the bugs on unfixed code
2. **Preserve** (Task 2): Write tests that capture existing behavior to preserve
3. **Implement** (Task 3): Apply fixes based on understanding from exploration
4. **Validate** (Tasks 4-7): Verify fixes work and preserve existing behavior

The fixes address:
- OTP sending failures in emailOTPService.js
- Missing post-verification redirect in Register.jsx
- Generic dashboard redirect in Login.jsx
- User role storage in AuthContext.jsx

All fixes are validated through property-based tests that ensure correctness and preservation of existing functionality.
