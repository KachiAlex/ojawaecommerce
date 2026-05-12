import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNotifications } from '../contexts/NotificationContext';

const MobileBottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { getCartItemsCount } = useCart();
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState(location.pathname);

  const handleNavigation = (href) => {
    setActiveTab(href);
    navigate(href);
  };

  const navigationItems = [
    {
      name: 'Home',
      href: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      )
    },
    {
      name: 'Products',
      href: '/products',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      name: 'Cart',
      href: '/cart',
      icon: (
        <div className="relative">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
          </svg>
          {getCartItemsCount() > 0 && (
            <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {getCartItemsCount() > 9 ? '9+' : getCartItemsCount()}
            </span>
          )}
        </div>
      ),
      activeIcon: (
        <div className="relative">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
          </svg>
          {getCartItemsCount() > 0 && (
            <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {getCartItemsCount() > 9 ? '9+' : getCartItemsCount()}
            </span>
          )}
        </div>
      )
    },
    {
      name: 'Profile',
      href: currentUser ? '/enhanced-buyer' : '/login',
      icon: (
        <div className="relative">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {notificationUnreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
            </span>
          )}
        </div>
      ),
      activeIcon: (
        <div className="relative">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {notificationUnreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
            </span>
          )}
        </div>
      )
    }
  ];

  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div 
      data-mobile-bottom-nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden safe-area-inset-bottom shadow-lg"
      style={{
        zIndex: 9999,
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0
      }}
    >
      <div className="flex items-center justify-around py-2" style={{ pointerEvents: 'auto' }}>
        {navigationItems.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.name}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent?.stopImmediatePropagation?.();
                try {
                  handleNavigation(item.href);
                } catch (error) {
                  console.error('Navigation error:', error);
                  // Fallback: direct navigation
                  window.location.href = item.href;
                }
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onTouchCancel={(e) => {
                e.stopPropagation();
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all touch-manipulation ${
                active
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-gray-500 active:text-gray-700'
              }`}
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                minHeight: '56px',
                minWidth: '56px',
                cursor: 'pointer',
                border: 'none',
                background: active ? 'rgb(236 253 245)' : 'transparent',
                outline: 'none',
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 10000,
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
            >
              <div className="mb-1" style={{ pointerEvents: 'none' }}>
                {active ? item.activeIcon : item.icon}
              </div>
              <span className="text-xs font-medium" style={{ pointerEvents: 'none' }}>{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNavigation;