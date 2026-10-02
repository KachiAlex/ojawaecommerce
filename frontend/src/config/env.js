// Environment configuration utility
export const config = {
  // Payment configuration
  payments: {
    paystack: {
      publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    },
    stripe: {
      publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    },
  },

  // OpenStreetMap configuration (free, no API key required)
  openStreetMap: {
    nominatimUrl: 'https://nominatim.openstreetmap.org',
    osrmUrl: 'https://router.project-osrm.org',
  },

  // App configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Ojawa',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
  },

  // Debug environment variables
  debug: {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
  },

  // Feature flags
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    crashlytics: import.meta.env.VITE_ENABLE_CRASHLYTICS === 'true',
    externalLogging: import.meta.env.VITE_ENABLE_EXTERNAL_LOGS === 'true',
    pushNotifications: import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS === 'true',
  },

  // Development settings
  development: {
    debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
    logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  },

  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
}

// Validation function to check required environment variables
export const validateEnvironment = () => {
  const required = [
    'VITE_PAYSTACK_PUBLIC_KEY',
  ]

  const missing = required.filter(key => !import.meta.env[key])

  if (missing.length > 0 && import.meta.env.DEV) {
    console.warn(`Missing optional environment variables: ${missing.join(', ')}`)
  }
}

// Log configuration in development
if (config.isDevelopment && config.development.debugMode) {
  console.log('Environment Configuration:', config);
}

// Log configuration in development only
if (config.isDevelopment && config.development.debugMode) {
  console.log('🔗 API Base URL:', config.app.apiBaseUrl);
  console.log('🔍 Debug Info:', config.debug);
}
