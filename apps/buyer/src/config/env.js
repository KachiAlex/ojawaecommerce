// Environment configuration utility
export const config = {
  // Firebase configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  },

  // Payment configuration
  payments: {
    flutterwave: {
      publicKey: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
    },
    stripe: {
      publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    },
  },

  // App configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Ojawa',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  },

  // Feature flags
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    crashlytics: import.meta.env.VITE_ENABLE_CRASHLYTICS === 'true',
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
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
  ]

  const missing = required.filter(key => !import.meta.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Log configuration in development
if (config.isDevelopment && config.development.debugMode) {
  console.log('Environment Configuration:', config)
}
