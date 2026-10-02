/**
 * Production-safe logger utility
 * Only logs in development mode, protects sensitive data in production
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

class Logger {
  constructor() {
    this.isDevelopment = isDevelopment;
    this.isProduction = isProduction;
    this.logLevel = isDevelopment ? 'debug' : 'error';
  }

  /**
   * Sanitize sensitive data before logging
   */
  sanitize(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveKeys = [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      'credit_card',
      'cvv',
      'pin',
      'ssn',
      'apikey',
      'api_key'
    ];

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Development-only logging
   */
  debug(...args) {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  /**
   * Info level logging (development only)
   */
  info(...args) {
    if (this.isDevelopment) {
      console.info(...args);
    }
  }

  /**
   * Warning logging (shown in both dev and prod)
   */
  warn(...args) {
    if (this.isDevelopment) {
      console.warn(...args);
    }
  }

  /**
   * Error logging (always shown, sanitized in production)
   */
  error(...args) {
    if (this.isDevelopment) {
      console.error(...args);
    } else {
      // In production, only log error messages, not full objects
      const messages = args.filter(arg => typeof arg === 'string');
      if (messages.length > 0) {
        console.error('Error:', messages.join(' '));
      }
    }
  }

  /**
   * Secure log - sanitizes data before logging
   */
  secure(message, data) {
    if (this.isDevelopment) {
      console.log(message, this.sanitize(data));
    }
  }

  /**
   * Log only in development, completely silent in production
   */
  dev(...args) {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  /**
   * Group logging (development only)
   */
  group(label) {
    if (this.isDevelopment && console.group) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  }

  /**
   * Table logging (development only)
   */
  table(data) {
    if (this.isDevelopment && console.table) {
      console.table(data);
    }
  }

  /**
   * Performance timing (development only)
   */
  time(label) {
    if (this.isDevelopment && console.time) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (this.isDevelopment && console.timeEnd) {
      console.timeEnd(label);
    }
  }
}

// Export singleton instance
const logger = new Logger();

export default logger;

// Also export convenience methods
export const { debug, info, warn, error, secure, dev, group, groupEnd, table, time, timeEnd } = logger;

