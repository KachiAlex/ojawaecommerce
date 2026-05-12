import { render, screen, waitFor } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { CartProvider } from '../contexts/CartContext'
import Home from '../pages/Home'
import { vi } from 'vitest'

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
    settings: {
      appVerificationDisabledForTesting: false,
    },
  })),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  getRedirectResult: vi.fn(() => Promise.resolve(null)),
  updateProfile: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
}))

// Mock Firebase Firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore')
  return {
    ...actual,
  getFirestore: vi.fn(() => ({})),
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
    onSnapshot: vi.fn((query, onNext) => {
      // Immediately call onNext with empty snapshot
      if (onNext) {
        setTimeout(() => {
          onNext({
            docs: [],
            empty: true,
            size: 0,
            forEach: () => {},
          })
        }, 0)
      }
      // Return unsubscribe function
      return vi.fn()
    }),
    enableMultiTabIndexedDbPersistence: vi.fn(() => Promise.resolve()),
    enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
  }
})

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
}))

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
}))

// Mock Firebase App
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

// Mock useRealTimeProducts hook
vi.mock('../hooks/useRealTimeProducts', () => ({
  useRealTimeProducts: () => ({
    products: [],
    loading: false,
    error: null,
  }),
}))

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
      {children}
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Home Page', () => {
  test('renders hero section with main heading', async () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )
    
    // Wait for loading to complete (component has 1 second timer)
    await waitFor(() => {
    expect(screen.getByText(/Trade confidently across Africa with wallet-protected payments/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  test('renders browse products button', async () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )
    
    // Wait for loading to complete (component has 1 second timer)
    // Use getAllByText since there are multiple "Browse Products" buttons
    await waitFor(() => {
      const buttons = screen.getAllByText(/browse products/i)
      expect(buttons.length).toBeGreaterThan(0)
    }, { timeout: 10000 })
  })

  test('renders featured products section', async () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )
    
    // Wait for loading to complete (component has 1 second timer)
    await waitFor(() => {
      expect(screen.getByText(/featured products/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  test('renders how it works section', async () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )
    
    // Wait for loading to complete (component has 1 second timer)
    await waitFor(() => {
      expect(screen.getByText(/how ojawa wallet works/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  test('renders popular categories section', async () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )
    
    // Wait for loading to complete (component has 1 second timer)
    await waitFor(() => {
      expect(screen.getByText(/popular categories/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })
})
