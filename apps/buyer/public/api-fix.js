// Force API URL fix for production
// This script will be injected to override any cached API calls
(function() {
  'use strict';
  
  // Override fetch to force API calls to Render backend
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options] = args;
    
    // If it's a relative API call, redirect to Render backend
    if (typeof url === 'string' && url.startsWith('/api/')) {
      const renderUrl = 'https://ojawaecommerce.onrender.com' + url;
      console.log('🔄 Redirecting API call:', url, '→', renderUrl);
      return originalFetch.call(this, renderUrl, options);
    }
    
    // If it's a relative call to current domain for API, redirect
    if (typeof url === 'string' && 
        (url.includes('api/') || url.includes('/api')) && 
        !url.startsWith('http')) {
      const renderUrl = 'https://ojawaecommerce.onrender.com/api' + url.replace(/.*api/, '');
      console.log('🔄 Redirecting API call:', url, '→', renderUrl);
      return originalFetch.call(this, renderUrl, options);
    }
    
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ API URL override loaded - forcing Render backend calls');
})();
