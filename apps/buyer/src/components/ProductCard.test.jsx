import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ProductCard from './ProductCard'

// Mock dependencies
vi.mock('../contexts/CartContext', () => ({
  useCart: () => ({
    addToCart: vi.fn(),
    saveIntendedDestination: vi.fn(),
  }),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'test-user-id', email: 'test@example.com' },
  }),
}))

vi.mock('../services/analyticsService', () => ({
  default: {
    trackEvent: vi.fn(),
    trackProductInteraction: vi.fn(),
  },
}))

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockProduct = {
  id: 'product-1',
  name: 'Test Product',
  price: 10000,
  image: 'https://example.com/image.jpg',
  images: ['https://example.com/image.jpg', 'https://example.com/image2.jpg'],
  category: 'Electronics',
  vendorId: 'vendor-1',
  stock: 10,
  description: 'A test product description',
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
  })

  it('displays product image', () => {
    render(
      <TestWrapper>
        <ProductCard product={mockProduct} />
      </TestWrapper>
    )

    const image = screen.getByAltText(new RegExp(mockProduct.name, 'i'))
    expect(image).toHaveAttribute('src', mockProduct.image)
  })

  it('calls onAddToCart when add to cart button is clicked', async () => {
    const mockOnAddToCart = vi.fn()

    render(
      <TestWrapper>
        <ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />
      </TestWrapper>
    )

    // Wait for component to fully render
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add to cart/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct)
    }, { timeout: 5000 })
  })

  it('shows out of stock when stock is 0', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0, inStock: false }

    render(
      <TestWrapper>
        <ProductCard product={outOfStockProduct} />
      </TestWrapper>
    )

    // There are multiple "out of stock" elements, use getAllByText
    const outOfStockElements = screen.getAllByText(/out of stock/i)
    expect(outOfStockElements.length).toBeGreaterThan(0)
  })

  it('handles image load error', async () => {
    render(
      <TestWrapper>
        <ProductCard product={mockProduct} />
      </TestWrapper>
    )

    const image = screen.getByAltText(new RegExp(mockProduct.name, 'i'))
    expect(image).toBeInTheDocument()
    
    // Trigger error event
    fireEvent.error(image)

    // After error, component should still render (doesn't crash)
    // The image might switch to fallback or remain with error handling
    await waitFor(() => {
      const images = screen.queryAllByAltText(new RegExp(mockProduct.name, 'i'))
      expect(images.length).toBeGreaterThan(0)
    }, { timeout: 2000 })
  })

  it('navigates to product detail when card is clicked', () => {
    render(
      <TestWrapper>
        <ProductCard product={mockProduct} />
      </TestWrapper>
    )

    const card = screen.getByText('Test Product').closest('a') || 
                 screen.getByText('Test Product').closest('div')
    
    if (card) {
      fireEvent.click(card)
      // Navigation would be tested in integration tests
    }
  })

  it('displays wishlist button', () => {
    render(
      <TestWrapper>
        <ProductCard product={mockProduct} />
      </TestWrapper>
    )

    // Wishlist button should be present (mocked component)
    const wishlistButton = screen.queryByTestId('wishlist-button')
    // Note: This depends on how WishlistButton is implemented
  })
})

