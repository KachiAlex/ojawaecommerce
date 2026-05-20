// Force API URL fix for production
// This script will be injected to override any cached API calls
(function() {
  'use strict';
  
  // Override fetch to force API calls to Render backend
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options] = args;
    
    const backendBase = 'https://ojawa-green.vercel.app';

    // If it's a relative API call, redirect to Vercel backend
    if (typeof url === 'string' && url.startsWith('/api/')) {
      const targetUrl = backendBase + url;
      console.log('🔄 Redirecting API call:', url, '→', targetUrl);
      return originalFetch.call(this, targetUrl, options);
    }

    // If it's a relative call to current domain for API, redirect
    if (typeof url === 'string' && 
        (url.includes('api/') || url.includes('/api')) && 
        !url.startsWith('http')) {
      const targetUrl = backendBase + '/api' + url.replace(/.*api/, '');
      console.log('🔄 Redirecting API call:', url, '→', targetUrl);
      return originalFetch.call(this, targetUrl, options);
    }

    return originalFetch.apply(this, args);
  };
  
  console.log('✅ API URL override loaded - forcing Vercel backend calls');
})();
