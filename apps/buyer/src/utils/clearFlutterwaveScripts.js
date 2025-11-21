// Utility to clear any existing Flutterwave scripts from the DOM
export const clearFlutterwaveScripts = () => {
  // Remove any existing Flutterwave scripts
  const scripts = document.querySelectorAll('script[src*="flutterwave"], script[src*="fpjs"]');
  scripts.forEach(script => {
    script.remove();
  });

  // Clear any Flutterwave global objects
  if (window.FlutterwaveCheckout) {
    delete window.FlutterwaveCheckout;
  }

  // Clear any fingerprinting scripts
  const fpScripts = document.querySelectorAll('script[src*="fpjs.io"]');
  fpScripts.forEach(script => {
    script.remove();
  });

  console.log('Cleared Flutterwave scripts from DOM');
};

// Auto-clear on import
if (typeof window !== 'undefined') {
  clearFlutterwaveScripts();
}
