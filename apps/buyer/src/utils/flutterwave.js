// Flutterwave Checkout helper for wallet top-ups
// Loads the Flutterwave inline script on demand and opens the checkout modal

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { config } from '../config/env';

/**
 * Dynamically loads the Flutterwave inline checkout script
 * @returns {Promise<void>}
 */
function loadFlutterwaveScript() {
  return new Promise((resolve, reject) => {
    // Check if FlutterwaveCheckout is already available
    if (typeof window !== 'undefined' && window.FlutterwaveCheckout) {
      console.log('FlutterwaveCheckout already available');
      resolve();
      return;
    }
    
    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="checkout.flutterwave"]');
    if (existingScript) {
      console.log('Flutterwave script already in DOM, waiting for load...');
      // Wait for it to load
      if (window.FlutterwaveCheckout) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => {
          console.log('Existing Flutterwave script loaded');
          resolve();
        });
        existingScript.addEventListener('error', (e) => {
          console.error('Existing Flutterwave script failed to load:', e);
          reject(new Error('Failed to load Flutterwave script'));
        });
      }
      return;
    }
    
  // Create and load the script with robust retries and timeout
  const createScript = () => document.createElement('script');
  // Try multiple CDN URLs (with cache-busting) as fallback
  const ts = Date.now();
  // Use only the official Flutterwave domain to satisfy CSP
  const scriptUrls = [
    `https://checkout.flutterwave.com/v3.js?cb=${ts}`
  ];

  let currentUrlIndex = 0;
  let timeoutId = null;

  const tryLoadScript = () => {
    if (currentUrlIndex >= scriptUrls.length) {
      reject(new Error('Failed to load Flutterwave script from all sources'));
      return;
    }

    const script = createScript();
    script.src = scriptUrls[currentUrlIndex];
    script.async = true;
    // Do not set crossOrigin to avoid CORS requirement on third-party script

    const clear = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      script.onload = null;
      script.onerror = null;
    };

    // Fallback to next URL after timeout (8s)
    timeoutId = setTimeout(() => {
      console.warn('Flutterwave script load timed out:', script.src);
      clear();
      script.remove();
      currentUrlIndex++;
      tryLoadScript();
    }, 8000);

    script.onload = () => {
      if (window.FlutterwaveCheckout) {
        console.log('Flutterwave script loaded successfully from:', script.src);
        clear();
        resolve();
      } else {
        console.warn('Script loaded but FlutterwaveCheckout not available, trying next URL...');
        clear();
        script.remove();
        currentUrlIndex++;
        tryLoadScript();
      }
    };

    script.onerror = () => {
      console.warn('Failed to load Flutterwave script from:', script.src);
      clear();
      script.remove();
      currentUrlIndex++;
      tryLoadScript();
    };

    // Hint the browser to preconnect DNS/TLS
    try {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = new URL(script.src).origin;
      document.head.appendChild(link);
    } catch {}

    document.head.appendChild(script);
  };

  tryLoadScript();
  });
}

/**
 * Opens Flutterwave checkout for wallet top-up
 * @param {Object} params - Payment parameters
 * @param {Object} params.user - User object with uid, email, displayName
 * @param {number} params.amount - Amount to charge
 * @param {string} params.currency - Currency code (default: NGN)
 * @returns {Promise<Object>} Payment result
 */
export async function openWalletTopUpCheckout({ user, amount, currency = 'NGN' }) {
  if (!user) throw new Error('User is required');
  if (!amount || Number(amount) <= 0) throw new Error('Invalid amount');
  
  console.log('Flutterwave config:', config?.payments?.flutterwave);
  const publicKey = config?.payments?.flutterwave?.publicKey;
  if (!publicKey) {
    console.error('Flutterwave public key not configured. Config:', config);
    throw new Error('Flutterwave public key not configured. Please contact support.');
  }
  
  console.log('Using Flutterwave public key:', publicKey.substring(0, 20) + '...');

  try {
    await loadFlutterwaveScript();
  } catch (error) {
    console.error('Failed to load Flutterwave:', error);
    throw new Error('Unable to load payment system. Please try again later.');
  }

  const txRef = `WALLET-${user.uid}-${Date.now()}`;

  return new Promise((resolve, reject) => {
    try {
      // Check if FlutterwaveCheckout is available
      if (!window.FlutterwaveCheckout) {
        reject(new Error('Flutterwave checkout not available'));
        return;
      }

      window.FlutterwaveCheckout({
        public_key: publicKey,
        tx_ref: txRef,
        amount: Number(amount),
        currency,
        payment_options: 'card,mobilemoney,ussd,banktransfer',
        customer: {
          email: user.email || 'user@example.com',
          phone_number: user.phoneNumber || '',
          name: user.displayName || 'User',
        },
        meta: {
          purpose: 'wallet_topup',
          userId: user.uid,
        },
        customizations: {
          title: config?.app?.name || 'Ojawa',
          description: 'Add funds to wallet',
          logo: '',
        },
        callback: async (response) => {
          console.log('Flutterwave callback response:', response);
          
          try {
            // Check if payment was successful
            if (response?.status !== 'completed' && response?.status !== 'successful') {
              throw new Error(`Payment failed with status: ${response?.status}`);
            }

            const transactionId = response?.transaction_id || response?.id;
            if (!transactionId) {
              throw new Error('Missing transaction ID from payment response');
            }

            // Verify and top up wallet via Cloud Function (server-side validation)
            const topupFn = httpsCallable(functions, 'topupWalletFlutterwave');
            const res = await topupFn({ 
              transactionId, 
              userId: user.uid, 
              amount: Number(amount) 
            });
            
            resolve({ 
              success: true, 
              data: res?.data, 
              txRef, 
              transactionId 
            });
          } catch (e) {
            console.error('Error verifying payment:', e);
            reject(e);
          }
        },
        onclose: () => {
          // User closed the payment modal
          console.log('Payment modal closed by user');
          reject(new Error('Payment window closed'));
        },
      });
    } catch (err) {
      console.error('Error initializing Flutterwave checkout:', err);
      reject(err);
    }
  });
}


