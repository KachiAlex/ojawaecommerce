import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useMessaging } from '../contexts/MessagingContext';
import { useNotifications } from '../contexts/NotificationContext';

const MobileBottomNavigation = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { getCartItemsCount } = useCart();
  const { unreadCount: messagingUnreadCount } = useMessaging();
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState(location.pathname);

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
      name: 'Messages',
      href: '/messages',
      icon: (
        <div className="relative">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {messagingUnreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {messagingUnreadCount > 9 ? '9+' : messagingUnreadCount}
            </span>
          )}
        </div>
      ),
      activeIcon: (
        <div className="relative">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {messagingUnreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {messagingUnreadCount > 9 ? '9+' : messagingUnreadCount}
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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex items-center justify-around py-2">
        {navigationItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setActiveTab(item.href)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                active
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="mb-1">
                {active ? item.activeIcon : item.icon}
              </div>
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNavigation;