/**
 * Frontend Error Tracking & Reporting Service
 * Captures and reports frontend errors to backend
 */

class ErrorTracker {
  constructor(config = {}) {
    this.apiEndpoint = config.apiEndpoint || '/api/errors';
    this.sessionId = this.generateSessionId();
    this.userId = config.userId || null;
    this.environment = config.environment || 'production';
    this.maxQueueSize = config.maxQueueSize || 50;
    this.flushInterval = config.flushInterval || 30000; // 30s
    this.errorQueue = [];
    this.isEnabled = config.enabled !== false;

    this.initializeGlobalHandlers();
    this.startFlushInterval();
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set user ID for error tracking
  setUserId(userId) {
    this.userId = userId;
  }

  // Capture uncaught errors
  initializeGlobalHandlers() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureError({
          type: 'uncaught-error',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        });
      });

      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError({
          type: 'unhandled-rejection',
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack,
        });
      });

      // Capture React errors (if using error boundary)
      if (window.__REACT_ERROR_BOUNDARY__) {
        window.__REACT_ERROR_BOUNDARY__ = (error, info) => {
          this.captureError({
            type: 'react-error',
            message: error.message,
            stack: error.stack,
            componentStack: info.componentStack,
          });
        };
      }
    }
  }

  // Main error capture method
  captureError(errorData) {
    if (!this.isEnabled) return;

    const errorEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      environment: this.environment,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight,
      } : null,
      ...errorData,
    };

    // Add to queue
    this.errorQueue.push(errorEntry);

    // Log locally in development
    if (this.environment === 'development') {
      console.error('[ErrorTracker]', errorData);
    }

    // Flush if queue is full
    if (this.errorQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  // API error capture (from fetch/axios)
  captureApiError(config = {}) {
    return (error) => {
      this.captureError({
        type: 'api-error',
        message: error.message,
        statusCode: error.response?.status,
        url: config.url,
        method: config.method,
        data: config.data,
        responseData: error.response?.data,
        stack: error.stack,
      });
      throw error; // Re-throw for caller to handle
    };
  }

  // React component error wrapper
  captureComponentError(componentName) {
    return (error, errorInfo) => {
      this.captureError({
        type: 'react-component-error',
        component: componentName,
        message: error.message,
        stack: error.stack,
        errorInfo: errorInfo.componentStack,
      });
    };
  }

  // Performance monitoring
  trackPerformanceIssue(metric, threshold) {
    return (value) => {
      if (value > threshold) {
        this.captureError({
          type: 'performance-issue',
          metric,
          value,
          threshold,
          message: `${metric} exceeded threshold: ${value}ms > ${threshold}ms`,
        });
      }
    };
  }

  // Flush errors to backend
  async flush() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ errors }),
      });

      if (!response.ok) {
        console.error(`Failed to report errors: ${response.status}`);
        // Re-queue errors that couldn't be sent (but limit to prevent infinite queue)
        if (this.errorQueue.length < this.maxQueueSize / 2) {
          this.errorQueue.push(...errors);
        }
      }
    } catch (error) {
      console.error('Failed to send errors to backend:', error);
      // Re-queue on network failure
      if (this.errorQueue.length < this.maxQueueSize / 2) {
        this.errorQueue.push(...errors);
      }
    }
  }

  // Auto-flush interval
  startFlushInterval() {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.flush(), this.flushInterval);
    }
  }

  // Disable tracking
  disable() {
    this.isEnabled = false;
  }

  // Enable tracking
  enable() {
    this.isEnabled = true;
  }

  // Get session stats
  getStats() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      queueSize: this.errorQueue.length,
      environment: this.environment,
    };
  }
}

// Export singleton instance
let trackerInstance = null;

function initializeErrorTracker(config = {}) {
  trackerInstance = new ErrorTracker(config);
  return trackerInstance;
}

function getErrorTracker() {
  if (!trackerInstance) {
    trackerInstance = new ErrorTracker();
  }
  return trackerInstance;
}

export { ErrorTracker, initializeErrorTracker, getErrorTracker };
