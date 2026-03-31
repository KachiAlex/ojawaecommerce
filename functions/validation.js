// Firebase/Firestore/Functions usage audit: This file contains no Firebase Admin, Firestore, or firebase-functions dependencies. Safe for REST/Render backend.
/**
 * Input Validation & Security Middleware
 * Validates and sanitizes all incoming requests
 */

const {
  ValidationError,
  AppError,
  RateLimitError,
  ERROR_LEVELS,
} = require('./errorHandler');

// Input validation rules
const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email format',
  },
  phoneNumber: {
    pattern: /^[\d+\-\s()]{10,}$/,
    message: 'Invalid phone number',
  },
  url: {
    pattern: /^https?:\/\/.+/,
    message: 'Invalid URL format',
  },
  alphanumeric: {
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: 'Must contain only alphanumeric characters, underscores, and dashes',
  },
  uuid: {
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    message: 'Invalid UUID format',
  },
};

// Sanitize input - remove malicious content
function sanitizeInput(value, type = 'string') {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Remove HTML tags
    let sanitized = value.replace(/<[^>]*>/g, '');
    
    // Remove common XSS patterns
    sanitized = sanitized
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/eval\(/gi, '')
      .replace(/expression\(/gi, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Enforce max length (3000 chars by default)
    if (sanitized.length > 3000) {
      sanitized = sanitized.substring(0, 3000);
    }
    
    return sanitized;
  }

  if (type === 'number') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  if (type === 'boolean') {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  if (Array.isArray(value)) {
    return value.map(v => sanitizeInput(v, type));
  }

  if (typeof value === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeInput(val, type);
    }
    return sanitized;
  }

  return value;
}

// Validate input against rules and constraints
function validateInput(field, value, constraints = {}) {
  const { type = 'string', required = false, pattern, min, max, enum: enumVals } = constraints;

  // Check required
  if (required && (value === null || value === undefined || value === '')) {
    throw new ValidationError(`${field} is required`, { field });
  }

  if (value === null || value === undefined) {
    return true; // Valid if not required and not provided
  }

  // Type checking
  if (type === 'email') {
    if (!VALIDATION_RULES.email.pattern.test(value)) {
      throw new ValidationError(VALIDATION_RULES.email.message, { field, value });
    }
  }

  if (type === 'number') {
    if (typeof value !== 'number') {
      throw new ValidationError(`${field} must be a number`, { field });
    }
    if (min !== undefined && value < min) {
      throw new ValidationError(`${field} must be at least ${min}`, { field });
    }
    if (max !== undefined && value > max) {
      throw new ValidationError(`${field} must be at most ${max}`, { field });
    }
  }

  if (type === 'string') {
    if (typeof value !== 'string') {
      throw new ValidationError(`${field} must be a string`, { field });
    }
    if (min !== undefined && value.length < min) {
      throw new ValidationError(`${field} must be at least ${min} characters`, { field });
    }
    if (max !== undefined && value.length > max) {
      throw new ValidationError(`${field} must be at most ${max} characters`, { field });
    }
  }

  // Pattern validation
  if (pattern && !pattern.test(value)) {
    throw new ValidationError(`${field} format is invalid`, { field, value });
  }

  // Enum validation
  if (enumVals && !enumVals.includes(value)) {
    throw new ValidationError(`${field} must be one of: ${enumVals.join(', ')}`, { field });
  }

  return true;
}

// Request validation middleware
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const errors = {};

      // Validate body
      if (schema.body) {
        for (const [field, constraints] of Object.entries(schema.body)) {
          try {
            validateInput(field, req.body?.[field], constraints);
          } catch (error) {
            errors[field] = error.message;
          }
        }
      }

      // Validate query
      if (schema.query) {
        for (const [field, constraints] of Object.entries(schema.query)) {
          try {
            validateInput(field, req.query?.[field], constraints);
          } catch (error) {
            errors[field] = error.message;
          }
        }
      }

      // Validate params
      if (schema.params) {
        for (const [field, constraints] of Object.entries(schema.params)) {
          try {
            validateInput(field, req.params?.[field], constraints);
          } catch (error) {
            errors[field] = error.message;
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError('Request validation failed', { errors });
      }

      // Sanitize request data
      if (req.body) {
        req.body = sanitizeInput(req.body);
      }
      if (req.query) {
        req.query = sanitizeInput(req.query);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Simple rate limiting with in-memory store
class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.keyGenerator = options.keyGenerator || ((req) => req.ip);
    this.store = new Map();
  }

  middleware() {
    return (req, res, next) => {
      const key = this.keyGenerator(req);
      const now = Date.now();
      const windowStart = now - this.windowMs;

      // Get or create record
      if (!this.store.has(key)) {
        this.store.set(key, []);
      }

      let timestamps = this.store.get(key);
      
      // Remove old timestamps outside window
      timestamps = timestamps.filter(t => t > windowStart);
      
      // Check limit
      if (timestamps.length >= this.maxRequests) {
        throw new RateLimitError({
          limit: this.maxRequests,
          window: `${this.windowMs / 1000}s`,
          retryAfter: Math.ceil((Math.min(...timestamps) + this.windowMs - now) / 1000),
        });
      }

      // Add current request
      timestamps.push(now);
      this.store.set(key, timestamps);

      // Set rate limit headers
      res.set('X-RateLimit-Limit', this.maxRequests);
      res.set('X-RateLimit-Remaining', this.maxRequests - timestamps.length);
      res.set('X-RateLimit-Reset', new Date(Math.min(...timestamps) + this.windowMs).toISOString());

      next();
    };
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, timestamps] of this.store.entries()) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, filtered);
      }
    }
  }
}

// Security headers middleware
function securityHeaders(req, res, next) {
  // Prevent XSS
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src * data:; font-src 'self' data:");
  
  // Referrer policy
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HTTPS only
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Disable caching for sensitive data
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  next();
}

// Input sanitization middleware
function sanitizeRequestData(req, res, next) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  next();
}

module.exports = {
  // Validation
  validateInput,
  validateRequest,
  VALIDATION_RULES,
  
  // Sanitization
  sanitizeInput,
  sanitizeRequestData,
  
  // Rate limiting
  RateLimiter,
  
  // Security
  securityHeaders,
};
