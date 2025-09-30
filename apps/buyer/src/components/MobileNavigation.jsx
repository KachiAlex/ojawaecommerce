import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { deviceDetection, mobilePerformance } from '../utils/mobileUtils'
import MobileTouchButton from './MobileTouchButton'
import AccountSettingsModal from './AccountSettingsModal'

const MobileNavigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  const { currentUser, userProfile, logout } = useAuth()
  const { getCartItemsCount } = useCart()
  const location = useLocation()
  const navRef = useRef(null)
  const userMenuRef = useRef(null)

  // Handle scroll to add background
  useEffect(() => {
    const handleScroll = mobilePerformance.throttle(() => {
      setIsScrolled(window.scrollY > 10)
    }, 100)

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menus when route changes
  useEffect(() => {
    setIsMenuOpen(false)
    setIsUserMenuOpen(false)
    setIsSearchOpen(false)
  }, [location.pathname])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      // Navigate to products page with search term
      window.location.href = `/products?q=${encodeURIComponent(searchTerm.trim())}`
      setSearchTerm('')
      setIsSearchOpen(false)
    }
  }

  // Get user display name
  const getUserDisplayName = () => {
    if (!currentUser) return 'Guest'
    return userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'User'
  }

  // Get dashboard route based on role
  const getDashboardRoute = () => {
    if (!userProfile?.role) return '/dashboard'
    
    switch (userProfile.role) {
      case 'vendor': return '/vendor'
      case 'logistics': return '/logistics'
      case 'admin': return '/admin'
      case 'buyer':
      case 'customer':
      default:
        return '/buyer'
    }
  }

  // Navigation items
  const navigationItems = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Products', href: '/products', icon: '🛍️' },
    { name: 'Categories', href: '/categories', icon: '📂' },
    { name: 'How Wallet Works', href: '/how-wallet-works', icon: '❓' },
    { name: 'Track Package', href: '/tracking', icon: '📦' }
  ]

  // User menu items
  const userMenuItems = [
    { name: 'Dashboard', href: getDashboardRoute(), icon: '📊' },
    { name: 'Profile', href: '/profile', icon: '👤' },
    { name: 'Settings', href: '#', icon: '⚙️', onClick: () => setIsSettingsOpen(true) },
    { name: 'Help', href: '/help', icon: '❓' }
  ]

  return (
    <>
      {/* Mobile Navigation Bar */}
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Ojawa</span>
            </Link>

            {/* Right side buttons */}
            <div className="flex items-center space-x-2">
              {/* Search Button */}
              <MobileTouchButton
                variant="ghost"
                size="sm"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2"
              >
                <span className="text-xl">🔍</span>
              </MobileTouchButton>

              {/* Cart Button */}
              <Link to="/cart" className="relative">
                <MobileTouchButton
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <span className="text-xl">🛒</span>
                  {getCartItemsCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getCartItemsCount()}
                    </span>
                  )}
                </MobileTouchButton>
              </Link>

              {/* User Menu or Login Button */}
              {currentUser ? (
                <div ref={userMenuRef} className="relative">
                  <MobileTouchButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="p-2"
                  >
                    <span className="text-xl">👤</span>
                  </MobileTouchButton>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                        <p className="text-xs text-gray-500">{userProfile?.role || 'User'}</p>
                      </div>
                      {userMenuItems.map((item) => item.onClick ? (
                        <button
                          key={item.name}
                          onClick={() => { item.onClick(); setIsUserMenuOpen(false) }}
                          className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <span className="mr-3">{item.icon}</span>
                          {item.name}
                        </button>
                      ) : (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <span className="mr-3">{item.icon}</span>
                          {item.name}
                        </Link>
                      ))}
                      <div className="border-t border-gray-100 mt-1">
                        <button
                          onClick={logout}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <span className="mr-3">🚪</span>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login">
                  <MobileTouchButton
                    variant="primary"
                    size="sm"
                    className="px-3 py-2 text-sm"
                  >
                    Sign In
                  </MobileTouchButton>
                </Link>
              )}

              {/* Menu Toggle */}
              <MobileTouchButton
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2"
              >
                <span className="text-xl">{isMenuOpen ? '✕' : '☰'}</span>
              </MobileTouchButton>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="border-t border-gray-200 bg-white px-4 py-3">
            <form onSubmit={handleSearch} className="flex space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
                autoFocus
              />
              <MobileTouchButton
                type="submit"
                variant="primary"
                size="md"
                className="px-4"
              >
                Search
              </MobileTouchButton>
            </form>
          </div>
        )}
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-80 max-w-full bg-white shadow-xl">
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">O</span>
                  </div>
                  <span className="text-xl font-semibold text-gray-900">Ojawa</span>
                </div>
                <MobileTouchButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2"
                >
                  <span className="text-xl">✕</span>
                </MobileTouchButton>
              </div>

              {/* User Info */}
              {currentUser && (
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getUserDisplayName()}</p>
                      <p className="text-sm text-gray-500">{userProfile?.role || 'User'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-1">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="mr-3 text-xl">{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  ))}
                </div>

                {/* User Menu Items */}
                {currentUser && (
                  <div className="p-4 border-t border-gray-200">
                    <p className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </p>
                    <div className="space-y-1">
                      {userMenuItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <span className="mr-3">{item.icon}</span>
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auth Buttons for non-logged in users */}
                {!currentUser && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="space-y-3">
                      <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                        <MobileTouchButton
                          variant="outline"
                          className="w-full"
                        >
                          Sign In
                        </MobileTouchButton>
                      </Link>
                      <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                        <MobileTouchButton
                          variant="primary"
                          className="w-full"
                        >
                          Get Started
                        </MobileTouchButton>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 text-center">
                  <p>© 2024 Ojawa. All rights reserved.</p>
                  <div className="flex justify-center space-x-4 mt-2">
                    <Link to="/privacy" className="hover:text-gray-700">Privacy</Link>
                    <Link to="/terms" className="hover:text-gray-700">Terms</Link>
                    <Link to="/help" className="hover:text-gray-700">Help</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-16" />
      {/* Account Settings Modal */}
      <AccountSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}

export default MobileNavigation
