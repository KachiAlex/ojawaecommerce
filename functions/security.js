/**
 * Security Hardening Module
 * Implements comprehensive security best practices and hardening measures
 */

const crypto = require('crypto');
// Firebase removed: security now uses REST backend
const db = admin.firestore();

// ============ SECRET MANAGEMENT ============

class SecretManager {
  constructor() {
    this.secrets = new Map();
    this.rotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days
    // Firebase removed: security now uses REST backend
    // TODO: Replace db operations with REST API/backend DB calls
    // const db = ...

  /**
   * Store a secret with metadata
   */
  storeSecret(name, value, metadata = {}) {
    const secret = {
      name,
      value,
      hash: this.hashSecret(value),
      created: new Date(),
      version: this.secretVersion,
      metadata,
      rotationDue: new Date(Date.now() + this.rotationInterval),
    };

    this.secrets.set(name, secret);
    this.logSecurityEvent('SECRET_STORED', { name, version: this.secretVersion });

    return secret;
  }

  /**
   * Retrieve and verify a secret
   */
  getSecret(name) {
    const secret = this.secrets.get(name);

    if (!secret) {
      this.logSecurityEvent('SECRET_NOT_FOUND', { name });
      return null;
    }

    if (new Date() > secret.rotationDue) {
      this.logSecurityEvent('SECRET_ROTATION_DUE', { name });
    }

    return secret.value;
  }

  /**
   * Check if secret rotation is due
   */
  isRotationDue(name) {
    const secret = this.secrets.get(name);
    return secret && new Date() > secret.rotationDue;
  }

  /**
   * Rotate a secret
   */
  rotateSecret(name, newValue) {
    const oldSecret = this.secrets.get(name);

    if (!oldSecret) {
      throw new Error(`Secret ${name} not found`);
    }

    this.secretVersion++;
    const rotated = this.storeSecret(name, newValue, oldSecret.metadata);

    this.logSecurityEvent('SECRET_ROTATED', {
      name,
      oldVersion: oldSecret.version,
      newVersion: rotated.version,
    });

    return rotated;
  }

  /**
   * Hash secret for comparison (not for storage)
   */
  hashSecret(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Get rotation status for all secrets
   */
  getRotationStatus() {
    const status = {};

    for (const [name, secret] of this.secrets.entries()) {
      status[name] = {
        version: secret.version,
        created: secret.created,
        rotationDue: secret.rotationDue,
        daysUntilRotation: Math.ceil(
          (secret.rotationDue - new Date()) / (24 * 60 * 60 * 1000)
        ),
        isOverdue: new Date() > secret.rotationDue,
      };
    }

    return status;
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event, details = {}) {
    try {
      await db.collection('security_audit_logs').add({
        event,
        details,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        severity: event.includes('DUE') || event.includes('ROTATED') ? 'warn' : 'info',
      });
    } catch (error) {
      console.error('Failed to log security event:', error.message);
    }
  }
}

// ============ DATA ENCRYPTION ============

class DataEncryption {
  /**
   * Encrypt sensitive data
   */
  static encrypt(data, encryptionKey = process.env.DATA_ENCRYPTION_KEY) {
    if (!encryptionKey) {
      console.warn('DATA_ENCRYPTION_KEY not configured - encryption disabled');
      return data;
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey, 'hex'),
        iv
      );

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
        algorithm: 'aes-256-cbc',
      };
    } catch (error) {
      console.error('Encryption failed:', error.message);
      return data;
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData, encryptionKey = process.env.DATA_ENCRYPTION_KEY) {
    if (!encryptedData.encrypted || !encryptionKey) {
      return encryptedData;
    }

    try {
      const decipher = crypto.createDecipheriv(
        encryptedData.algorithm,
        Buffer.from(encryptionKey, 'hex'),
        Buffer.from(encryptedData.iv, 'hex')
      );

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error.message);
      return null;
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  static hash(data, algorithm = 'sha256') {
    return crypto
      .createHash(algorithm)
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Generate secure random token
   */
  static generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

// ============ AUTHENTICATION HARDENING ============

class AuthHardening {
  /**
   * Verify and validate authentication token with enhanced checks
   */
  static async verifyTokenWithContext(token, expectedContext = {}) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Verify token has not been tampered with
      if (expectedContext.uid && decodedToken.uid !== expectedContext.uid) {
        throw new Error('Token UID mismatch');
      }

      // Check token age
      const tokenAge = (Date.now() - decodedToken.iat * 1000) / 1000 / 60; // minutes
      const maxAge = expectedContext.maxAge || 60; // default 60 minutes

      if (tokenAge > maxAge) {
        throw new Error('Token age exceeded');
      }

      return decodedToken;
    } catch (error) {
      console.error('Token verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Implement account lockout after failed attempts
   */
  static async checkAccountLockout(userId) {
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return false;
      }

      const user = userDoc.data();
      const now = Date.now();
      const lockoutDuration = 15 * 60 * 1000; // 15 minutes

      // Check if account is locked
      if (user.accountLocked && user.lockoutUntil) {
        if (now < user.lockoutUntil) {
          return true; // Account is locked
        } else {
          // Unlock account
          await userRef.update({
            accountLocked: false,
            lockoutUntil: null,
            failedAttempts: 0,
          });
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking account lockout:', error.message);
      return false;
    }
  }

  /**
   * Record failed login attempt
   */
  static async recordFailedAttempt(userId, maxAttempts = 5) {
    try {
      const userRef = db.collection('users').doc(userId);

      await userRef.update({
        failedAttempts: admin.firestore.FieldValue.increment(1),
        lastFailedAttempt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Check if we should lock account
      const userDoc = await userRef.get();
      const failedAttempts = userDoc.data().failedAttempts || 0;

      if (failedAttempts >= maxAttempts) {
        const lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
        await userRef.update({
          accountLocked: true,
          lockoutUntil,
        });

        // Log security event
        await db.collection('security_audit_logs').add({
          event: 'ACCOUNT_LOCKED',
          userId,
          reason: 'Max failed login attempts exceeded',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          severity: 'warn',
        });
      }
    } catch (error) {
      console.error('Error recording failed attempt:', error.message);
    }
  }

  /**
   * Clear failed attempts on successful login
   */
  static async clearFailedAttempts(userId) {
    try {
      await db.collection('users').doc(userId).update({
        failedAttempts: 0,
        lastSuccessfulLogin: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error clearing failed attempts:', error.message);
    }
  }
}

// ============ REQUEST VALIDATION & CSRF PROTECTION ============

class CSRFProtection {
  static tokens = new Map();

  /**
   * Generate CSRF token
   */
  static generateToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(sessionId, {
      token,
      created: Date.now(),
    });
    return token;
  }

  /**
   * Verify CSRF token
   */
  static verifyToken(sessionId, token) {
    const stored = this.tokens.get(sessionId);

    if (!stored || stored.token !== token) {
      return false;
    }

    // Tokens expire after 1 hour
    if (Date.now() - stored.created > 60 * 60 * 1000) {
      this.tokens.delete(sessionId);
      return false;
    }

    // Token is single-use
    this.tokens.delete(sessionId);
    return true;
  }

  /**
   * Express middleware for CSRF protection
   */
  static middleware() {
    return (req, res, next) => {
      // Skip for GET requests
      if (req.method === 'GET') {
        return next();
      }

      const csrfToken = req.headers['x-csrf-token'];
      const sessionId = req.sessionID || req.user?.uid;

      if (!csrfToken || !this.verifyToken(sessionId, csrfToken)) {
        return res.status(403).json({
          error: 'CSRF token validation failed',
        });
      }

      next();
    };
  }
}

// ============ SECURITY AUDIT LOGGING ============

async function logSecurityEvent(event, details = {}) {
  try {
    await db.collection('security_audit_logs').add({
      event,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      severity: details.severity || 'info',
    });
  } catch (error) {
    console.error('Failed to log security event:', error.message);
  }
}

// ============ EXPORTS ============

module.exports = {
  SecretManager,
  DataEncryption,
  AuthHardening,
  CSRFProtection,
  logSecurityEvent,
};
