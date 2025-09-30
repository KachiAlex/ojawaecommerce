import { config } from '../config/env.js'

class ErrorLogger {
  constructor() {
    this.logLevel = config.development.logLevel || 'info'
    this.isDevelopment = config.isDevelopment
    this.debugMode = config.development.debugMode
  }

  // Log levels: error, warn, info, debug
  log(level, message, error = null, context = {}) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      error: error ? this.serializeError(error) : null,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    // Always log to console in development
    if (this.isDevelopment) {
      this.logToConsole(level, logEntry)
    }

    // Log to external service in production
    if (config.isProduction && this.shouldLog(level)) {
      this.logToExternalService(logEntry)
    }
  }

  logToConsole(level, logEntry) {
    const { message, error, context } = logEntry
    
    switch (level) {
      case 'error':
        console.error(`[ERROR] ${message}`, error, context)
        break
      case 'warn':
        console.warn(`[WARN] ${message}`, context)
        break
      case 'info':
        console.info(`[INFO] ${message}`, context)
        break
      case 'debug':
        console.debug(`[DEBUG] ${message}`, context)
        break
      default:
        console.log(`[${level.toUpperCase()}] ${message}`, context)
    }
  }

  async logToExternalService(logEntry) {
    try {
      // In a real app, you would send to Firebase Crashlytics, Sentry, or another service
      // For now, we'll just log to a hypothetical endpoint
      
      if (config.features.crashlytics) {
        // Send to Firebase Crashlytics
        await this.sendToFirebaseCrashlytics(logEntry)
      }
      
      // Send to custom logging endpoint
      await this.sendToCustomEndpoint(logEntry)
    } catch (error) {
      console.error('Failed to log to external service:', error)
    }
  }

  async sendToFirebaseCrashlytics(logEntry) {
    // TODO: Implement Firebase Crashlytics integration
    console.log('Would send to Firebase Crashlytics:', logEntry)
  }

  async sendToCustomEndpoint(logEntry) {
    try {
      const response = await fetch(`${config.app.apiBaseUrl}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to send log to custom endpoint:', error)
    }
  }

  serializeError(error) {
    if (!error) return null

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.code && { code: error.code }),
      ...(error.cause && { cause: error.cause }),
    }
  }

  shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)
    
    return messageLevelIndex <= currentLevelIndex
  }

  // Convenience methods
  error(message, error = null, context = {}) {
    this.log('error', message, error, context)
  }

  warn(message, context = {}) {
    this.log('warn', message, null, context)
  }

  info(message, context = {}) {
    this.log('info', message, null, context)
  }

  debug(message, context = {}) {
    this.log('debug', message, null, context)
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger()

// Global error handler
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.error(
      'Unhandled Promise Rejection',
      event.reason,
      { type: 'unhandledrejection' }
    )
  })

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    errorLogger.error(
      'Global JavaScript Error',
      event.error,
      {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    )
  })

  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      errorLogger.error(
        'Resource Loading Error',
        null,
        {
          type: 'resource_error',
          tagName: event.target.tagName,
          src: event.target.src || event.target.href,
        }
      )
    }
  }, true)
}

// React error boundary helper
export const logComponentError = (error, errorInfo, componentName) => {
  errorLogger.error(
    `Component Error in ${componentName}`,
    error,
    {
      type: 'component_error',
      componentName,
      componentStack: errorInfo.componentStack,
    }
  )
}
