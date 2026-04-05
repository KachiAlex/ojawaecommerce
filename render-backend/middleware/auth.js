const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { AppError } = require('./errorHandler');

const auth = admin.auth();
const db = admin.firestore();

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from Firestore
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return next(new AppError('User not found', 401));
    }

    const user = { uid: userDoc.id, ...userDoc.data() };
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
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get user from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return next(new AppError('User not found', 401));
    }

    const user = { uid, ...userDoc.data() };
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

    // Log admin action
    await db.collection('admin_audit_logs').add({
      adminId: user.uid,
      adminEmail: user.email,
      action: 'api_access',
      endpoint: req.path,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      if (userDoc.exists) {
        req.user = { uid: userDoc.id, ...userDoc.data() };
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
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
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
    const contextDoc = await db.collection('admin_contexts').doc(userId).get();
    
    if (!contextDoc.exists) {
      // First login - store context
      await db.collection('admin_contexts').doc(userId).set({
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
        await db.collection('security_audit_logs').add({
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
      await db.collection('admin_contexts').doc(userId).update({
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
