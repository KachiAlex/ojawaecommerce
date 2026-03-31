/**
 * Centralized Error Handler & Logging Module
 * Handles all error management, structured logging, and error recovery
 */

// Firebase removed: errorHandler now uses REST backend
// TODO: Replace db operations with REST API/backend DB calls
// const db = ...

// Error severity levels
const ERROR_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical',
};

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode = 500, level = ERROR_LEVELS.ERROR, context = {}) {
    super(message);
    this.statusCode = statusCode;
    this.level = level;
    this.context = context;
    this.timestamp = new Date();
  }
}

class ValidationError extends AppError {
  constructor(message, context = {}) {
    super(message, 400, ERROR_LEVELS.WARN, context);
    this.name = 'ValidationError';
  }
}

class AuthError extends AppError {
  constructor(message, context = {}) {
    super(message, 401, ERROR_LEVELS.WARN, context);
    this.name = 'AuthError';
  }
}

class NotFoundError extends AppError {
  constructor(resource, id, context = {}) {
    super(`${resource} not found: ${id}`, 404, ERROR_LEVELS.WARN, context);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message, context = {}) {
    super(message, 409, ERROR_LEVELS.WARN, context);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(context = {}) {
    super('Rate limit exceeded', 429, ERROR_LEVELS.WARN, context);
    this.name = 'RateLimitError';
  }
}

// Structured logging function
async function logError(error, requestContext = {}) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: error.message,
    level: error.level || ERROR_LEVELS.ERROR,
    name: error.name || 'UnknownError',
    statusCode: error.statusCode || 500,
    stack: error.stack || '',
    context: {
      ...error.context,
      ...requestContext,
    },
    environment: process.env.NODE_ENV || 'development',
  };

  // Log to console for immediate visibility
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${errorLog.level.toUpperCase()}] ${error.name}: ${error.message}`;
  
  if (error.level === ERROR_LEVELS.CRITICAL) {
    console.error(logMessage, errorLog.context);
  } else if (error.level === ERROR_LEVELS.ERROR) {
    console.error(logMessage, errorLog.context);
  } else {
    console.warn(logMessage, errorLog.context);
  }

  // TODO: Store errorLog in backend DB or via REST API for monitoring & audit
  // Example: await fetch('https://your-backend/logs', { method: 'POST', body: JSON.stringify(errorLog) })

  return errorLog;
}

// Request/Response logging middleware
function createRequestLogger(options = {}) {
  return (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random()}`;
    
    // Store request metadata on req object
    req.requestId = requestId;
    req.startTime = startTime;

    // Log request
    const requestLog = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      query: req.query,
      userId: req.user?.uid || 'anonymous',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    if (options.logBody && req.body) {
      // Don't log sensitive fields
      const sanitizedBody = { ...req.body };
      delete sanitizedBody.password;
      delete sanitizedBody.token;
      delete sanitizedBody.secret;
      requestLog.body = sanitizedBody;
    }

    console.log(`[${requestLog.timestamp}] 📨 ${requestLog.method} ${requestLog.path}`, { requestId });

    // Override res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      const duration = Date.now() - startTime;
      const responseLog = {
        requestId,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        size: JSON.stringify(data).length,
        timestamp: new Date().toISOString(),
      };

      console.log(`[${responseLog.timestamp}] ✅ ${responseLog.statusCode} ${responseLog.duration}`, { requestId });

      // Store successful request log
      if (options.storeSuccessful) {
        db.collection('request_logs').add({
          ...requestLog,
          ...responseLog,
          type: 'success',
        }).catch(err => console.error('Failed to log request:', err.message));
      }
            // TODO: Store requestLog/responseLog in backend DB or via REST API
            // Example: await fetch('https://your-backend/request-logs', { method: 'POST', body: JSON.stringify({ ...requestLog, ...responseLog, type: 'success' }) })
  };
}

// Global error handler middleware (should be last)
function errorHandlerMiddleware(err, req, res, next) {
  // Extract error details
  const appError = err instanceof AppError
    ? err
    : new AppError(
        err.message || 'Internal server error',
        err.statusCode || 500,
        ERROR_LEVELS.ERROR,
        { originalError: err.toString() }
      );

  // Build request context
  const requestContext = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.uid,
  };

  // Log the error
  logError(appError, requestContext).catch(console.error);

  // Store error log if critical
  if (appError.level === ERROR_LEVELS.CRITICAL) {
    db.collection('critical_errors').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: appError.message,
      context: requestContext,
      stack: appError.stack,
      code: appError.name,
      requestId: req.requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: appError.stack }),
    }).catch(err => console.error('Failed to log critical error:', err.message));
    // TODO: Store error log if critical in backend DB or via REST API
    // Example: await fetch('https://your-backend/critical-errors', { method: 'POST', body: JSON.stringify({ ... }) })
  }
}

// Async error wrapper for Express handlers
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Firestore transaction error recovery
async function executeWithRetry(operation, maxRetries = 3, backoffMs = 100) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable (Firestore UNAVAILABLE, DEADLINE_EXCEEDED)
      const isRetryable = 
        error.code === 'UNAVAILABLE' ||
        error.code === 'DEADLINE_EXCEEDED' ||
        error.code === 'INTERNAL' ||
        error.message.includes('RESOURCE_EXHAUSTED');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.warn(`Retrying operation (attempt ${attempt}/${maxRetries}) after ${delay}ms`, {
        error: error.message,
      });
    }
  }
  
  throw lastError;
}

// Firestore validation & error handler
async function safeFirestoreOperation(operationName, operation) {
  try {
    return await executeWithRetry(operation);
  } catch (error) {
    const context = {
      operation: operationName,
      errorCode: error.code,
      errorMessage: error.message,
    };
    
    if (error.code === 'PERMISSION_DENIED') {
      throw new AuthError('Permission denied for this operation', context);
    }
    
    if (error.code === 'NOT_FOUND') {
      throw new NotFoundError('Document', operationName, context);
    }
    
    if (error.code === 'ALREADY_EXISTS') {
      throw new ConflictError('Resource already exists', context);
    }
    
    throw new AppError(
      `Firestore operation failed: ${error.message}`,
      500,
      ERROR_LEVELS.ERROR,
      context
    );
  }
}

// Error recovery strategies
const ErrorRecovery = {
  // Retry with backoff
  async retryWithBackoff(fn, maxAttempts = 3) {
    return executeWithRetry(fn, maxAttempts);
  },

  // Fallback data
  async getWithFallback(primaryFn, fallbackData = null) {
    try {
      return await primaryFn();
    } catch (error) {
      console.warn('Primary operation failed, using fallback:', error.message);
      return fallbackData;
    }
  },

  // Circuit breaker pattern (simplified)
  createCircuitBreaker(operation, threshold = 5, timeout = 60000) {
    let failureCount = 0;
    let lastFailureTime = null;
    let isOpen = false;

    return async function (...args) {
      // Check if circuit should reset
      if (isOpen && Date.now() - lastFailureTime > timeout) {
        isOpen = false;
        failureCount = 0;
        console.log('Circuit breaker reset');
      }

      if (isOpen) {
        throw new AppError('Service temporarily unavailable', 503, ERROR_LEVELS.WARN);
      }

      try {
        const result = await operation(...args);
        failureCount = 0; // Reset on success
        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = Date.now();

        if (failureCount >= threshold) {
          isOpen = true;
          console.error('Circuit breaker opened after', failureCount, 'failures');
        }

        throw error;
      }
    };
  },
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // Logging & handling
  logError,
  createRequestLogger,
  errorHandlerMiddleware,
  asyncHandler,
  
  // Firestore utilities
  safeFirestoreOperation,
  executeWithRetry,
  
  // Recovery strategies
  ErrorRecovery,
  
  // Constants
  ERROR_LEVELS,
};
