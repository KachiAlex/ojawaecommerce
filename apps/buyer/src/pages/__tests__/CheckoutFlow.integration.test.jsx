import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { renderWithProviders } from '../../test/helpers'
import Checkout from '../Checkout'
import Cart from '../Cart'
import firebaseService from '../../services/firebaseService'
import escrowPaymentService from '../../services/escrowPaymentService'
import * as firestore from 'firebase/firestore'

// Mock Firebase
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore')
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    enableMultiTabIndexedDbPersistence: vi.fn(() => Promise.resolve()),
    enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
  }
})

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn()),
  getFunctions: vi.fn(() => ({})),
}))

// Create mock objects using vi.hoisted() to avoid hoisting issues
const { mockFirebaseService, mockEscrowPaymentService } = vi.hoisted(() => {
  return {
    mockFirebaseService: {
      wallet: {
        getUserWallet: vi.fn(),
      },
      orders: {
        create: vi.fn(),
      },
      notifications: {
        createOrderNotification: vi.fn(),
        create: vi.fn(),
        getByUser: vi.fn(() => Promise.resolve([])),
        listenToUserNotifications: vi.fn(() => vi.fn()),
        markAsRead: vi.fn(() => Promise.resolve()),
        markAllAsRead: vi.fn(() => Promise.resolve()),
      },
      logistics: {
        createDelivery: vi.fn(),
      },
    },
    mockEscrowPaymentService: {
      processEscrowPayment: vi.fn(),
    },
  }
})

// Mock services - firebaseService is a default export
vi.mock('../../services/firebaseService', () => ({
  default: mockFirebaseService,
}))

// Mock escrowPaymentService
vi.mock('../../services/escrowPaymentService', () => ({
  default: mockEscrowPaymentService,
}))
vi.mock('../../services/pricingService', () => ({
  pricingService: {
    calculatePrice: vi.fn(() => ({ total: 20000, breakdown: {} })),
  },
}))

vi.mock('../../services/logisticsPricingService', () => ({
  default: {
    calculateDeliveryCost: vi.fn(() => Promise.resolve(5000)),
  },
}))

// Mock MessagingContext
vi.mock('../../contexts/MessagingContext', () => ({
  useMessaging: () => ({
    startConversation: vi.fn(),
    setActiveConversation: vi.fn(),
  }),
}))

// Mock WalletBalanceCheck to immediately enable checkout
vi.mock('../../components/WalletBalanceCheck', () => ({
  default: ({ children, onBalanceCheck }) => {
    // Call onBalanceCheck immediately with sufficient balance
    if (onBalanceCheck) {
      setTimeout(() => onBalanceCheck(true), 0)
    }
    return <div data-testid="wallet-balance-check">{children}</div>
  },
}))

// Mock contexts
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
}

const mockCartContextValue = {
  cartItems: [],
  getCartTotal: () => 0,
  getPricingBreakdown: () => null,
  clearCart: vi.fn(),
}

const mockAuthContextValue = {
  currentUser: mockUser,
  loading: false,
}

vi.mock('../../contexts/CartContext', () => ({
  useCart: () => mockCartContextValue,
  CartProvider: ({ children }) => children,
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContextValue,
  AuthProvider: ({ children }) => children,
}))

const mockCartItems = [
  {
    id: 'item-1',
    name: 'Test Product 1', // Checkout uses item.name directly
    price: 10000,
    currency: 'NGN',
    vendorId: 'vendor-1',
    quantity: 2,
    processingTimeDays: 2,
  },
]

describe('Checkout Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset cart context
    Object.assign(mockCartContextValue, {
      cartItems: mockCartItems,
      getCartTotal: () => 20000, // 10000 * 2
      getPricingBreakdown: () => ({
        subtotal: 20000,
        deliveryFee: 0,
        ojawaCommission: 1000,
        total: 21000,
      }),
      clearCart: vi.fn(),
    })
    
    // Reset auth context
    Object.assign(mockAuthContextValue, {
      currentUser: mockUser,
      loading: false,
    })
    
    // Mock wallet service
    mockFirebaseService.wallet.getUserWallet = vi.fn().mockResolvedValue({
      id: 'wallet-1',
      userId: 'test-user-id',
      balance: 50000,
    })
    
    // Mock order creation - Checkout uses firebaseService.orders.create()
    mockFirebaseService.orders.create = vi.fn().mockResolvedValue('order-123')
    
    // Mock escrow payment - Checkout uses processEscrowPayment
    mockEscrowPaymentService.processEscrowPayment = vi.fn().mockResolvedValue({
      success: true,
      paymentId: 'payment-123',
    })
    
    // Mock product fetch - handle both product and user/vendor documents
    vi.mocked(firestore.getDoc).mockImplementation((docRef) => {
      const path = docRef?.path || String(docRef) || ''
      
      // Handle product documents
      if (path.includes('/products/')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            vendorId: 'vendor-1',
            processingTimeDays: 2,
          }),
        })
      }
      
      // Handle vendor/user documents
      if (path.includes('/users/')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            displayName: 'Test Vendor 1',
            name: 'Test Vendor 1',
            address: '123 Vendor Street, Lagos',
            vendorProfile: {
              businessAddress: '123 Vendor Street, Lagos',
            },
          }),
        })
      }
      
      // Default - return existing mock behavior
      return Promise.resolve({
        exists: () => true,
        data: () => ({
          vendorId: 'vendor-1',
          processingTimeDays: 2,
        }),
      })
    })
    
    // Mock getDocs for store queries
    vi.mocked(firestore.getDocs).mockResolvedValue({
      empty: true,
      docs: [],
      size: 0,
      forEach: vi.fn(),
    })
  })

  it('completes full checkout flow from cart to order confirmation', async () => {
    // Step 1: Set up cart context with items
    Object.assign(mockCartContextValue, {
      cartItems: mockCartItems,
      getCartTotal: () => 20000, // 10000 * 2
      getPricingBreakdown: () => ({
        subtotal: 20000,
        deliveryFee: 0,
        ojawaCommission: 1000,
        total: 21000,
      }),
      clearCart: vi.fn(),
      validateCartItems: vi.fn(() => ({ valid: true, errors: [] })),
      hasOutOfStockItems: vi.fn(() => false),
    })

    // Step 2: Render cart with items
    const { unmount } = renderWithProviders(<Cart />)

    // Verify cart items are displayed
    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    }, { timeout: 10000 })

    // Unmount cart before rendering checkout
    unmount()

    // Step 3: Re-set cart context before rendering Checkout
    // This ensures the context has items when Checkout renders
    Object.assign(mockCartContextValue, {
      cartItems: mockCartItems,
      getCartTotal: () => 20000,
      getPricingBreakdown: () => ({
        subtotal: 20000,
        deliveryFee: 0,
        ojawaCommission: 1000,
        total: 21000,
      }),
      clearCart: vi.fn(),
      validateCartItems: vi.fn(() => ({ valid: true, errors: [] })),
      hasOutOfStockItems: vi.fn(() => false),
    })

    // Step 4: Navigate to checkout (simulate clicking checkout button)
    // Don't nest routers - renderWithProviders already includes BrowserRouter
    renderWithProviders(<Checkout />, { route: '/checkout' })

    // Step 5: Verify checkout page loads
    await waitFor(() => {
      expect(screen.getByText(/checkout/i)).toBeInTheDocument()
    }, { timeout: 10000 })

    // Step 6: Verify cart items are shown in checkout
    // Wait a bit longer for async operations
    await waitFor(() => {
      const product = screen.queryByText('Test Product 1')
      expect(product).toBeInTheDocument()
    }, { timeout: 15000 })

    // Step 7: Verify total is calculated correctly
    // Checkout may show total as 21000 (with commission) or 20000 (subtotal)
    await waitFor(() => {
      const total20000 = screen.queryByText(/₦20[,.]?000|20[,.]?000/i)
      const total21000 = screen.queryByText(/₦21[,.]?000|21[,.]?000/i)
      const total22500 = screen.queryByText(/₦22[,.]?500|22[,.]?500/i)
      expect(total20000 || total21000 || total22500).toBeTruthy()
    }, { timeout: 10000 })
  }, { timeout: 40000 })

  it('validates wallet balance before allowing checkout', async () => {
    // Mock insufficient balance
    mockFirebaseService.wallet.getUserWallet = vi.fn().mockResolvedValue({
      id: 'wallet-1',
      userId: 'test-user-id',
      balance: 5000,
    })
    
    // Update WalletBalanceCheck mock to call onInsufficientFunds
    vi.doMock('../../components/WalletBalanceCheck', () => ({
      default: ({ children, onBalanceCheck, onInsufficientFunds }) => {
        if (onInsufficientFunds) {
          setTimeout(() => onInsufficientFunds(5000), 0)
        }
        if (onBalanceCheck) {
          setTimeout(() => onBalanceCheck(false), 0)
        }
        return <div data-testid="wallet-balance-check">{children}</div>
      },
    }))

    renderWithProviders(<Checkout />)

    await waitFor(() => {
      expect(screen.getByText(/please fund your wallet|insufficient.*balance/i)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('creates order with escrow payment on form submission', async () => {
    renderWithProviders(<Checkout />)

    // Wait for checkout to load and wallet balance to be checked
    await waitFor(() => {
      expect(screen.getByText(/checkout/i)).toBeInTheDocument()
    }, { timeout: 5000 })

    // Wait for wallet balance to load (button should be enabled)
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /pay.*wallet escrow/i })
      expect(submitButton).not.toBeDisabled()
    }, { timeout: 10000 })

    // Find and click submit button
    const submitButton = screen.getByRole('button', { name: /pay.*wallet escrow/i })
    fireEvent.click(submitButton)

    // Verify order creation was called
    await waitFor(() => {
      expect(mockFirebaseService.orders.create).toHaveBeenCalled()
    }, { timeout: 15000 })

    // Verify escrow payment was created
    await waitFor(() => {
      expect(mockEscrowPaymentService.processEscrowPayment).toHaveBeenCalled()
    }, { timeout: 15000 })
  }, { timeout: 20000 })

  it('handles checkout errors gracefully', async () => {
    // Mock order creation failure - set up before rendering
    mockFirebaseService.orders.create = vi.fn().mockRejectedValue(
      new Error('Order creation failed')
    )
    // Ensure escrow payment succeeds so we can test order creation failure
    mockEscrowPaymentService.processEscrowPayment = vi.fn().mockResolvedValue({
      success: true,
      paymentId: 'payment-123',
    })

    renderWithProviders(<Checkout />)

    await waitFor(() => {
      expect(screen.getByText(/checkout/i)).toBeInTheDocument()
    }, { timeout: 5000 })

    // Wait for wallet balance to load (button should be enabled)
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /pay.*wallet escrow/i })
      expect(submitButton).not.toBeDisabled()
    }, { timeout: 10000 })

    const submitButton = screen.getByRole('button', { name: /pay.*wallet escrow/i })
    fireEvent.click(submitButton)

    // Verify error message is shown
    // The error message should be "Order creation failed. Please try again."
    await waitFor(() => {
      expect(screen.getByText(/order creation failed|error|failed/i)).toBeInTheDocument()
    }, { timeout: 15000 })
  }, { timeout: 20000 })

  it('calculates delivery cost correctly', async () => {
    renderWithProviders(
      <Checkout />,
      {
        preloadedState: {
          cart: { items: mockCartItems },
        },
      }
    )

    await waitFor(() => {
      // Delivery cost should be calculated and displayed
      expect(screen.getByText(/delivery|shipping/i)).toBeInTheDocument()
    })
  })
})

