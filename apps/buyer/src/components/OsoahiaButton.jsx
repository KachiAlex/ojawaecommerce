import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import OsoahiaChat from './OsoahiaChat';

const OsoahiaButton = ({ context = null }) => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Show button after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Check for new notifications or suggestions
  useEffect(() => {
    if (currentUser) {
      // In a real app, you might check for:
      // - New product recommendations
      // - Cart abandonment notifications
      // - Price drop alerts
      // - Order updates
      
      // For now, we'll simulate occasional notifications
      const interval = setInterval(() => {
        if (Math.random() < 0.1) { // 10% chance every 30 seconds
          setNotificationCount(prev => prev + 1);
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleClick = () => {
    setIsOpen(true);
    setNotificationCount(0); // Clear notifications when opened
  };

  if (!currentUser || !isVisible) return null;

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleClick}
          className="relative bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:bg-emerald-700 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-emerald-300"
          title="Chat with Osoahia - Your AI Shopping Assistant"
        >
          {/* Avatar */}
          <div className="w-8 h-8 flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          
          {/* Notification Badge */}
          {notificationCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {notificationCount > 9 ? '9+' : notificationCount}
            </div>
          )}
          
          {/* Pulse Animation */}
          <div className="absolute inset-0 bg-emerald-600 rounded-full animate-ping opacity-20"></div>
        </button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg opacity-0 hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span>👋</span>
            <span>Hi! I'm Osoahia</span>
          </div>
          <div className="text-xs text-gray-300 mt-1">
            Your AI shopping assistant
          </div>
          
          {/* Tooltip Arrow */}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>

      {/* Chat Modal */}
      <OsoahiaChat 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        context={context}
      />
    </>
  );
};

export default OsoahiaButton;
