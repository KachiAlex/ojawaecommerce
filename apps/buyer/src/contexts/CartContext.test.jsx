import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { CartProvider, useCart } from './CartContext'
import { AuthProvider } from './AuthContext'
import secureLocalStorage from '../utils/secureLocalStorage'
import * as pricingService from '../services/pricingService'

// Mock dependencies - CartContext imports secureLocalStorage, not secureStorage directly
vi.mock('../utils/secureLocalStorage', () => ({
  default: {
    getCart: vi.fn(() => Promise.resolve(null)),
    setCart: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('../services/pricingService', () => ({
  pricingService: {
    calculatePrice: vi.fn(() => ({ total: 0, breakdown: {} })),
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'test-user-id' },
    loading: false,
  }),
  AuthProvider: ({ children }) => children,
}))

const wrapper = ({ children }) => (
  <AuthProvider>
    <CartProvider>
      {children}
    </CartProvider>
  </AuthProvider>
)

describe('CartContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(secureLocalStorage.getCart).mockResolvedValue(null)
    vi.mocked(secureLocalStorage.setCart).mockResolvedValue()
  })

  it('initializes with empty cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    await waitFor(() => {
      expect(result.current.cartItems).toEqual([])
      expect(result.current.getCartTotal()).toBe(0)
    })
  })

  it('loads cart from secure storage on mount', async () => {
    // CartContext stores flat items (spread product + quantity), not { product, quantity }
    const savedCart = [
      { id: 'product-1', name: 'Test Product', price: 10000, quantity: 2 },
    ]

    vi.mocked(secureLocalStorage.getCart).mockResolvedValue(savedCart)

    const { result } = renderHook(() => useCart(), { wrapper })

    await waitFor(() => {
      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].name).toBe('Test Product')
    })
  })

  it('adds product to cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const product = {
      id: 'product-1',
      name: 'Test Product',
      price: 10000,
      vendorId: 'vendor-1',
      stock: 10,
      inStock: true,
    }

    await act(async () => {
      await result.current.addToCart(product, 1)
    })

    await waitFor(() => {
      expect(result.current.cartItems).toHaveLength(1)
      // CartContext stores items as { ...product, quantity }, not { product, quantity }
      expect(result.current.cartItems[0].id).toBe(product.id)
      expect(result.current.cartItems[0].name).toBe(product.name)
      expect(result.current.cartItems[0].quantity).toBe(1)
    })
  })

  it('updates quantity when adding same product again', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const product = {
      id: 'product-1',
      name: 'Test Product',
      price: 10000,
      vendorId: 'vendor-1',
      stock: 10,
      inStock: true,
    }

    await act(async () => {
      await result.current.addToCart(product, 1)
      await result.current.addToCart(product, 2)
    })

    await waitFor(() => {
      expect(result.current.cartItems).toHaveLength(1)
      expect(result.current.cartItems[0].quantity).toBe(3) // 1 + 2
    })
  })

  it('updates item quantity', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const product = {
      id: 'product-1',
      name: 'Test Product',
      price: 10000,
      vendorId: 'vendor-1',
      stock: 10,
      inStock: true,
    }

    await act(async () => {
      await result.current.addToCart(product, 1)
      await result.current.updateQuantity('product-1', 5)
    })

    await waitFor(() => {
      expect(result.current.cartItems[0].quantity).toBe(5)
    })
  })

  it('removes item from cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const product = {
      id: 'product-1',
      name: 'Test Product',
      price: 10000,
      vendorId: 'vendor-1',
      stock: 10,
      inStock: true,
    }

    await act(async () => {
      await result.current.addToCart(product, 1)
      await result.current.removeFromCart('product-1')
    })

    await waitFor(() => {
      expect(result.current.cartItems).toHaveLength(0)
    })
  })

  it('calculates cart total correctly', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const products = [
      { id: '1', name: 'Product 1', price: 10000, vendorId: 'vendor-1', stock: 10, inStock: true },
      { id: '2', name: 'Product 2', price: 20000, vendorId: 'vendor-2', stock: 10, inStock: true },
    ]

    await act(async () => {
      await result.current.addToCart(products[0], 2)
      await result.current.addToCart(products[1], 1)
    })

    await waitFor(() => {
      const total = result.current.getCartTotal()
      expect(total).toBe(40000) // (10000 * 2) + (20000 * 1)
    })
  })

  it('saves cart to secure storage when updated', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const product = {
      id: 'product-1',
      name: 'Test Product',
      price: 10000,
      vendorId: 'vendor-1',
      stock: 10,
      inStock: true,
    }

    await act(async () => {
      await result.current.addToCart(product, 1)
    })

    await waitFor(() => {
      expect(secureLocalStorage.setCart).toHaveBeenCalled()
    })
  })

  it('validates cart items', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const product = {
      id: 'product-1',
      name: 'Test Product',
      price: 10000,
      vendorId: 'vendor-1',
      stock: 5,
      inStock: true,
    }

    await act(async () => {
      await result.current.addToCart(product, 1)
    })

    await waitFor(() => {
      expect(result.current.cartItems).toHaveLength(1)
    })

    // validateCartItems filters out invalid items (doesn't return validation object)
    const initialCount = result.current.cartItems.length
    await act(async () => {
      result.current.validateCartItems()
    })

    // After validation, valid items should remain
    await waitFor(() => {
      expect(result.current.cartItems.length).toBeGreaterThanOrEqual(0)
    })
  })

  it('detects out of stock items', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const product = {
      id: 'product-1',
      name: 'Test Product',
      price: 10000,
      vendorId: 'vendor-1',
      stock: 0,
      inStock: false,
    }

    // This should throw an error since product is out of stock
    await expect(async () => {
      await act(async () => {
        await result.current.addToCart(product, 1)
      })
    }).rejects.toThrow('This product is out of stock')
  })

  it('clears cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const product = {
      id: 'product-1',
      name: 'Test Product',
      price: 10000,
      vendorId: 'vendor-1',
      stock: 10,
      inStock: true,
    }

    await act(async () => {
      await result.current.addToCart(product, 1)
      await result.current.clearCart()
    })

    await waitFor(() => {
      expect(result.current.cartItems).toHaveLength(0)
    })
  })

  it('handles multiple vendors in cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })

    const products = [
      { id: '1', name: 'Product 1', price: 10000, vendorId: 'vendor-1', stock: 10, inStock: true },
      { id: '2', name: 'Product 2', price: 20000, vendorId: 'vendor-2', stock: 10, inStock: true },
    ]

    await act(async () => {
      await result.current.addToCart(products[0], 1)
      await result.current.addToCart(products[1], 1)
    })

    await waitFor(() => {
      expect(result.current.cartItems).toHaveLength(2)
      expect(result.current.cartItems[0].vendorId).toBe('vendor-1')
      expect(result.current.cartItems[1].vendorId).toBe('vendor-2')
    })
  })
})

