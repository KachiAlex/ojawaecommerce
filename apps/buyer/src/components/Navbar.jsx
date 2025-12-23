import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useState, useEffect, useRef } from 'react';
import AccountSettingsModal from './AccountSettingsModal';
import NotificationCenter from './NotificationCenter';
import DashboardSwitcher from './DashboardSwitcher';
import SimpleLogo from './SimpleLogo';

const Navbar = () => {
  const { currentUser, logout, userProfile } = useAuth();
  const { getCartItemsCount } = useCart();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isDashboardDropdownOpen, setIsDashboardDropdownOpen] = useState(false);

  // Lightweight prefetch on hover for faster first render of key routes
  const prefetchProducts = () => {
    try {
      import('../pages/Products');
    } catch (_) {}
  };
  const prefetchCart = () => {
    // Cart is now statically imported, no need to prefetch
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      setIsUserDropdownOpen(false);
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  // Get user's first name for display
  const getFirstName = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName.split(' ')[0];
    }
    return currentUser?.email?.split('@')[0] || 'User';
  };

  // Determine user's available dashboards
  const getAvailableDashboards = () => {
    const dashboards = [];
    
    // Everyone can access buyer dashboard
    dashboards.push({
      id: 'buyer',
      name: 'Buyer Dashboard',
      icon: '🛍️',
      route: '/buyer'
    });
    
    if (userProfile?.role === 'vendor' || userProfile?.isVendor) {
      dashboards.push({
        id: 'vendor',
        name: 'Vendor Dashboard',
        icon: '🏪',
        route: '/vendor'
      });
    }
    
    if (userProfile?.role === 'logistics' || userProfile?.isLogisticsPartner) {
      dashboards.push({
        id: 'logistics',
        name: 'Logistics Dashboard',
        icon: '🚚',
        route: '/logistics'
      });
    }
    
    if (userProfile?.role === 'admin' || userProfile?.isAdmin) {
      dashboards.push({
        id: 'admin',
        name: 'Admin Dashboard',
        icon: '⚙️',
        route: '/admin'
      });
    }
    
    return dashboards;
  };


  // Close dropdown when clicking outside (use click to avoid early mousedown race)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
  <>
    <nav className="bg-white border-b border-slate-200 shadow-sm relative z-[1000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 text-slate-900">
              <SimpleLogo size="large" variant="icon" />
              <span className="hidden sm:inline text-lg font-semibold text-slate-700">
                Secure Pan‑African Marketplace
              </span>
            </Link>
          </div>


          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-slate-700 hover:text-emerald-600 font-medium transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/categories" 
              className="text-slate-700 hover:text-emerald-600 font-medium transition-colors"
            >
              Categories
            </Link>
            <Link 
              to="/how-wallet-works" 
              className="text-slate-700 hover:text-emerald-600 font-medium transition-colors"
            >
              How Wallet Works
            </Link>
            {/* Messages tab removed from public navbar - dashboard only */}
            <Link 
              to="/tracking" 
              className="text-slate-700 hover:text-emerald-600 font-medium transition-colors"
            >
              Track Package
            </Link>
            
            {/* Wishlist Icon - Visible when signed in */}
            {currentUser && (
              <button onClick={() => navigate('/wishlist')} className="relative" title="Wishlist">
                <span className="text-emerald-600 hover:text-emerald-500 text-xl">💝</span>
              </button>
            )}
            
            {/* Cart Icon - Visible for all users */}
            <button onClick={() => navigate('/cart')} className="relative">
                  <span className="text-slate-700 hover:text-emerald-600 text-xl">🛒</span>
              {getCartItemsCount() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getCartItemsCount()}
                </span>
              )}
            </button>
            
            <div className="flex items-center space-x-4">
              {/* Notification Bell - only when signed in */}
              {currentUser && (
                <button
                  onClick={() => setIsNotificationOpen(true)}
                  className="relative text-slate-700 hover:text-emerald-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 0 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0 1 15 0v5z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* Account Dropdown - always available (shows Sign In/Sign Out based on auth) */}
              <div
                className="relative z-[1000]"
                ref={dropdownRef}
                onClick={(e) => {
                  // Prevent outside click handler from immediately closing after toggle
                  e.stopPropagation();
                }}
              >
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-2 text-slate-700 hover:text-emerald-600 font-medium transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={isUserDropdownOpen}
                >
                  <div className="w-8 h-8 bg-slate-100 border border-emerald-200 rounded-full flex items-center justify-center">
                    <span className="text-emerald-600 font-semibold text-sm">
                      {currentUser ? getFirstName().charAt(0).toUpperCase() : 'OJ'}
                    </span>
                  </div>
                  <span className="text-sm text-slate-700">{currentUser ? getFirstName() : 'Account'}</span>
                  <svg className={`w-4 h-4 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>

                {isUserDropdownOpen && (
                  <div className="fixed right-4 md:right-8 top-[64px] w-56 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-[2147483647] pointer-events-auto">
                    {currentUser ? (
                      <>
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-sm font-medium text-slate-900">{currentUser.displayName || 'User'}</p>
                          <p className="text-sm text-slate-500">{currentUser.email}</p>
                        </div>
                        {/* Dashboard dropdown */}
                        <div className="py-2 relative">
                          <button
                            onMouseEnter={() => setIsDashboardDropdownOpen(true)}
                            onMouseLeave={() => setIsDashboardDropdownOpen(false)}
                            className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center">
                              <span className="mr-3">📊</span>
                              Dashboard
                            </div>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </button>
                          
                          {isDashboardDropdownOpen && (
                            <div 
                              className="absolute right-full top-0 mr-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-[2147483648]"
                              onMouseEnter={() => setIsDashboardDropdownOpen(true)}
                              onMouseLeave={() => setIsDashboardDropdownOpen(false)}
                            >
                              {getAvailableDashboards().map((dashboard) => (
                                <button
                                  key={dashboard.id}
                                  onClick={() => {
                                    setIsUserDropdownOpen(false);
                                    setIsDashboardDropdownOpen(false);
                                    navigate(dashboard.route);
                                  }}
                                  className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                  <span className="mr-3">{dashboard.icon}</span>
                                  {dashboard.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="border-t border-slate-100 py-2">
                          <button
                            onClick={() => {
                              setIsUserDropdownOpen(false);
                              setIsSettingsOpen(true);
                            }}
                            className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <span className="mr-3">⚙️</span>
                            Account Settings
                          </button>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <span className="mr-3">🚪</span>
                            Logout
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setIsUserDropdownOpen(false); navigate('/login'); }}
                          className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <span className="mr-3">🔐</span>
                          Sign In
                        </button>
                        <button
                          onClick={() => { setIsUserDropdownOpen(false); navigate('/register'); }}
                          className="w-full flex items-center px-4 py-2 text-sm text-white bg-emerald-500 hover:bg-emerald-400 rounded-lg mx-2 transition-colors"
                        >
                          <span className="mr-3">✨</span>
                          Get Started
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-700 hover:text-emerald-600 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              {/* Mobile Logo */}
              <div className="flex justify-center py-4 border-b">
                <SimpleLogo size="large" variant="icon" />
              </div>
              <Link 
                to="/" 
                className="text-slate-700 hover:text-emerald-600 block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/products" 
                onMouseEnter={prefetchProducts}
                className="text-slate-700 hover:text-emerald-600 block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Products
              </Link>
              {currentUser && (
                <Link 
                  to="/wishlist" 
                  className="text-slate-700 hover:text-emerald-600 block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Wishlist 💝
                </Link>
              )}
              <Link 
                to="/cart" 
                onMouseEnter={prefetchCart}
                className="text-slate-700 hover:text-emerald-600 block px-3 py-2 rounded-md text-base font-medium relative"
                onClick={() => setIsMenuOpen(false)}
              >
                Cart
                {getCartItemsCount() > 0 && (
                  <span className="ml-2 bg-emerald-500 text-white text-xs rounded-full h-5 w-5 inline-flex items-center justify-center">
                    {getCartItemsCount()}
                  </span>
                )}
              </Link>
              {/* Messages tab removed from mobile menu - dashboard only */}
              
              {currentUser ? (
                <>
                  <div className="px-3 py-2">
                    <DashboardSwitcher />
                  </div>
                  {userProfile?.role === 'admin' && (
                    <Link 
                      to="/admin" 
                      className="text-slate-700 hover:text-emerald-600 block px-3 py-2 rounded-md text-base font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {currentUser.displayName || currentUser.email}
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="text-slate-700 hover:text-emerald-600 block px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-emerald-500 hover:bg-emerald-400 text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
    {currentUser && (
      <AccountSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    )}
    
    <NotificationCenter 
      isOpen={isNotificationOpen} 
      onClose={() => setIsNotificationOpen(false)} 
    />
  </>
  );
};

export default Navbar;
