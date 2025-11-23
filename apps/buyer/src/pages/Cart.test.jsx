import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { renderWithProviders, mockProduct } from '../test/helpers'
import Cart from './Cart'
import * as firebaseService from '../services/firebaseService'

// Mock Firebase
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore')
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn(),
    enableMultiTabIndexedDbPersistence: vi.fn(() => Promise.resolve()),
    enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
  }
})

// Mock contexts
vi.mock('../contexts/MessagingContext', () => ({
  useMessaging: () => ({
    startConversation: vi.fn(),
    setActiveConversation: vi.fn(),
  }),
}))

// Create a mock cart context that can be controlled per test
const mockCartContextValue = {
  cartItems: [],
  updateQuantity: vi.fn(),
  removeFromCart: vi.fn(),
  getCartTotal: () => 0,
  clearCart: vi.fn(),
  validateCartItems: vi.fn(() => ({ valid: true, errors: [] })),
  hasOutOfStockItems: vi.fn(() => false),
  saveIntendedDestination: vi.fn(),
}

vi.mock('../contexts/CartContext', () => ({
  useCart: () => mockCartContextValue,
  CartProvider: ({ children }) => children,
}))

// Mock components
vi.mock('../components/AddressInput', () => ({
  default: ({ onChange, value }) => (
    <input
      data-testid="address-input"
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder="Enter address"
    />
  ),
}))

vi.mock('../components/CheckoutLogisticsSelector', () => ({
  default: () => <div data-testid="logistics-selector">Logistics Selector</div>,
}))

vi.mock('../components/MessageVendorModal', () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="message-vendor-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

const mockCartItems = [
  {
    id: 'item-1',
    product: {
      ...mockProduct,
      id: 'product-1',
      name: 'Test Product 1',
      price: 10000,
      vendorId: 'vendor-1',
    },
    quantity: 2,
    vendorId: 'vendor-1',
  },
  {
    id: 'item-2',
    product: {
      ...mockProduct,
      id: 'product-2',
      name: 'Test Product 2',
      price: 20000,
      vendorId: 'vendor-2',
    },
    quantity: 1,
    vendorId: 'vendor-2',
  },
]

describe('Cart Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Reset cart context to empty
    Object.assign(mockCartContextValue, {
      cartItems: [],
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      getCartTotal: () => 0,
      clearCart: vi.fn(),
      validateCartItems: vi.fn(() => ({ valid: true, errors: [] })),
      hasOutOfStockItems: vi.fn(() => false),
      saveIntendedDestination: vi.fn(),
    })
    
    // Mock vendor info fetch
    const { getDoc } = await import('firebase/firestore')
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({
        displayName: 'Test Vendor',
        address: '123 Vendor Street, Lagos',
      }),
    })
  })

  it('renders empty cart message when cart is empty', () => {
    renderWithProviders(<Cart />)

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument()
  })

  it('displays cart items when cart has items', async () => {
    // Update cart context to return items
    Object.assign(mockCartContextValue, {
      cartItems: mockCartItems,
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      getCartTotal: () => 40000, // (10000 * 2) + (20000 * 1)
      clearCart: vi.fn(),
      validateCartItems: vi.fn(() => ({ valid: true, errors: [] })),
      hasOutOfStockItems: vi.fn(() => false),
      saveIntendedDestination: vi.fn(),
    })

    renderWithProviders(<Cart />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('displays correct quantities for each item', async () => {
    Object.assign(mockCartContextValue, {
      cartItems: mockCartItems,
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      getCartTotal: () => 40000,
      clearCart: vi.fn(),
      validateCartItems: vi.fn(() => ({ valid: true, errors: [] })),
      hasOutOfStockItems: vi.fn(() => false),
      saveIntendedDestination: vi.fn(),
    })

    renderWithProviders(<Cart />)

    await waitFor(() => {
      // Check quantities are displayed
      expect(screen.getByDisplayValue('2')).toBeInTheDocument() // Product 1 quantity
      expect(screen.getByDisplayValue('1')).toBeInTheDocument() // Product 2 quantity
    }, { timeout: 5000 })
  })

  it('calculates and displays total correctly', async () => {
    Object.assign(mockCartContextValue, {
      cartItems: mockCartItems,
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      getCartTotal: () => 40000,
      clearCart: vi.fn(),
      validateCartItems: vi.fn(() => ({ valid: true, errors: [] })),
      hasOutOfStockItems: vi.fn(() => false),
      saveIntendedDestination: vi.fn(),
    })

    renderWithProviders(<Cart />)

    await waitFor(() => {
      expect(screen.getByText(/₦40,000|40,000/i)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('allows updating item quantity', async () => {
    const mockUpdateQuantity = vi.fn()
    Object.assign(mockCartContextValue, {
      cartItems: mockCartItems,
      updateQuantity: mockUpdateQuantity,
      removeFromCart: vi.fn(),
      getCartTotal: () => 40000,
      clearCart: vi.fn(),
      validateCartItems: vi.fn(() => ({ valid: true, errors: [] })),
      hasOutOfStockItems: vi.fn(() => false),
      saveIntendedDestination: vi.fn(),
    })

    renderWithProviders(<Cart />)

    await waitFor(() => {
      const quantityInput = screen.getByDisplayValue('2')
      fireEvent.change(quantityInput, { target: { value: '3' } })
      fireEvent.blur(quantityInput)
    }, { timeout: 5000 })

    await waitFor(() => {
      expect(mockUpdateQuantity).toHaveBeenCalled()
    })
  })

  it('allows removing item from cart', async () => {
    const mockRemoveFromCart = vi.fn()
    Object.assign(mockCartContextValue, {
      cartItems: mockCartItems,
      updateQuantity: vi.fn(),
      removeFromCart: mockRemoveFromCart,
      getCartTotal: () => 40000,
      clearCart: vi.fn(),
      validateCartItems: vi.fn(() => ({ valid: true, errors: [] })),
      hasOutOfStockItems: vi.fn(() => false),
      saveIntendedDestination: vi.fn(),
    })

    renderWithProviders(<Cart />)

    await waitFor(() => {
      const removeButtons = screen.getAllByRole('button', { name: /remove|delete/i })
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0])
      }
    }, { timeout: 5000 })

    await waitFor(() => {
      expect(mockRemoveFromCart).toHaveBeenCalled()
    })
  })

  it('shows proceed to checkout button when cart has items', async () => {
    Object.assign(mockCartContextValue, {
      cartItems: mockCartItems,
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      getCartTotal: () => 40000,
      clearCart: vi.fn(),
      validateCartItems: vi.fn(() => ({ valid: true, errors: [] })),
      hasOutOfStockItems: vi.fn(() => false),
      saveIntendedDestination: vi.fn(),
    })

    renderWithProviders(<Cart />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /proceed to checkout|checkout/i })).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('displays vendor information for each item', async () => {
    Object.assign(mockCartContextValue, {
      cartItems: mockCartItems,
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      getCartTotal: () => 40000,
      clearCart: vi.fn(),
      validateCartItems: vi.fn(() => ({ valid: true, errors: [] })),
      hasOutOfStockItems: vi.fn(() => false),
      saveIntendedDestination: vi.fn(),
    })

    renderWithProviders(<Cart />)

    await waitFor(() => {
      // Vendor names should be displayed
      expect(screen.getByText(/vendor|seller/i)).toBeInTheDocument()
    }, { timeout: 5000 })
  })
})

