import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Note: Do not remove Flutterwave script on startup; it must remain available for checkout

// Global error handler to suppress browser extension errors
window.addEventListener('error', (event) => {
  // Suppress MutationObserver errors from browser extensions
  if (event.error && event.error.message && 
      event.error.message.includes('MutationObserver') &&
      event.filename && event.filename.includes('content-script')) {
    event.preventDefault();
    return false;
  }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  // Suppress non-critical promise rejections
  if (event.reason && event.reason.message && 
      event.reason.message.includes('MutationObserver')) {
    event.preventDefault();
    return false;
  }
});

// Ensure legacy Ojawa PWA service workers are removed while allowing other SW usage (e.g. Firebase messaging)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => {
      let removed = false;
      registrations.forEach((registration) => {
        const scriptUrl = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL;
        if (scriptUrl?.includes('/sw.js')) {
          registration.unregister();
          removed = true;
        }
      });
      if (removed) {
        console.log('Removed legacy Ojawa PWA service worker');
      }
    })
    .catch((err) => {
      console.warn('Unable to inspect service worker registrations', err);
    });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
