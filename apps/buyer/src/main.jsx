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

// Register service worker for PWA after first paint/idle
if ('serviceWorker' in navigator) {
  const register = () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  };

  // Delay service worker registration to improve LCP
  if ('requestIdleCallback' in window) {
    requestIdleCallback(register, { timeout: 5000 });
  } else {
    setTimeout(register, 3000);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
