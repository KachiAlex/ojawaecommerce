const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const { User, AdminAuditLog, SecurityAuditLog } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Authentication will fail.');
}

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

    let uid = null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      uid = decoded.uid;
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return next(new AppError('Token expired', 401));
      }
      return next(new AppError('Invalid token', 401));
    }

    if (!uid) {
      return next(new AppError('Invalid token', 401));
    }

    const user = await findUserById(uid);
    if (!user) {
      return next(new AppError('User not found', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Authentication failed', 401));
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

    // Audit admin API access to Postgres (fire-and-forget)
    AdminAuditLog.create({
      adminId: user.uid,
      adminEmail: user.email,
      action: 'api_access',
      reason: `${req.method} ${req.path}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { endpoint: req.path, method: req.method }
    }).catch(() => {});

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
 * Context stored in-memory (single-instance deployment); mismatches logged to security_audit_logs.
 */
const adminContexts = new Map();

const validateAdminContext = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = user.uid;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    const storedContext = adminContexts.get(userId);
    if (!storedContext) {
      adminContexts.set(userId, { ipAddress, userAgent, timestamp: Date.now() });
      return next();
    }

    const timeDiff = Date.now() - storedContext.timestamp;

    // Check for suspicious activity (context change within 1 hour)
    if (timeDiff < 3600000 && (storedContext.ipAddress !== ipAddress || storedContext.userAgent !== userAgent)) {
      SecurityAuditLog.create({
        userId,
        eventType: 'admin_context_mismatch',
        severity: 'medium',
        description: 'Admin context changed within 1 hour window',
        ipAddress,
        userAgent: userAgent?.substring(0, 200),
        metadata: {
          oldIpAddress: storedContext.ipAddress,
          oldUserAgent: storedContext.userAgent?.substring(0, 50)
        }
      }).catch(() => {});
    }

    // Update context if enough time has passed
    if (timeDiff > 3600000) {
      adminContexts.set(userId, { ipAddress, userAgent, timestamp: Date.now() });
    }

    next();
  } catch (error) {
    console.error('Admin context validation error:', error);
    next(); // Allow access but log error
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  generateToken,
  validateAdminContext
};
