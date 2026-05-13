const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { AppError } = require('./errorHandler');
const { User } = require('../models');

const hasFirebaseApp = admin.apps?.length > 0;
let firebaseAuth = null;
let firestore = null;

if (hasFirebaseApp) {
  try {
    firebaseAuth = admin.auth();
    firestore = admin.firestore();
    console.log('✅ Firebase services available for auth middleware');
  } catch (error) {
    console.warn('⚠️ Firebase services unavailable:', error.message);
  }
} else {
  console.warn('⚠️ Firebase Admin not initialized - auth middleware falling back to PostgreSQL');
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
};

const findUserById = async (uid) => {
  if (!uid) return null;

  const sqlUser = await User.findByPk(uid);
  if (sqlUser) {
    const data = sqlUser.toJSON();
    return { uid: data.id, ...sanitizeUser(data) };
  }

  if (firestore) {
    const doc = await firestore.collection('users').doc(uid).get();
    if (doc.exists) {
      return { uid: doc.id, ...doc.data() };
    }
  }

  return null;
};

/**
 * Authenticate JWT token middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return next(new AppError('Access token required', 401));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await findUserById(decoded.uid);
    if (!user) {
      return next(new AppError('User not found', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    return next(new AppError('Authentication failed', 401));
  }
};

/**
 * Verify Firebase ID token (alternative auth method)
 */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(new AppError('Access token required', 401));
    }

    // Verify Firebase ID token
    if (!firebaseAuth) {
      return next(new AppError('Firebase authentication not configured', 503));
    }

    const decodedToken = await firebaseAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const user = await findUserById(uid);
    if (!user) {
      return next(new AppError('User not found', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Invalid Firebase token', 401));
  }
};

/**
 * Require admin privileges middleware
 */
const requireAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return next(new AppError('Authentication required', 401));
    }

    const isAdmin = user.admin || user.isAdmin || 
                   (user.role && (user.role === 'admin' || user.role.includes('admin')));

    if (!isAdmin) {
      return next(new AppError('Admin privileges required', 403));
    }

    if (firestore) {
      await firestore.collection('admin_audit_logs').add({
        adminId: user.uid,
        adminEmail: user.email,
        action: 'api_access',
        endpoint: req.path,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    next();
  } catch (error) {
    return next(new AppError('Admin verification failed', 403));
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await findUserById(decoded.uid);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  const payload = {
    uid: user.uid,
    email: user.email,
    role: user.role || 'user'
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * Validate admin context (IP and user agent tracking)
 */
const validateAdminContext = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = user.uid;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // Get stored context from Firestore
    if (!firestore) {
      return next();
    }

    const contextDoc = await firestore.collection('admin_contexts').doc(userId).get();
    
    if (!contextDoc.exists) {
      // First login - store context
      await firestore.collection('admin_contexts').doc(userId).set({
        ipAddress,
        userAgent,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      return next();
    }

    const storedContext = contextDoc.data();
    const timeDiff = Date.now() - storedContext.timestamp.toMillis();

    // Check for suspicious activity (context change within 1 hour)
    if (timeDiff < 3600000) { // 1 hour
      if (storedContext.ipAddress !== ipAddress || storedContext.userAgent !== userAgent) {
        // Log suspicious activity
        await firestore.collection('security_audit_logs').add({
          userId,
          eventType: 'admin_context_mismatch',
          severity: 'medium',
          oldContext: {
            ipAddress: storedContext.ipAddress,
            userAgent: storedContext.userAgent?.substring(0, 50)
          },
          newContext: {
            ipAddress,
            userAgent: userAgent?.substring(0, 50)
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // Update context if enough time has passed
    if (timeDiff > 3600000) {
      await firestore.collection('admin_contexts').doc(userId).update({
        ipAddress,
        userAgent,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    next();
  } catch (error) {
    console.error('Admin context validation error:', error);
    next(); // Allow access but log error
  }
};

module.exports = {
  authenticateToken,
  verifyFirebaseToken,
  requireAdmin,
  optionalAuth,
  generateToken,
  validateAdminContext
};
