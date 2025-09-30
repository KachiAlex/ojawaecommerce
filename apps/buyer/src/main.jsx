import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Clear any existing Flutterwave scripts on app startup
const clearFlutterwaveScripts = () => {
  const scripts = document.querySelectorAll('script[src*="flutterwave"], script[src*="fpjs"]');
  scripts.forEach(script => script.remove());
  
  if (window.FlutterwaveCheckout) {
    delete window.FlutterwaveCheckout;
  }
  
  console.log('Cleared Flutterwave scripts on app startup');
};

// Run cleanup immediately
clearFlutterwaveScripts();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
