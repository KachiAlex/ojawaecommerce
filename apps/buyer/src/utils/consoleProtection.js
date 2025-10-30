/**
 * Console protection for production environments
 * Prevents sensitive information from being exposed via browser console
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

export const setupConsoleProtection = () => {
  // Only apply protection in production
  if (!isProduction) {
    console.log('🔓 Development mode - full console access enabled');
    return;
  }

  console.log('🔒 Production mode - console protection enabled');

  // Store original console methods
  const originalConsole = {
    log: console.log,
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
    table: console.table,
    group: console.group,
    groupEnd: console.groupEnd,
    trace: console.trace,
    dir: console.dir,
    dirxml: console.dirxml
  };

  // Create a filtered version that only shows important messages
  const createFilteredConsole = (method, originalMethod) => {
    return function (...args) {
      // Allow error messages (for debugging critical issues)
      if (method === 'error') {
        // Filter out sensitive data from errors
        const filteredArgs = args.map(arg => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message;
          return '[Object]';
        });
        originalMethod.apply(console, filteredArgs);
        return;
      }

      // Allow warnings (important for users)
      if (method === 'warn') {
        originalMethod.apply(console, args);
        return;
      }

      // Block all other console methods in production
      // This prevents data leakage through debug/info/log
      return;
    };
  };

  // Override console methods
  console.log = createFilteredConsole('log', originalConsole.log);
  console.debug = createFilteredConsole('debug', originalConsole.debug);
  console.info = createFilteredConsole('info', originalConsole.info);
  console.warn = createFilteredConsole('warn', originalConsole.warn);
  console.error = createFilteredConsole('error', originalConsole.error);
  console.table = () => {};
  console.group = () => {};
  console.groupEnd = () => {};
  console.trace = () => {};
  console.dir = () => {};
  console.dirxml = () => {};

  // Display warning message to anyone trying to use console
  setTimeout(() => {
    console.clear();
    
    const warningStyle = 'font-size: 24px; color: #dc2626; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);';
    const messageStyle = 'font-size: 14px; color: #7f1d1d; font-weight: normal;';
    
    console.log('%c⚠️ STOP!', warningStyle);
    console.log('%cThis browser feature is intended for developers only.', messageStyle);
    console.log('%cIf someone told you to copy-paste something here, it could be a scam to steal your account or personal information.', messageStyle);
    console.log('%c\nUnauthorized access to application internals is prohibited.', messageStyle);
    console.log('%c\n© 2025 Ojawa E-commerce Platform. All rights reserved.', 'color: #059669; font-weight: bold;');
  }, 1000);

  // Prevent common console inspection techniques
  if (window.console && window.console.constructor) {
    Object.defineProperty(window.console.constructor.prototype, 'toString', {
      value: function () {
        return '[object Console]';
      },
      writable: false,
      configurable: false
    });
  }

  // Detect DevTools opening (basic detection)
  let devtoolsOpen = false;
  const element = new Image();
  
  Object.defineProperty(element, 'id', {
    get: function () {
      devtoolsOpen = true;
      return 'devtools-detector';
    }
  });

  // Check periodically
  setInterval(() => {
    console.log(element);
    console.clear();
    
    if (devtoolsOpen) {
      // Show warning when DevTools are detected
      console.log('%c🔒 Security Notice', 'font-size: 16px; color: #dc2626; font-weight: bold;');
      console.log('%cConsole access is restricted in production mode.', 'color: #991b1b;');
      console.log('%cFor support, contact: support@ojawa.com', 'color: #059669;');
    }
    
    devtoolsOpen = false;
  }, 5000);

  // Prevent right-click inspection on production (optional)
  if (isProduction) {
    document.addEventListener('contextmenu', (e) => {
      // Only prevent on specific elements if needed
      // Full prevention might annoy users, so we keep it minimal
      if (e.target.closest('.sensitive-data')) {
        e.preventDefault();
        console.warn('Right-click is disabled on sensitive areas.');
      }
    });

    // Detect common keyboard shortcuts for DevTools
    document.addEventListener('keydown', (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        // Don't prevent, just log
        console.log('🔒 DevTools access detected');
      }
    });
  }

  // Store reference to original console for emergency debugging
  window.__originalConsole = originalConsole;
  
  console.log('✅ Console protection activated');
};

/**
 * Utility to temporarily enable console for debugging (admin only)
 */
export const enableDebugMode = (password) => {
  if (password === import.meta.env.VITE_DEBUG_PASSWORD) {
    console.log('🔓 Debug mode enabled');
    // Restore original console
    if (window.__originalConsole) {
      Object.assign(console, window.__originalConsole);
      console.log('✅ Full console access restored');
      return true;
    }
  }
  console.error('❌ Invalid debug password');
  return false;
};

// Make it available globally for emergency use
if (typeof window !== 'undefined') {
  window.__enableDebugMode = enableDebugMode;
}

export default setupConsoleProtection;

