// Centralized Error Handler & Logging Module
// Clean, robust implementation to replace broken version and ensure correct parsing

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
    this.name = this.constructor.name;
  }
}

class ValidationError extends AppError { constructor(message, context = {}) { super(message, 400, ERROR_LEVELS.WARN, context); } }
class AuthError extends AppError { constructor(message, context = {}) { super(message, 401, ERROR_LEVELS.WARN, context); } }
class NotFoundError extends AppError { constructor(resource, id, context = {}) { super(`${resource} not found: ${id}`, 404, ERROR_LEVELS.WARN, context); } }
class ConflictError extends AppError { constructor(message, context = {}) { super(message, 409, ERROR_LEVELS.WARN, context); } }
class RateLimitError extends AppError { constructor(context = {}) { super('Rate limit exceeded', 429, ERROR_LEVELS.WARN, context); } }

// Lightweight logging utility — safe if external dependencies like `db` or `admin` are unavailable
async function logError(error, requestContext = {}) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: error.message || 'Unknown error',
    level: error.level || ERROR_LEVELS.ERROR,
    name: error.name || 'UnknownError',
    statusCode: error.statusCode || 500,
    stack: error.stack || '',
    context: { ...(error.context || {}), ...requestContext },
    environment: process.env.NODE_ENV || 'development',
  };

  // Console output for immediate visibility
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${(errorLog.level || 'error').toUpperCase()}] ${errorLog.name}:`;
  if (errorLog.level === ERROR_LEVELS.CRITICAL || errorLog.level === ERROR_LEVELS.ERROR) {
    console.error(prefix, errorLog.message, errorLog.context);
  } else {
    console.warn(prefix, errorLog.message, errorLog.context);
  }

  // Best-effort persistence if `db` exists (optional)
  try {
    if (typeof db !== 'undefined' && db && typeof db.collection === 'function') {
      await db.collection('error_logs').add(errorLog).catch(() => {});
    }
  } catch (e) {
    // swallow — logging should never crash the app
  }

  return errorLog;
}

// Request logger middleware factory
function createRequestLogger(options = {}) {
  const opts = Object.assign({ logBody: false, storeSuccessful: false }, options);

  return (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    req.requestId = requestId;

    const requestLog = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      query: req.query,
      userId: req.user?.uid || 'anonymous',
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get?.('user-agent') || 'unknown',
    };

    if (opts.logBody && req.body) {
      const sanitized = { ...req.body };
      delete sanitized.password; delete sanitized.token; delete sanitized.secret;
      requestLog.body = sanitized;
    }

    console.log(`[${requestLog.timestamp}] 📨 ${requestLog.method} ${requestLog.path}`, { requestId });

    const originalJson = res.json.bind(res);
    res.json = function (data) {
      const duration = Date.now() - startTime;
      const responseLog = {
        requestId,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        size: (() => { try { return JSON.stringify(data).length } catch { return 0 } })(),
        timestamp: new Date().toISOString(),
      };

      console.log(`[${responseLog.timestamp}] ✅ ${responseLog.statusCode} ${responseLog.duration}`, { requestId });

      // best-effort store
      try {
        if (opts.storeSuccessful && typeof db !== 'undefined' && db && typeof db.collection === 'function') {
          db.collection('request_logs').add({ ...requestLog, ...responseLog, type: 'success' }).catch(()=>{});
        }
      } catch (e) {}

      return originalJson(data);
    };

    next();
  };
}

// Error handling middleware
function errorHandlerMiddleware(err, req, res, next) {
  const appError = err instanceof AppError ? err : new AppError(err?.message || 'Internal server error', err?.statusCode || 500, ERROR_LEVELS.ERROR, { originalError: String(err) });
  const requestContext = { requestId: req.requestId, method: req.method, path: req.path, userId: req.user?.uid };

  // Log asynchronously (don't await)
  logError(appError, requestContext).catch(() => {});

  const payload = {
    error: appError.message,
    code: appError.name,
  };

  if (process.env.NODE_ENV === 'development') payload.stack = appError.stack;

  res.status(appError.statusCode || 500).json(payload);
}

// Async wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Retry helper
async function executeWithRetry(operation, maxRetries = 3, backoffMs = 100) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (e) {
      lastErr = e;
      const isRetryable = ['UNAVAILABLE','DEADLINE_EXCEEDED','INTERNAL'].includes(e?.code) || (e?.message || '').includes('RESOURCE_EXHAUSTED');
      if (!isRetryable || attempt === maxRetries) throw e;
      const delay = backoffMs * Math.pow(2, attempt-1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function safeFirestoreOperation(operationName, operation) {
  try {
    return await executeWithRetry(operation);
  } catch (err) {
    if (err?.code === 'PERMISSION_DENIED') throw new AuthError('Permission denied', { operationName });
    if (err?.code === 'NOT_FOUND') throw new NotFoundError('Document', operationName, { original: err.message });
    throw new AppError(`Firestore operation failed: ${err?.message || err}`, 500, ERROR_LEVELS.ERROR, { operationName, original: err });
  }
}

// Recovery helpers
const ErrorRecovery = {
  retryWithBackoff: async function(fn, maxAttempts = 3) { return executeWithRetry(fn, maxAttempts); },
  getWithFallback: async function(primaryFn, fallbackData = null) { try { return await primaryFn(); } catch (e) { return fallbackData; } },
  createCircuitBreaker: function(operation, threshold = 5, timeout = 60000) {
    let failureCount = 0; let lastFailureTime = null; let isOpen = false;
    return async function(...args) {
      if (isOpen && Date.now() - lastFailureTime > timeout) { isOpen = false; failureCount = 0; }
      if (isOpen) throw new AppError('Service temporarily unavailable', 503, ERROR_LEVELS.WARN);
      try { const r = await operation(...args); failureCount = 0; return r; } catch (e) { failureCount++; lastFailureTime = Date.now(); if (failureCount >= threshold) isOpen = true; throw e; }
    };
  },
};

module.exports = {
  AppError, ValidationError, AuthError, NotFoundError, ConflictError, RateLimitError,
  logError, createRequestLogger, errorHandlerMiddleware, asyncHandler,
  safeFirestoreOperation, executeWithRetry,
  ErrorRecovery,
  ERROR_LEVELS,
};
