import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import Home from '../pages/Home'
import { vi } from 'vitest'

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}))

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
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
}))

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

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
)

describe('Home Page', () => {
  test('renders hero section with main heading', () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )
    
    expect(screen.getByText(/Trade confidently across Africa with wallet-protected payments/i)).toBeInTheDocument()
  })

  test('renders browse products button', () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )
    
    expect(screen.getByText('Browse Products')).toBeInTheDocument()
  })

  test('renders featured products section', () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )
    
    expect(screen.getByText('Featured Products')).toBeInTheDocument()
  })

  test('renders how it works section', () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )
    
    expect(screen.getByText('How Ojawa Wallet Works')).toBeInTheDocument()
  })

  test('renders popular categories section', () => {
    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    )
    
    expect(screen.getByText('Popular Categories')).toBeInTheDocument()
  })
})
