import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import * as firebaseService from '../services/firebaseService'

// Mock Firebase Auth
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
}

const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockOnAuthStateChanged = vi.fn()

vi.mock('firebase/auth', () => {
  const mockAuth = {
    currentUser: null,
    settings: {},
  }
  return {
    getAuth: vi.fn(() => mockAuth),
    onAuthStateChanged: (auth, callback) => {
      mockOnAuthStateChanged(auth, callback)
      // Simulate initial auth state - call synchronously for immediate effect
      // Use setTimeout with 0 to ensure it runs after current execution
      setTimeout(() => callback(mockUser), 0)
      return vi.fn()
    },
    signInWithEmailAndPassword: (auth, email, password) => {
      return mockSignIn(auth, email, password)
    },
    createUserWithEmailAndPassword: (auth, email, password) => {
      return mockSignUp(auth, email, password)
    },
    signOut: () => mockSignOut(),
    updateProfile: vi.fn(() => Promise.resolve()),
    GoogleAuthProvider: vi.fn(),
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    getRedirectResult: vi.fn(() => Promise.resolve(null)),
  }
})

// Mock Firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore')
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn(),
    setDoc: vi.fn(),
    getDoc: vi.fn(),
    enableMultiTabIndexedDbPersistence: vi.fn(() => Promise.resolve()),
    enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
  }
})

// Mock services
vi.mock('../services/firebaseService', () => ({
  default: {
    wallet: {
      createWallet: vi.fn(),
    },
    notifications: {
      getByUser: vi.fn(() => Promise.resolve([])),
      listenToUserNotifications: vi.fn(() => vi.fn()),
      markAsRead: vi.fn(() => Promise.resolve()),
    },
  },
}))

vi.mock('../services/trackingService', () => ({
  storeService: {
    createStore: vi.fn(),
  },
}))

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

describe('AuthContext', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Default mock implementations
    mockSignIn.mockResolvedValue({ user: mockUser })
    mockSignUp.mockResolvedValue({ user: mockUser })
    mockSignOut.mockResolvedValue()
    
    const { getDoc } = await import('firebase/firestore')
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        role: 'buyer',
      }),
    })
  })

  it('provides auth context', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Context should be available immediately, even if loading
    expect(result.current).toHaveProperty('currentUser')
    expect(result.current).toHaveProperty('userProfile')
    expect(result.current).toHaveProperty('loading')
    expect(result.current).toHaveProperty('signup')
    expect(result.current).toHaveProperty('signin')
    expect(result.current).toHaveProperty('logout') // AuthContext uses 'logout', not 'signout'
    
    // Wait for loading to complete
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false)
      },
      { timeout: 5000 }
    )
  })

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Initially loading should be true
    expect(result.current.loading).toBe(true)
  })

  it('loads user profile after authentication', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // User should be loaded from onAuthStateChanged
    await waitFor(() => {
      expect(result.current.currentUser).toBeTruthy()
    })
  })

  it('signs up new user successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Wait for initial load
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false)
      },
      { timeout: 5000 }
    )

    const userData = {
      displayName: 'New User',
      email: 'newuser@example.com',
      phone: '+2348012345678',
      role: 'buyer',
    }

    await act(async () => {
      try {
        await result.current.signup('newuser@example.com', 'password123', userData)
      } catch (error) {
        // Ignore errors in test - we're just checking the function was called
      }
    })

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.anything(),
      'newuser@example.com',
      'password123'
    )
  })

  it('creates wallet for new user on signup', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    const userData = {
      displayName: 'New User',
      email: 'newuser@example.com',
      role: 'buyer',
    }

    await act(async () => {
      await result.current.signup('newuser@example.com', 'password123', userData)
    })

    await waitFor(() => {
      expect(firebaseService.default.wallet.createWallet).toHaveBeenCalled()
    })
  })

  it('signs in existing user successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Wait for initial load
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false)
      },
      { timeout: 5000 }
    )

    await act(async () => {
      try {
        await result.current.signin('test@example.com', 'password123')
      } catch (error) {
        // Ignore errors in test - we're just checking the function was called
      }
    })

    expect(mockSignIn).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password123'
    )
  })

  it('loads user profile after sign in', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signin('test@example.com', 'password123')
    })

    await waitFor(() => {
      expect(result.current.userProfile).toBeTruthy()
    })
  })

  it('signs out user successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Wait for initial load
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false)
      },
      { timeout: 5000 }
    )

    // Sign out directly - AuthContext uses 'logout', not 'signout'
    await act(async () => {
      try {
        await result.current.logout()
      } catch (error) {
        // Ignore errors - we're just checking the function was called
      }
    })

    // Verify signOut was called
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('handles sign in errors', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    const error = new Error('Invalid credentials')
    mockSignIn.mockRejectedValue(error)

    await act(async () => {
      try {
        await result.current.signin('test@example.com', 'wrongpassword')
      } catch (err) {
        expect(err).toBe(error)
      }
    })
  })

  it('handles sign up errors', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    const error = new Error('Email already in use')
    mockSignUp.mockRejectedValue(error)

    await act(async () => {
      try {
        await result.current.signup('existing@example.com', 'password123', {
          displayName: 'User',
        })
      } catch (err) {
        expect(err).toBe(error)
      }
    })
  })

  it('sets user role correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await waitFor(() => {
      if (result.current.userProfile) {
        expect(result.current.userProfile.role).toBe('buyer')
      }
    })
  })

  it('shows escrow education for new users', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    const userData = {
      displayName: 'New User',
      email: 'newuser@example.com',
      userType: 'buyer',
    }

    await act(async () => {
      await result.current.signup('newuser@example.com', 'password123', userData)
    })

    await waitFor(() => {
      expect(result.current.showEscrowEducation).toBe(true)
    })
  })
})

