import React, { useState, useEffect } from 'react';
import networkManager from '../utils/networkManager';

// Simple SVG icons to avoid external dependencies
const WifiIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
  </svg>
);

const WifiOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const NetworkStatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');

  useEffect(() => {
    // Listen for network changes
    const removeListener = networkManager.addListener((event, data) => {
      setIsOnline(data.isOnline);
      
      if (!data.isOnline) {
        // Show offline indicator
        setShowIndicator(true);
      } else {
        // Show "back online" message briefly
        setShowIndicator(true);
        setTimeout(() => {
          setShowIndicator(false);
        }, 3000);
      }
    });

    // Check connection quality
    const checkQuality = () => {
      if (networkManager.isSlowConnection()) {
        setConnectionQuality('slow');
      } else {
        setConnectionQuality('good');
      }
    };

    checkQuality();
    const qualityInterval = setInterval(checkQuality, 10000);

    return () => {
      removeListener();
      clearInterval(qualityInterval);
    };
  }, []);

  // Don't show if online and has been shown for long enough
  if (!showIndicator && isOnline) {
    return null;
  }

  return (
    <div
      className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        showIndicator ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'
      }`}
    >
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
          isOnline
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}
      >
        {isOnline ? (
          <>
            <WifiIcon />
            <span className="text-sm font-medium">Back online</span>
          </>
        ) : (
          <>
            <WifiOffIcon />
            <span className="text-sm font-medium">No internet connection</span>
          </>
        )}
      </div>
      
      {/* Slow connection warning */}
      {isOnline && connectionQuality === 'slow' && (
        <div className="mt-2 flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-lg">
          <AlertIcon />
          <span className="text-xs">Slow connection detected</span>
        </div>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;
