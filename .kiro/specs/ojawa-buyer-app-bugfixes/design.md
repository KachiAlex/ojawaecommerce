# Ojawa Buyer App Bugfixes Design

## Overview

This design document addresses two critical bugs in the Ojawa e-commerce buyer app that significantly impact user experience:

1. **Fixed Header Bug**: The navbar uses `relative z-[1000]` positioning instead of `fixed` positioning, causing it to scroll away when users scroll down the page. This makes navigation inaccessible during browsing.

2. **Cart Items Disappearing Bug**: The CartContext has an infinite loop in its initial load effect due to `cartItems` being in the dependency array of the first useEffect. This causes the cart to continuously reload and lose items.

The fix strategy is to make targeted, minimal changes to restore correct behavior while preserving all existing functionality for non-buggy inputs.

## Glossary

- **Bug_Condition (C)**: The specific conditions that trigger each bug
  - For navbar: User scrolls down the page
  - For cart: Initial cart load or cart state changes
- **Property (P)**: The desired behavior when the bug condition is met
  - For navbar: Navbar remains fixed at top of viewport
  - For cart: Cart items persist without infinite reloading
- **Preservation**: Existing behavior that must remain unchanged by the fixes
  - Navbar displays correctly without scrolling
  - Cart persists via encrypted localStorage
  - Cart item count updates correctly
- **Navbar**: The navigation component in `apps/buyer/src/components/Navbar.jsx` that displays site navigation, cart icon, and user account menu
- **CartContext**: The React context in `apps/buyer/src/contexts/CartContext.jsx` that manages cart state and persistence
- **useEffect dependency array**: The second parameter to useEffect that controls when the effect runs; including `cartItems` causes re-runs whenever cart changes

## Bug Details

### Bug 1: Fixed Header Bug

#### Bug Condition

The bug manifests when a user scrolls down the page. The navbar uses `relative z-[1000]` positioning instead of `fixed` positioning, causing it to scroll away with the page content instead of remaining at the top of the viewport.

**Formal Specification:**
```
FUNCTION isBugCondition_Navbar(input)
  INPUT: input of type ScrollEvent
  OUTPUT: boolean
  
  RETURN input.scrollY > 0
         AND navbar.position === 'relative'
         AND navbar.isVisibleInViewport === false
END FUNCTION
```

#### Examples

- **Example 1**: User on home page scrolls down 500px → navbar scrolls away and becomes hidden → user cannot access navigation links or cart
- **Example 2**: User on products page scrolls to view more items → navbar disappears → user must scroll back to top to access cart
- **Example 3**: User on mobile device scrolls down → navbar scrolls away → mobile menu becomes inaccessible
- **Edge Case**: User scrolls back to top → navbar reappears (correct behavior, but only because of scroll position, not because navbar is fixed)

### Bug 2: Cart Items Disappearing Bug

#### Bug Condition

The bug manifests when the cart context initializes or when cart items change. The first useEffect has `cartItems` in its dependency array, which causes it to re-run whenever `cartItems` changes. This creates an infinite loop: the effect loads the cart, which updates `cartItems`, which triggers the effect again, causing continuous reloading and loss of items.

**Formal Specification:**
```
FUNCTION isBugCondition_Cart(input)
  INPUT: input of type CartStateChange
  OUTPUT: boolean
  
  RETURN input.action IN ['addToCart', 'removeFromCart', 'updateQuantity']
         AND firstUseEffect.dependencyArray CONTAINS 'cartItems'
         AND infiniteLoopDetected === true
END FUNCTION
```

#### Examples

- **Example 1**: User adds product to cart → product appears briefly → cart reloads → product disappears
- **Example 2**: User adds multiple products → only first product persists → subsequent products disappear
- **Example 3**: User refreshes page → cart loads from localStorage → infinite loop starts → cart becomes empty
- **Edge Case**: User adds product with quantity > 1 → quantity updates trigger effect → infinite loop → item lost

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Navbar displays correctly on initial page load without scrolling
- All navigation links (Home, Categories, How Wallet Works, Track Package) continue to work
- Cart icon displays with correct item count
- User account dropdown menu continues to function
- Mobile menu continues to work on small screens
- Cart persists via encrypted localStorage after page refresh
- Cart item count updates correctly when items are added/removed
- Multiple items can be added to cart and all persist
- Wishlist functionality continues to work
- Notification bell continues to display unread count

**Scope:**
All inputs that do NOT involve scrolling (for navbar) or cart state changes (for cart context) should be completely unaffected by these fixes. This includes:
- Mouse clicks on navbar links and buttons
- User authentication and logout
- Page navigation and routing
- Wishlist interactions
- Notification viewing
- Account settings access
- Dashboard switching
- Mobile menu interactions

## Hypothesized Root Cause

Based on the bug descriptions and code analysis, the most likely issues are:

### Navbar Bug Root Causes

1. **Incorrect CSS Positioning**: The navbar uses `relative z-[1000]` instead of `fixed` positioning
   - `relative` positioning keeps the element in the document flow, so it scrolls with content
   - `fixed` positioning removes the element from the flow and fixes it to the viewport
   - The z-index is correct but irrelevant if positioning is wrong

2. **Missing Width Constraint**: Fixed positioning requires explicit width to prevent layout shift
   - Without `w-full` or explicit width, fixed elements may not span the full viewport width
   - This could cause visual misalignment or gaps

3. **Missing Top Offset**: Fixed positioning needs `top-0` to position at the top
   - Without this, the navbar might position incorrectly

### Cart Context Bug Root Causes

1. **Infinite Loop in First useEffect**: The dependency array includes `cartItems`
   - Line 23: `}, [cartItems]);` causes the effect to re-run whenever cartItems changes
   - The effect calls `setCartItems(savedCart)`, which updates cartItems
   - This triggers the effect again, creating an infinite loop
   - The loop causes continuous reloading and state thrashing

2. **Race Condition with Multiple Effects**: Multiple useEffects interact with cartItems
   - First effect (line 23): Loads cart on mount, but re-runs on cartItems change
   - Second effect (line 37): Loads cart after auth, only runs on currentUser change
   - Third effect (line 54): Saves cart, runs on cartItems and hasLoaded change
   - The first effect's infinite loop interferes with the other effects

3. **hasLoaded Flag Not Preventing Reload**: The hasLoaded flag is set but doesn't prevent the first effect from re-running
   - The flag is only checked in the third effect (save effect)
   - The first effect doesn't check hasLoaded, so it keeps reloading

## Correctness Properties

Property 1: Bug Condition - Navbar Remains Fixed During Scroll

_For any_ scroll event where the user scrolls down the page (scrollY > 0), the fixed navbar SHALL remain visible at the top of the viewport, allowing the user to access navigation links and the cart icon without scrolling back to the top.

**Validates: Requirements 2.1**

Property 2: Bug Condition - Cart Items Persist Without Infinite Loop

_For any_ cart operation (add, remove, update quantity), the CartContext SHALL persist the items without triggering an infinite reload loop, ensuring items remain in the cart and are accessible on the cart page and after page refresh.

**Validates: Requirements 2.2**

Property 3: Preservation - Navbar Display Without Scrolling

_For any_ page view where the user has not scrolled (scrollY === 0), the navbar SHALL display exactly as before, with all navigation links, cart icon, and user menu functioning identically to the original implementation.

**Validates: Requirements 3.1, 3.4**

Property 4: Preservation - Cart Persistence and Item Count

_For any_ cart state that does NOT involve the infinite loop condition, the cart SHALL persist via encrypted localStorage, the item count SHALL update correctly in the navbar, and multiple items SHALL remain in the cart until explicitly removed.

**Validates: Requirements 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

#### Fix 1: Navbar CSS Positioning

**File**: `apps/buyer/src/components/Navbar.jsx`

**Current Code** (line 1):
```jsx
<nav className="bg-white border-b border-slate-200 shadow-sm relative z-[1000]">
```

**Specific Changes**:
1. **Change Positioning Class**: Replace `relative z-[1000]` with `fixed top-0 left-0 right-0 z-[1000]`
   - `fixed`: Removes navbar from document flow and fixes it to viewport
   - `top-0`: Positions navbar at the top of the viewport
   - `left-0 right-0`: Ensures navbar spans full viewport width
   - `z-[1000]`: Maintains high z-index to stay above other content

2. **Add Width Constraint**: Ensure the navbar container uses full width
   - The `max-w-7xl mx-auto` container should work correctly with fixed positioning
   - May need to verify that content doesn't shift

3. **Adjust Main Content**: Add top padding to main content to account for fixed navbar
   - The navbar is now 64px tall (h-16 = 4rem = 64px)
   - Main content should have `pt-16` or `mt-16` to prevent overlap
   - This is typically handled in the layout wrapper or main element

#### Fix 2: CartContext Infinite Loop

**File**: `apps/buyer/src/contexts/CartContext.jsx`

**Current Code** (lines 21-33):
```javascript
useEffect(() => {
  (async () => {
    try {
      const savedCart = await secureLocalStorage.getCart();
      if (savedCart) {
        setCartItems(savedCart);
      }
    } catch (error) {
      console.error('Error loading cart from secure localStorage:', error);
    } finally {
      setHasLoaded(true);
    }
  })();
}, [cartItems]);  // ← BUG: cartItems in dependency array causes infinite loop
```

**Specific Changes**:
1. **Remove cartItems from Dependency Array**: Change `}, [cartItems]);` to `}, []);`
   - Empty dependency array means the effect runs only once on mount
   - This prevents the infinite loop caused by cartItems changes
   - The effect loads the initial cart from storage and sets hasLoaded to true

2. **Rationale**: 
   - This effect is meant to run only once on component mount to load the initial cart
   - It should NOT re-run when cartItems changes
   - The third effect (save effect) already handles persisting cartItems changes
   - The second effect (auth effect) handles loading cart after auth resolves

3. **Verification**:
   - After this change, the first effect runs once on mount
   - It loads the cart from storage and sets hasLoaded to true
   - When cartItems changes (via addToCart, removeFromCart, etc.), the first effect does NOT re-run
   - The third effect (save effect) runs and persists the new cartItems
   - No infinite loop occurs

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fixes. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

#### Navbar Bug Testing

**Test Plan**: Write tests that simulate scroll events and verify the navbar remains visible in the viewport. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Scroll Down Test**: Simulate scrolling down 500px and verify navbar is still visible (will fail on unfixed code)
2. **Scroll to Bottom Test**: Simulate scrolling to bottom of page and verify navbar is still visible (will fail on unfixed code)
3. **Mobile Scroll Test**: Simulate scrolling on mobile viewport and verify navbar is still visible (will fail on unfixed code)
4. **Scroll Back Up Test**: Simulate scrolling back to top and verify navbar is visible (will pass on unfixed code)

**Expected Counterexamples**:
- Navbar becomes hidden when scrolling down
- Navbar position is relative instead of fixed
- Navigation links become inaccessible during scroll

#### Cart Bug Testing

**Test Plan**: Write tests that add products to cart and verify items persist without infinite reloading. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Add Single Product Test**: Add one product and verify it persists (will fail on unfixed code due to infinite loop)
2. **Add Multiple Products Test**: Add multiple products and verify all persist (will fail on unfixed code)
3. **Cart Persistence Test**: Add product, refresh page, verify product still in cart (will fail on unfixed code)
4. **Cart Item Count Test**: Add product and verify cart count updates correctly (will fail on unfixed code)

**Expected Counterexamples**:
- Products disappear after being added
- Infinite loop detected in useEffect
- Cart becomes empty after refresh
- Cart item count doesn't update

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode for Navbar:**
```
FOR ALL scrollEvent WHERE isBugCondition_Navbar(scrollEvent) DO
  result := renderNavbar_fixed(scrollEvent)
  ASSERT navbar.isVisibleInViewport === true
  ASSERT navbar.position === 'fixed'
  ASSERT navbar.top === 0
END FOR
```

**Pseudocode for Cart:**
```
FOR ALL cartOperation WHERE isBugCondition_Cart(cartOperation) DO
  result := cartContext_fixed(cartOperation)
  ASSERT cartItems.length > 0
  ASSERT infiniteLoopDetected === false
  ASSERT cartItems === persistedItems
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode for Navbar:**
```
FOR ALL scrollEvent WHERE NOT isBugCondition_Navbar(scrollEvent) DO
  ASSERT navbar_original(scrollEvent) = navbar_fixed(scrollEvent)
END FOR
```

**Pseudocode for Cart:**
```
FOR ALL cartOperation WHERE NOT isBugCondition_Cart(cartOperation) DO
  ASSERT cartContext_original(cartOperation) = cartContext_fixed(cartOperation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-scroll interactions and non-cart operations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Navbar Link Preservation**: Verify clicking navbar links continues to work without scrolling
2. **Cart Display Preservation**: Verify cart page displays items correctly after fix
3. **Navbar Display Preservation**: Verify navbar displays correctly on initial page load
4. **Multiple Item Preservation**: Verify multiple items can be added and all persist
5. **Cart Refresh Preservation**: Verify cart persists after page refresh
6. **Item Count Preservation**: Verify cart item count updates correctly in navbar

### Unit Tests

- Test navbar positioning is fixed and spans full width
- Test navbar remains visible when scrolling
- Test cart loads on mount without infinite loop
- Test cart items persist after adding products
- Test cart persists after page refresh
- Test cart item count updates correctly
- Test multiple products can be added to cart
- Test cart operations don't trigger infinite loops

### Property-Based Tests

- Generate random scroll positions and verify navbar remains visible
- Generate random cart operations and verify items persist
- Generate random product additions and verify cart state is consistent
- Generate random page refreshes and verify cart persists
- Test that all non-scroll navbar interactions continue to work
- Test that all non-cart-operation cart interactions continue to work

### Integration Tests

- Test full user flow: add product → scroll → verify navbar and cart work
- Test full user flow: add multiple products → refresh → verify all persist
- Test full user flow: add product → navigate pages → verify cart persists
- Test mobile flow: add product → scroll → verify navbar and cart work on mobile
- Test authentication flow: add product as guest → login → verify cart persists
