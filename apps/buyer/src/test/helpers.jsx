import React from 'react'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { CartProvider } from '../contexts/CartContext'
import { NotificationProvider } from '../contexts/NotificationContext'
import { LanguageProvider } from '../contexts/LanguageContext'

/**
 * Custom render function with all providers
 * Use this instead of the default render from @testing-library/react
 */
export const renderWithProviders = (
  ui,
  {
    route = '/',
    ...renderOptions
  } = {}
) => {
  // Set up router
  if (typeof window !== 'undefined') {
    window.history.pushState({}, 'Test page', route)
  }

  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Mock user data for testing
 */
export const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/avatar.jpg',
}

/**
 * Mock product data for testing
 */
export const mockProduct = {
  id: 'product-1',
  name: 'Test Product',
  price: 10000,
  category: 'Electronics',
  image: 'https://example.com/image.jpg',
  images: ['https://example.com/image.jpg'],
  vendorId: 'vendor-1',
  stock: 10,
  description: 'A test product description',
  isActive: true,
}

/**
 * Mock order data for testing
 */
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
  shippingAddress: {
    street: '123 Test Street',
    city: 'Lagos',
    state: 'Lagos',
    zipCode: '100001',
  },
}

/**
 * Wait for async operations
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

/**
 * Create mock Firebase auth user
 */
export const createMockAuthUser = (overrides = {}) => ({
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  ...overrides,
})

/**
 * Create mock Firestore document
 */
export const createMockFirestoreDoc = (id, data) => ({
  id,
  data: () => data,
  exists: () => true,
  ref: { id },
})

/**
 * Create mock Firestore query snapshot
 */
export const createMockQuerySnapshot = (docs) => ({
  docs,
  empty: docs.length === 0,
  size: docs.length,
  forEach: (callback) => docs.forEach(callback),
})

// Re-export everything from @testing-library/react (utility module, not a component)
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react'

