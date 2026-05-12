# 🧪 Comprehensive Testing Guide for Ojawa E-Commerce

**Testing Framework**: Vitest + React Testing Library  
**E2E Framework**: Playwright (recommended) or Cypress  
**Coverage Target**: 70%+

---

## 📋 Table of Contents

1. [Testing Setup](#testing-setup)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [E2E Testing](#e2e-testing)
5. [Testing Utilities](#testing-utilities)
6. [Mocking Strategies](#mocking-strategies)
7. [Test Examples](#test-examples)
8. [CI/CD Integration](#cicd-integration)
9. [Best Practices](#best-practices)

---

## 🚀 Testing Setup

### Current Setup Status

✅ **Already Configured:**
- Vitest installed and configured
- React Testing Library installed
- Test setup file exists (`src/test/setup.js`)
- Basic test examples

### Additional Dependencies Needed

```bash
cd apps/buyer
npm install --save-dev @vitest/ui @vitest/coverage-v8 @playwright/test
```

### Vitest Configuration

Create `vitest.config.js` in `apps/buyer/`:

```javascript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/*.test.{js,jsx}',
        '**/mockData/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    include: ['**/*.{test,spec}.{js,jsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

---

## 🧩 Unit Testing

### What to Test

- **Components**: Rendering, props, user interactions
- **Utils**: Pure functions, data transformations
- **Hooks**: Custom hook behavior
- **Services**: Business logic (with mocks)

### Component Testing Example

**File**: `src/components/ProductCard.test.jsx`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ProductCard from './ProductCard'

// Mock dependencies
vi.mock('../contexts/CartContext', () => ({
  useCart: () => ({
    addToCart: vi.fn(),
    cart: [],
  }),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'test-user-id' },
  }),
}))

const mockProduct = {
  id: 'product-1',
  name: 'Test Product',
  price: 10000,
  image: 'https://example.com/image.jpg',
  category: 'Electronics',
  vendorId: 'vendor-1',
  stock: 10,
}

const TestWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders product information correctly', () => {
    render(
      <TestWrapper>
        <ProductCard product={mockProduct} />
      </TestWrapper>
    )

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText(/₦10,000/i)).toBeInTheDocument()
    expect(screen.getByText('Electronics')).toBeInTheDocument()
  })

  it('displays product image with alt text', () => {
    render(
      <TestWrapper>
        <ProductCard product={mockProduct} />
      </TestWrapper>
    )

    const image = screen.getByAltText(/Test Product/i)
    expect(image).toHaveAttribute('src', mockProduct.image)
  })

  it('calls onAddToCart when add to cart button is clicked', async () => {
    const mockAddToCart = vi.fn()
    
    vi.mock('../contexts/CartContext', () => ({
      useCart: () => ({
        addToCart: mockAddToCart,
        cart: [],
      }),
    }))

    render(
      <TestWrapper>
        <ProductCard product={mockProduct} onAddToCart={mockAddToCart} />
      </TestWrapper>
    )

    const addButton = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith(mockProduct, 1)
    })
  })

  it('shows out of stock message when stock is 0', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 }
    
    render(
      <TestWrapper>
        <ProductCard product={outOfStockProduct} />
      </TestWrapper>
    )

    expect(screen.getByText(/out of stock/i)).toBeInTheDocument()
  })

  it('navigates to product detail page when clicked', () => {
    const { container } = render(
      <TestWrapper>
        <ProductCard product={mockProduct} />
      </TestWrapper>
    )

    const link = container.querySelector('a[href="/products/product-1"]')
    expect(link).toBeInTheDocument()
  })
})
```

### Utility Function Testing

**File**: `src/utils/currencyUtils.test.js`

```javascript
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPrice } from './currencyUtils'

describe('currencyUtils', () => {
  describe('formatCurrency', () => {
    it('formats NGN currency correctly', () => {
      expect(formatCurrency(10000, 'NGN')).toBe('₦10,000')
      expect(formatCurrency(1000, 'NGN')).toBe('₦1,000')
      expect(formatCurrency(100, 'NGN')).toBe('₦100')
    })

    it('formats USD currency correctly', () => {
      expect(formatCurrency(100, 'USD')).toBe('$100')
    })

    it('handles zero and negative values', () => {
      expect(formatCurrency(0, 'NGN')).toBe('₦0')
      expect(formatCurrency(-100, 'NGN')).toBe('₦-100')
    })

    it('handles large numbers', () => {
      expect(formatCurrency(1000000, 'NGN')).toBe('₦1,000,000')
    })
  })

  describe('formatPrice', () => {
    it('formats price with default currency', () => {
      expect(formatPrice(5000)).toContain('₦')
    })
  })
})
```

### Custom Hook Testing

**File**: `src/hooks/useProductSearch.test.js`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProductSearch } from './useProductSearch'
import * as firebaseService from '../services/firebaseService'

vi.mock('../services/firebaseService')

describe('useProductSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('searches products by query', async () => {
    const mockProducts = [
      { id: '1', name: 'iPhone', price: 50000 },
      { id: '2', name: 'Samsung', price: 40000 },
    ]

    vi.spyOn(firebaseService, 'searchProducts').mockResolvedValue(mockProducts)

    const { result } = renderHook(() => useProductSearch())

    await result.current.search('phone')

    await waitFor(() => {
      expect(result.current.results).toEqual(mockProducts)
      expect(result.current.loading).toBe(false)
    })
  })

  it('handles search errors', async () => {
    const error = new Error('Search failed')
    vi.spyOn(firebaseService, 'searchProducts').mockRejectedValue(error)

    const { result } = renderHook(() => useProductSearch())

    await result.current.search('phone')

    await waitFor(() => {
      expect(result.current.error).toBe(error.message)
      expect(result.current.loading).toBe(false)
    })
  })
})
```

---

## 🔗 Integration Testing

### What to Test

- **User Flows**: Complete workflows (login → browse → cart → checkout)
- **Context Integration**: Multiple contexts working together
- **API Integration**: Service calls with mocked responses
- **Route Integration**: Navigation and routing

### User Flow Testing Example

**File**: `src/pages/__tests__/CheckoutFlow.test.jsx`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import { CartProvider } from '../../contexts/CartContext'
import Checkout from '../Checkout'
import * as firebaseService from '../../services/firebaseService'

// Mock Firebase
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback({ uid: 'test-user', email: 'test@example.com' })
    return vi.fn()
  }),
}))

vi.mock('../../services/firebaseService')

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Checkout Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock cart items
    const mockCart = [
      {
        id: 'item-1',
        product: {
          id: 'product-1',
          name: 'Test Product',
          price: 10000,
        },
        quantity: 2,
        vendorId: 'vendor-1',
      },
    ]

    // Mock localStorage
    localStorage.setItem('cart', JSON.stringify(mockCart))
  })

  it('completes full checkout flow', async () => {
    const mockCreateOrder = vi.spyOn(firebaseService, 'createOrder').mockResolvedValue({
      id: 'order-123',
      status: 'pending',
    })

    render(
      <TestWrapper>
        <Checkout />
      </TestWrapper>
    )

    // Step 1: Verify cart items are displayed
    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText(/₦20,000/i)).toBeInTheDocument()

    // Step 2: Fill address form
    const addressInput = screen.getByLabelText(/address/i)
    fireEvent.change(addressInput, { target: { value: '123 Test Street' } })

    const cityInput = screen.getByLabelText(/city/i)
    fireEvent.change(cityInput, { target: { value: 'Lagos' } })

    // Step 3: Submit order
    const submitButton = screen.getByRole('button', { name: /place order/i })
    fireEvent.click(submitButton)

    // Step 4: Verify order creation
    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              productId: 'product-1',
              quantity: 2,
            }),
          ]),
          shippingAddress: expect.objectContaining({
            street: '123 Test Street',
            city: 'Lagos',
          }),
        })
      )
    })
  })

  it('validates required fields before submission', async () => {
    render(
      <TestWrapper>
        <Checkout />
      </TestWrapper>
    )

    const submitButton = screen.getByRole('button', { name: /place order/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/address is required/i)).toBeInTheDocument()
    })
  })
})
```

### Context Integration Test

**File**: `src/contexts/__tests__/CartContext.test.jsx`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CartProvider, useCart } from '../CartContext'
import { AuthProvider } from '../AuthContext'
import * as firebaseService from '../../services/firebaseService'

vi.mock('../../services/firebaseService')

const wrapper = ({ children }) => (
  <AuthProvider>
    <CartProvider>
      {children}
    </CartProvider>
  </AuthProvider>
)

describe('CartContext Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('adds product to cart and persists to localStorage', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const product = {
      id: 'product-1',
      name: 'Test Product',
      price: 10000,
    }

    await act(async () => {
      await result.current.addToCart(product, 2)
    })

    expect(result.current.cart).toHaveLength(1)
    expect(result.current.cart[0].product.id).toBe('product-1')
    expect(result.current.cart[0].quantity).toBe(2)

    // Verify localStorage
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]')
    expect(savedCart).toHaveLength(1)
  })

  it('updates cart item quantity', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const product = { id: 'product-1', name: 'Test', price: 10000 }

    await act(async () => {
      await result.current.addToCart(product, 1)
      await result.current.updateQuantity('product-1', 3)
    })

    expect(result.current.cart[0].quantity).toBe(3)
  })

  it('removes item from cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const product = { id: 'product-1', name: 'Test', price: 10000 }

    await act(async () => {
      await result.current.addToCart(product, 1)
      await result.current.removeFromCart('product-1')
    })

    expect(result.current.cart).toHaveLength(0)
  })

  it('calculates total correctly', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const products = [
      { id: '1', name: 'Product 1', price: 10000 },
      { id: '2', name: 'Product 2', price: 20000 },
    ]

    await act(async () => {
      await result.current.addToCart(products[0], 2)
      await result.current.addToCart(products[1], 1)
    })

    expect(result.current.total).toBe(40000) // (10000 * 2) + (20000 * 1)
  })
})
```

---

## 🎭 E2E Testing

### Playwright Setup

**File**: `playwright.config.js` (in `apps/buyer/`)

```javascript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

### E2E Test Examples

**File**: `e2e/checkout-flow.spec.js`

```javascript
import { test, expect } from '@playwright/test'

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('complete checkout process', async ({ page }) => {
    // Step 1: Browse products
    await page.goto('/products')
    await expect(page.locator('h1')).toContainText('Products')

    // Step 2: Add product to cart
    const firstProduct = page.locator('[data-testid="product-card"]').first()
    await firstProduct.locator('button:has-text("Add to Cart")').click()
    
    // Wait for cart notification
    await expect(page.locator('text=Product added to cart')).toBeVisible()

    // Step 3: Go to cart
    await page.click('a[href="/cart"]')
    await expect(page.locator('h1')).toContainText('Shopping Cart')

    // Step 4: Proceed to checkout
    await page.click('button:has-text("Proceed to Checkout")')
    await expect(page).toHaveURL('/checkout')

    // Step 5: Fill shipping address
    await page.fill('input[name="street"]', '123 Test Street')
    await page.fill('input[name="city"]', 'Lagos')
    await page.fill('input[name="state"]', 'Lagos')
    await page.fill('input[name="zipCode"]', '100001')

    // Step 6: Place order
    await page.click('button:has-text("Place Order")')

    // Step 7: Verify order confirmation
    await expect(page.locator('text=Order Placed Successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/orders\/.*/)
  })

  test('handles payment failure gracefully', async ({ page }) => {
    // Mock payment failure
    await page.route('**/api/payments/**', route => {
      route.fulfill({
        status: 402,
        body: JSON.stringify({ error: 'Payment failed' }),
      })
    })

    await page.goto('/checkout')
    await page.fill('input[name="street"]', '123 Test Street')
    await page.click('button:has-text("Place Order")')

    await expect(page.locator('text=Payment failed')).toBeVisible()
  })
})
```

**File**: `e2e/product-search.spec.js`

```javascript
import { test, expect } from '@playwright/test'

test.describe('Product Search', () => {
  test('searches and filters products', async ({ page }) => {
    await page.goto('/products')

    // Search for product
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('iPhone')
    await searchInput.press('Enter')

    // Wait for results
    await page.waitForSelector('[data-testid="product-card"]')
    
    // Verify results contain search term
    const productCards = page.locator('[data-testid="product-card"]')
    const count = await productCards.count()
    expect(count).toBeGreaterThan(0)

    // Filter by category
    await page.selectOption('select[name="category"]', 'Electronics')
    await page.waitForTimeout(500) // Wait for filter to apply

    // Verify filtered results
    const filteredCards = page.locator('[data-testid="product-card"]')
    const filteredCount = await filteredCards.count()
    expect(filteredCount).toBeLessThanOrEqual(count)
  })
})
```

---

## 🛠️ Testing Utilities

### Test Helpers

**File**: `src/test/helpers.jsx`

```javascript
import React from 'react'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { CartProvider } from '../contexts/CartContext'
import { NotificationProvider } from '../contexts/NotificationContext'

// Custom render function with all providers
export const renderWithProviders = (
  ui,
  {
    preloadedState = {},
    route = '/',
    ...renderOptions
  } = {}
) => {
  // Set up router
  window.history.pushState({}, 'Test page', route)

  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock user data
export const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
}

// Mock product data
export const mockProduct = {
  id: 'product-1',
  name: 'Test Product',
  price: 10000,
  category: 'Electronics',
  image: 'https://example.com/image.jpg',
  vendorId: 'vendor-1',
  stock: 10,
}

// Mock order data
export const mockOrder = {
  id: 'order-1',
  buyerId: 'test-user-id',
  vendorId: 'vendor-1',
  items: [
    {
      productId: 'product-1',
      name: 'Test Product',
      price: 10000,
      quantity: 2,
    },
  ],
  total: 20000,
  status: 'pending',
  createdAt: new Date(),
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Re-export everything
export * from '@testing-library/react'
```

### Firebase Mock Utilities

**File**: `src/test/mocks/firebase.js`

```javascript
import { vi } from 'vitest'

export const createMockFirebaseAuth = () => ({
  currentUser: {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
  },
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback({
      uid: 'test-user-id',
      email: 'test@example.com',
    })
    return vi.fn()
  }),
})

export const createMockFirestore = () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
})

export const setupFirebaseMocks = () => {
  vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => createMockFirebaseAuth()),
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
  }))

  vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(() => createMockFirestore()),
    collection: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
  }))
}
```

---

## 🎭 Mocking Strategies

### Mocking Firebase Services

```javascript
import { vi } from 'vitest'
import * as firebaseService from '../services/firebaseService'

// Mock entire service
vi.mock('../services/firebaseService', () => ({
  getProducts: vi.fn(),
  getProduct: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
}))

// In your test
beforeEach(() => {
  vi.spyOn(firebaseService, 'getProducts').mockResolvedValue([
    { id: '1', name: 'Product 1', price: 10000 },
  ])
})
```

### Mocking React Router

```javascript
import { vi } from 'vitest'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'product-1' }),
  }
})
```

### Mocking Contexts

```javascript
vi.mock('../contexts/CartContext', () => ({
  useCart: () => ({
    cart: [],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    total: 0,
  }),
}))
```

---

## 📝 Test Examples for Your Codebase

### Products Page Test

**File**: `src/pages/Products.test.jsx`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/helpers'
import Products from './Products'
import * as firebaseService from '../services/firebaseService'

vi.mock('../services/firebaseService')

describe('Products Page', () => {
  const mockProducts = [
    { id: '1', name: 'Product 1', price: 10000, category: 'Electronics' },
    { id: '2', name: 'Product 2', price: 20000, category: 'Fashion' },
  ]

  beforeEach(() => {
    vi.spyOn(firebaseService, 'getProducts').mockResolvedValue(mockProducts)
  })

  it('renders products list', async () => {
    renderWithProviders(<Products />)

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument()
      expect(screen.getByText('Product 2')).toBeInTheDocument()
    })
  })

  it('filters products by category', async () => {
    renderWithProviders(<Products />)

    const categorySelect = screen.getByLabelText(/category/i)
    fireEvent.change(categorySelect, { target: { value: 'Electronics' } })

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument()
      expect(screen.queryByText('Product 2')).not.toBeInTheDocument()
    })
  })

  it('searches products', async () => {
    renderWithProviders(<Products />)

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'Product 1' } })

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument()
    })
  })
})
```

### Cart Context Test

**File**: `src/contexts/CartContext.test.jsx`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CartProvider, useCart } from './CartContext'
import { AuthProvider } from './AuthContext'

const wrapper = ({ children }) => (
  <AuthProvider>
    <CartProvider>
      {children}
    </CartProvider>
  </AuthProvider>
)

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    expect(result.current.cart).toEqual([])
    expect(result.current.total).toBe(0)
  })

  it('adds item to cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    const product = { id: '1', name: 'Test', price: 10000 }

    await act(async () => {
      await result.current.addToCart(product, 1)
    })

    expect(result.current.cart).toHaveLength(1)
    expect(result.current.cart[0].product).toEqual(product)
  })

  it('calculates total correctly', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    const products = [
      { id: '1', name: 'P1', price: 10000 },
      { id: '2', name: 'P2', price: 20000 },
    ]

    await act(async () => {
      await result.current.addToCart(products[0], 2)
      await result.current.addToCart(products[1], 1)
    })

    expect(result.current.total).toBe(40000)
  })
})
```

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dir: ~/.npm
      
      - name: Install dependencies
        run: |
          cd apps/buyer
          npm ci
      
      - name: Run unit tests
        run: |
          cd apps/buyer
          npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./apps/buyer/coverage/coverage-final.json
          flags: unit-tests
      
      - name: Install Playwright
        run: |
          cd apps/buyer
          npx playwright install --with-deps
      
      - name: Run E2E tests
        run: |
          cd apps/buyer
          npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: apps/buyer/test-results/
```

### Package.json Scripts

Add to `apps/buyer/package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

## ✅ Best Practices

### 1. **Test Structure**
- Use `describe` blocks to group related tests
- Use descriptive test names that explain what is being tested
- Follow AAA pattern: Arrange, Act, Assert

### 2. **Test Isolation**
- Each test should be independent
- Clean up after each test (mocks, localStorage, etc.)
- Don't rely on test execution order

### 3. **Mocking**
- Mock external dependencies (Firebase, APIs)
- Don't mock what you're testing
- Use `vi.spyOn` for partial mocks when needed

### 4. **Assertions**
- Test behavior, not implementation
- Use semantic queries (`getByRole`, `getByLabelText`)
- Avoid testing implementation details

### 5. **Coverage**
- Aim for 70%+ coverage
- Focus on critical paths first
- Don't chase 100% coverage (not worth it)

### 6. **Performance**
- Keep tests fast (< 1 second per test)
- Use `waitFor` instead of fixed timeouts
- Parallelize tests when possible

---

## 📊 Running Tests

### Development
```bash
# Watch mode (runs tests on file changes)
npm run test

# UI mode (interactive test runner)
npm run test:ui

# Single run
npm run test:run
```

### Coverage
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/index.html
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

---

## 🎯 Testing Checklist

### Unit Tests
- [ ] All utility functions
- [ ] All custom hooks
- [ ] All service functions (with mocks)
- [ ] Critical components (ProductCard, Cart, Checkout)

### Integration Tests
- [ ] User authentication flow
- [ ] Product browsing and search
- [ ] Cart management
- [ ] Checkout process
- [ ] Order placement
- [ ] Payment processing

### E2E Tests
- [ ] Complete purchase flow
- [ ] User registration
- [ ] Vendor product management
- [ ] Order tracking
- [ ] Payment flows

---

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

*Last Updated: December 2024*

