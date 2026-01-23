import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
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
      // Navigate to products page with search term using React Router
      navigate(`/products?q=${encodeURIComponent(searchTerm.trim())}`)
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
          isScrolled ? 'bg-slate-950/95 shadow-lg border-b border-teal-800/60' : 'bg-slate-950/90 backdrop-blur-sm border-b border-teal-900/60'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-900 border border-teal-500/60 rounded-lg flex items-center justify-center">
                <span className="text-amber-300 font-bold text-lg">O</span>
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-teal-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent">
                Ojawa
              </span>
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
                <span className="text-xl text-amber-300">🔍</span>
              </MobileTouchButton>

              {/* Cart Button */}
              <Link to="/cart" className="relative">
                <MobileTouchButton
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <span className="text-xl text-teal-200">🛒</span>
                  {getCartItemsCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
                <span className="text-xl text-teal-200">👤</span>
                  </MobileTouchButton>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-950 rounded-lg shadow-lg border border-teal-900/70 py-1 z-50">
                      <div className="px-4 py-2 border-b border-teal-900/70">
                        <p className="text-sm font-medium text-teal-50">{getUserDisplayName()}</p>
                        <p className="text-xs text-teal-300/80">{userProfile?.role || 'User'}</p>
                      </div>
                      {userMenuItems.map((item) => item.onClick ? (
                        <button
                          key={item.name}
                          onClick={() => { item.onClick(); setIsUserMenuOpen(false) }}
                          className="flex items-center w-full px-4 py-2 text-left text-sm text-teal-100 hover:bg-slate-900/70"
                        >
                          <span className="mr-3">{item.icon}</span>
                          {item.name}
                        </button>
                      ) : (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="flex items-center px-4 py-2 text-sm text-teal-100 hover:bg-slate-900/70"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <span className="mr-3">{item.icon}</span>
                          {item.name}
                        </Link>
                      ))}
                      <div className="border-t border-teal-900/70 mt-1">
                        <button
                          onClick={logout}
                          className="flex items-center w-full px-4 py-2 text-sm text-amber-300 hover:bg-amber-900/30"
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
                className="p-2 text-teal-200"
              >
                <span className="text-xl">{isMenuOpen ? '✕' : '☰'}</span>
              </MobileTouchButton>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="border-t border-teal-900/60 bg-slate-950 px-4 py-3">
            <form onSubmit={handleSearch} className="flex space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="flex-1 px-3 py-2 border border-teal-700 rounded-lg bg-slate-900 text-teal-50 placeholder:text-teal-400/70 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-base"
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
        <div className="fixed inset-0 z-40 bg-black bg-opacity-60" onClick={() => setIsMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-80 max-w-full bg-slate-950 shadow-xl border-r border-teal-900/70">
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-teal-900/70">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-slate-900 border border-teal-500/60 rounded-lg flex items-center justify-center">
                    <span className="text-amber-300 font-bold text-lg">O</span>
                  </div>
                  <span className="text-xl font-semibold bg-gradient-to-r from-teal-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent">Ojawa</span>
                </div>
                <MobileTouchButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2"
                >
                  <span className="text-xl text-teal-200">✕</span>
                </MobileTouchButton>
              </div>

              {/* User Info */}
              {currentUser && (
                <div className="p-4 border-b border-teal-900/70 bg-slate-900">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                      <span className="text-2xl text-teal-200">👤</span>
                    </div>
                    <div>
                      <p className="font-medium text-teal-50">{getUserDisplayName()}</p>
                      <p className="text-sm text-teal-300/80">{userProfile?.role || 'User'}</p>
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
                      className="flex items-center px-4 py-3 text-teal-100 hover:bg-slate-900/70 rounded-lg transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="mr-3 text-xl">{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  ))}
                </div>

                {/* User Menu Items */}
                {currentUser && (
              <div className="p-4 border-t border-teal-900/70">
                    <p className="px-4 py-2 text-xs font-medium text-teal-400 uppercase tracking-wider">
                      Account
                    </p>
                    <div className="space-y-1">
                      {userMenuItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="flex items-center px-4 py-3 text-teal-100 hover:bg-slate-900/70 rounded-lg transition-colors"
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
              <div className="p-4 border-t border-teal-900/70">
                <div className="text-xs text-teal-300/80 text-center">
                  <p>© 2024 Ojawa. All rights reserved.</p>
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                    <Link to="/privacy" className="hover:text-amber-300">Privacy</Link>
                    <Link to="/terms" className="hover:text-amber-300">Terms</Link>
                    <Link to="/refund-policy" className="hover:text-amber-300">Refunds</Link>
                    <Link to="/help" className="hover:text-amber-300">Help</Link>
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
