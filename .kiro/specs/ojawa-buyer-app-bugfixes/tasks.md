# Implementation Plan

## Phase 1: Exploration - Understand the Bugs

- [-] 1. Write bug condition exploration test for navbar scroll bug
  - **Property 1: Bug Condition** - Navbar Remains Fixed During Scroll
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the navbar scrolls away instead of staying fixed
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case: scrollY > 0 with navbar using relative positioning
  - Test implementation details from Bug Condition in design (isBugCondition_Navbar)
  - Simulate scroll events and verify navbar remains visible at top of viewport
  - The test assertions should match the Expected Behavior Properties from design (navbar fixed at top, visible during scroll)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "navbar becomes hidden when scrolling down 500px")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1_

- [ ] 2. Write bug condition exploration test for cart infinite loop bug
  - **Property 1: Bug Condition** - Cart Items Persist Without Infinite Loop
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate cart items disappear due to infinite loop
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case: adding a product to cart with cartItems in useEffect dependency array
  - Test implementation details from Bug Condition in design (isBugCondition_Cart)
  - Add a product to cart and verify it persists without triggering infinite reloads
  - The test assertions should match the Expected Behavior Properties from design (cart items persist, no infinite loop)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "product disappears after being added due to infinite loop")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.2_

## Phase 2: Preservation - Verify Existing Behavior

- [ ] 3. Write preservation property tests for navbar non-scroll behavior
  - **Property 2: Preservation** - Navbar Display Without Scrolling
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: navbar displays correctly on initial page load without scrolling
  - Observe: all navigation links (Home, Categories, How Wallet Works, Track Package) work correctly
  - Observe: cart icon displays with correct item count
  - Observe: user account dropdown menu functions correctly
  - Write property-based tests: for all non-scroll interactions, navbar behavior remains unchanged (from Preservation Requirements in design)
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.4_

- [ ] 4. Write preservation property tests for cart non-infinite-loop behavior
  - **Property 2: Preservation** - Cart Persistence and Item Count
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: cart persists via encrypted localStorage after page refresh
  - Observe: cart item count updates correctly when items are added/removed
  - Observe: multiple items can be added to cart and all persist (when infinite loop is not triggered)
  - Observe: wishlist functionality continues to work
  - Write property-based tests: for all non-infinite-loop cart operations, cart behavior remains unchanged (from Preservation Requirements in design)
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.2, 3.3, 3.4_

## Phase 3: Implementation - Apply the Fixes

- [ ] 5. Fix navbar positioning to remain fixed at top

  - [x] 5.1 Update navbar CSS positioning
    - **File**: `apps/buyer/src/components/Navbar.jsx`
    - **Change**: Replace `relative z-[1000]` with `fixed top-0 left-0 right-0 z-[1000]`
    - **Line**: Line 1 (in the nav className)
    - **Current**: `<nav className="bg-white border-b border-slate-200 shadow-sm relative z-[1000]">`
    - **Updated**: `<nav className="bg-white border-b border-slate-200 shadow-sm fixed top-0 left-0 right-0 z-[1000]">`
    - **Rationale**: 
      - `fixed` removes navbar from document flow and fixes it to viewport
      - `top-0` positions navbar at the top of the viewport
      - `left-0 right-0` ensures navbar spans full viewport width
      - `z-[1000]` maintains high z-index to stay above other content
    - _Bug_Condition: isBugCondition_Navbar(input) where input.scrollY > 0_
    - _Expected_Behavior: navbar.isVisibleInViewport === true AND navbar.position === 'fixed'_
    - _Preservation: navbar displays correctly without scrolling, all links work_
    - _Requirements: 2.1, 3.1, 3.4_

  - [x] 5.2 Add top padding to main content to prevent overlap
    - **File**: `apps/buyer/src/components/Navbar.jsx` or main layout wrapper
    - **Change**: Add top padding to main content area to account for fixed navbar height (64px = h-16)
    - **Details**: The navbar is now fixed, so main content needs `pt-16` or `mt-16` to prevent overlap
    - **Verification**: Check that content below navbar is not hidden behind the fixed navbar
    - _Bug_Condition: isBugCondition_Navbar(input) where input.scrollY > 0_
    - _Expected_Behavior: main content is not hidden behind fixed navbar_
    - _Preservation: navbar displays correctly without scrolling_
    - _Requirements: 2.1, 3.1_

  - [x] 5.3 Verify navbar remains fixed during scroll
    - **Property 1: Expected Behavior** - Navbar Remains Fixed During Scroll
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms navbar bug is fixed)
    - Verify navbar stays at top when scrolling down
    - Verify navbar is visible and accessible during scroll
    - _Requirements: 2.1_

- [ ] 6. Fix cart infinite loop by removing cartItems from useEffect dependency array

  - [x] 6.1 Update CartContext useEffect dependency array
    - **File**: `apps/buyer/src/contexts/CartContext.jsx`
    - **Change**: Remove `cartItems` from the dependency array of the first useEffect
    - **Line**: Line 23 (the closing of the first useEffect)
    - **Current**: `}, [cartItems]);`
    - **Updated**: `}, []);`
    - **Rationale**:
      - Empty dependency array means the effect runs only once on mount
      - This prevents the infinite loop caused by cartItems changes
      - The effect loads the initial cart from storage and sets hasLoaded to true
      - The third effect (save effect) already handles persisting cartItems changes
      - The second effect (auth effect) handles loading cart after auth resolves
    - _Bug_Condition: isBugCondition_Cart(input) where input.action IN ['addToCart', 'removeFromCart', 'updateQuantity']_
    - _Expected_Behavior: cartItems persist without infinite loop, items remain in cart_
    - _Preservation: cart persists via localStorage, item count updates correctly_
    - _Requirements: 2.2, 3.2, 3.3, 3.4_

  - [x] 6.2 Verify cart items persist without infinite loop
    - **Property 1: Expected Behavior** - Cart Items Persist Without Infinite Loop
    - **IMPORTANT**: Re-run the SAME test from task 2 - do NOT write a new test
    - The test from task 2 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 2
    - **EXPECTED OUTCOME**: Test PASSES (confirms cart bug is fixed)
    - Verify products added to cart persist
    - Verify no infinite loop is triggered
    - Verify cart items are accessible on cart page
    - _Requirements: 2.2_

  - [x] 6.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Cart Persistence and Item Count
    - **IMPORTANT**: Re-run the SAME tests from task 4 - do NOT write new tests
    - Run preservation property tests from step 4
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm cart persists after page refresh
    - Confirm cart item count updates correctly
    - Confirm multiple items can be added and all persist
    - _Requirements: 3.2, 3.3, 3.4_

## Phase 4: Validation - Verify Both Fixes Together

- [x] 7. Checkpoint - Ensure all tests pass and both fixes work together
  - Verify bug condition exploration test for navbar PASSES (task 1 → task 5.3)
  - Verify bug condition exploration test for cart PASSES (task 2 → task 6.2)
  - Verify preservation tests for navbar PASS (task 3)
  - Verify preservation tests for cart PASS (task 4 → task 6.3)
  - Test full user flow: add product to cart → scroll down → verify navbar stays fixed and cart icon is accessible
  - Test full user flow: add multiple products → refresh page → verify all products persist in cart
  - Test full user flow: add product → navigate pages → verify cart persists and navbar works correctly
  - Verify no console errors or warnings related to the fixes
  - Verify mobile responsiveness: navbar stays fixed on mobile, cart works on mobile
  - Mark complete when all tests pass and both fixes work together without regressions
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_
