/**
 * Component Tests for RoleGuard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import RoleGuard from '../../components/RoleGuard'
import { AuthProvider } from '../../contexts/AuthContext'

// Mock useAuth
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext')
  return {
    ...actual,
    useAuth: vi.fn()
  }
})

// Mock RoleAuthModal to avoid icon issues
vi.mock('../../components/RoleAuthModal', () => ({
  default: ({ role, onClose, onSuccess }) => (
    <div data-testid="role-auth-modal">
      <div>Role Auth Modal for {role}</div>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onSuccess(role)}>Success</button>
    </div>
  )
}))

describe('RoleGuard Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect unauthenticated users to login', async () => {
    const { useAuth } = await import('../../contexts/AuthContext')
    useAuth.mockReturnValue({
      currentUser: null,
      userProfile: null,
      loading: false
    })

    render(
      <BrowserRouter>
        <AuthProvider>
          <RoleGuard requiredRole="admin">
            <div>Admin Content</div>
          </RoleGuard>
        </AuthProvider>
      </BrowserRouter>
    )

    // Should redirect to login
    await waitFor(() => {
      // Check for redirect behavior
      expect(window.location.pathname).toBe('/login')
    })
  })

  it('should allow access for users with correct role', async () => {
    const { useAuth } = await import('../../contexts/AuthContext')
    useAuth.mockReturnValue({
      currentUser: { uid: 'admin-1' },
      userProfile: { role: 'admin' },
      loading: false
    })

    render(
      <BrowserRouter>
        <AuthProvider>
          <RoleGuard requiredRole="admin">
            <div>Admin Content</div>
          </RoleGuard>
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })
  })

  it('should deny access for users without required role', async () => {
    const { useAuth } = await import('../../contexts/AuthContext')
    useAuth.mockReturnValue({
      currentUser: { uid: 'vendor-1' },
      userProfile: { role: 'vendor' },
      loading: false
    })

    render(
      <BrowserRouter>
        <AuthProvider>
          <RoleGuard requiredRole="admin">
            <div>Admin Content</div>
          </RoleGuard>
        </AuthProvider>
      </BrowserRouter>
    )

    // Should show auth modal or redirect
    await waitFor(() => {
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })
  })

  it('should allow buyer role for all users', async () => {
    const { useAuth } = await import('../../contexts/AuthContext')
    useAuth.mockReturnValue({
      currentUser: { uid: 'user-1' },
      userProfile: { role: 'buyer' },
      loading: false
    })

    render(
      <BrowserRouter>
        <AuthProvider>
          <RoleGuard requiredRole="buyer">
            <div>Buyer Content</div>
          </RoleGuard>
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Buyer Content')).toBeInTheDocument()
    })
  })
})

