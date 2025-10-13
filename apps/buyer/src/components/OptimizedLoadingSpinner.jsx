import React from 'react';

// Lightweight loading spinner component
export const OptimizedLoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 ${sizeClasses[size]}`} />
      {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
    </div>
  );
};

// Route-specific loading components
export const RouteLoadingSpinner = ({ route }) => {
  const routeTexts = {
    admin: 'Loading Admin Dashboard...',
    vendor: 'Loading Vendor Portal...',
    logistics: 'Loading Logistics Center...',
    tracking: 'Loading Tracking System...',
    wallet: 'Loading Wallet...',
    checkout: 'Loading Checkout...',
    default: 'Loading...'
  };

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <OptimizedLoadingSpinner 
        size="lg" 
        text={routeTexts[route] || routeTexts.default} 
      />
    </div>
  );
};

// Component-specific loading
export const ComponentLoadingSpinner = ({ component }) => {
  return (
    <div className="flex items-center justify-center p-2">
      <OptimizedLoadingSpinner size="sm" />
    </div>
  );
};

export default OptimizedLoadingSpinner;
