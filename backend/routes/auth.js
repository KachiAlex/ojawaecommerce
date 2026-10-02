const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { User, Wallet, Vendor } = require('../models');
const { sendEmail, sendOTPEmail } = require('../utils/sendchampService');
const router = express.Router();

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...safeUser } = user;

  // Expose logistics profile from nested profile JSONB for frontend compatibility
  if (safeUser.profile?.logisticsProfile) {
    safeUser.logisticsProfile = safeUser.profile.logisticsProfile;
    safeUser.isLogisticsPartner = true;
  }
  if (safeUser.role === 'logistics') {
    safeUser.isLogisticsPartner = true;
  }

  return safeUser;
};

// --- Server-side OTP store (suitable for single-instance backend) ---
const otpStore = new Map();
const verifiedOtps = new Map(); // email:purpose -> verifiedAt timestamp
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_VERIFIED_TTL_MS = 15 * 60 * 1000; // login must follow within 15 min
const MAX_OTP_ATTEMPTS = 5;

const otpSendRateLimits = new Map();
const otpVerifyRateLimits = new Map();

function checkOtpRateLimit(map, key, max, windowMs) {
  const now = Date.now();
  const record = map.get(key);
  if (!record || now - record.firstAttempt > windowMs) {
    map.set(key, { count: 1, firstAttempt: now });
    return true;
  }
  if (record.count >= max) {
    return false;
  }
  record.count++;
  return true;
}

function storeOTP(email, otp, purpose = 'verification') {
  const key = `${email.toLowerCase()}:${purpose}`;
  otpStore.set(key, {
    otp,
    createdAt: Date.now(),
    attempts: 0
  });
  setTimeout(() => otpStore.delete(key), OTP_EXPIRY_MS + 5000);
}

function verifyStoredOTP(email, otp, purpose = 'verification') {
  const key = `${email.toLowerCase()}:${purpose}`;
  const record = otpStore.get(key);

  if (!record) return { valid: false, reason: 'OTP not found or expired' };

  if (Date.now() - record.createdAt > OTP_EXPIRY_MS) {
    otpStore.delete(key);
    return { valid: false, reason: 'OTP expired' };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(key);
    return { valid: false, reason: 'Too many failed attempts' };
  }

  record.attempts++;

  if (record.otp !== otp) {
    return { valid: false, reason: 'Invalid OTP' };
  }

  otpStore.delete(key);
  verifiedOtps.set(key, Date.now());
  setTimeout(() => verifiedOtps.delete(key), OTP_VERIFIED_TTL_MS + 5000);
  return { valid: true };
}

function consumeVerifiedOTP(email, purpose = 'verification') {
  const key = `${email.toLowerCase()}:${purpose}`;
  const verifiedAt = verifiedOtps.get(key);
  if (!verifiedAt) return false;
  if (Date.now() - verifiedAt > OTP_VERIFIED_TTL_MS) {
    verifiedOtps.delete(key);
    return false;
  }
  verifiedOtps.delete(key);
  return true;
}

const ensureUserWallet = async (userId, role = 'buyer') => {
  try {
    const walletExists = await Wallet.findOne({ where: { userId } });
    if (!walletExists) {
      await Wallet.create({ userId, balance: 0, currency: 'NGN' });
    }
  } catch (walletError) {
    console.warn('Wallet creation skipped:', walletError.message);
  }
};

const ensureUserRecord = async ({ uid, email, displayName, role = 'buyer', isEmailVerified = false }) => {
  let user = await User.findByPk(uid);
  if (user) {
    // Sync displayName from Firebase if user has no name in DB
    if (displayName && !user.firstName && !user.profile?.displayName) {
      const nameParts = displayName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      await user.update({
        firstName: user.firstName || firstName,
        lastName: user.lastName || lastName,
        profile: {
          ...(user.profile || {}),
          displayName,
          firstName,
          lastName
        },
        updatedAt: new Date()
      });
    }
    return user;
  }

  const fallbackPassword = crypto.randomBytes(32).toString('hex');
  const hashedPassword = await bcrypt.hash(fallbackPassword, 12);

  const name = displayName || email.split('@')[0];
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  user = await User.create({
    id: uid,
    email,
    firstName,
    lastName,
    role,
    password: hashedPassword,
    isEmailVerified,
    isActive: true,
    profile: {
      displayName: name,
      firstName,
      lastName
    }
  });

  await ensureUserWallet(uid, role);

  return user;
};

// --- Google OAuth Strategy ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:8080';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://ojawa.africa';

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `${BACKEND_BASE_URL}/api/auth/google/callback`,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email from Google profile'), null);

      const displayName = profile.displayName || profile.name?.givenName || email.split('@')[0];
      const googleId = profile.id;
      const avatar = profile.photos?.[0]?.value || null;

      let user = await User.findOne({ where: { email: email.toLowerCase() } });

      if (user) {
        await user.update({
          lastLoginAt: new Date(),
          profile: {
            ...(user.profile || {}),
            displayName,
            avatar: avatar || user.profile?.avatar,
            googleId,
          },
          updatedAt: new Date(),
        });
      } else {
        const fallbackPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(fallbackPassword, 12);
        const nameParts = displayName.trim().split(/\s+/);

        user = await User.create({
          id: crypto.randomUUID(),
          email: email.toLowerCase(),
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          role: 'buyer',
          password: hashedPassword,
          isEmailVerified: true,
          isActive: true,
          profile: {
            displayName,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            avatar,
            googleId,
          },
        });

        await ensureUserWallet(user.id, 'buyer');
      }

      const userData = user.toJSON();
      const token = generateToken({ uid: user.id, email: userData.email, role: userData.role });
      return done(null, { user: userData, token });
    } catch (err) {
      return done(err, null);
    }
  }));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
} else {
  console.warn('⚠️ Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
}

/**
 * @route   GET /auth/google
 * @desc    Redirect to Google OAuth consent screen
 * @access  Public
 */
router.get('/google', (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${FRONTEND_URL}/login?error=google_oauth_not_configured`);
  }

  const userType = req.query.userType || 'buyer';
  req.session = req.session || {};
  req.session.googleUserType = userType;

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: userType,
  })(req, res, next);
});

/**
 * @route   GET /auth/google/callback
 * @desc    Handle Google OAuth callback — create/find user, redirect to frontend with token
 * @access  Public
 */
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, data, info) => {
    if (err) {
      console.error('Google OAuth error:', err);
      return res.redirect(`${FRONTEND_URL}/login?error=google_oauth_failed&message=${encodeURIComponent(err.message || 'Unknown error')}`);
    }
    if (!data) {
      return res.redirect(`${FRONTEND_URL}/login?error=google_oauth_cancelled`);
    }

    const { user, token } = data;
    const userType = req.query.state || 'buyer';
    const userDisplayName = [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.profile?.displayName || user.email.split('@')[0];

    const params = new URLSearchParams({
      token,
      uid: user.id,
      email: user.email,
      displayName: userDisplayName,
      role: user.role,
      userType,
    });

    res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
  })(req, res, next);
});

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', [
  body('email').isEmail().customSanitizer(email => email.trim().toLowerCase()),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('displayName').trim().isLength({ min: 2 }).withMessage('Display name must be at least 2 characters'),
  body('userType').optional().isIn(['buyer', 'vendor', 'admin', 'logistics']),
  body('role').optional().isIn(['user', 'buyer', 'vendor', 'admin', 'logistics']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { email, password, displayName, phone, address, role = 'user' } = req.body;
  const userType = req.body.userType || role;
  const normalizedRole =
    userType === 'logistics' || role === 'logistics' ? 'logistics' :
    userType === 'vendor' || role === 'vendor' ? 'vendor' :
    userType === 'admin' || role === 'admin' ? 'admin' : 'buyer';

  // Check if user already exists in PostgreSQL first (works with or without Firebase)
  const existingDbUser = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existingDbUser && existingDbUser.password && await bcrypt.compare(password, existingDbUser.password)) {
    const userData = existingDbUser.toJSON();
    if (normalizedRole !== 'admin' && normalizedRole !== userData.role) {
      await existingDbUser.update({ role: normalizedRole, updatedAt: new Date() });
      userData.role = normalizedRole;
    }
    await existingDbUser.update({ lastLoginAt: new Date(), updatedAt: new Date() });
    await ensureUserWallet(existingDbUser.id, userData.role);
    const token = generateToken({ uid: existingDbUser.id, email, role: userData.role });
    const userDisplayName = [userData.firstName, userData.lastName].filter(Boolean).join(' ') ||
      userData.profile?.displayName || [userData.profile?.firstName, userData.profile?.lastName].filter(Boolean).join(' ') ||
      displayName || email.split('@')[0];
    return res.status(200).json({
      success: true,
      message: 'Signed in and updated role successfully',
      data: {
        uid: existingDbUser.id,
        email,
        displayName: userDisplayName,
        role: userData.role,
        token,
        user: sanitizeUser(userData)
      }
    });
  }

  if (existingDbUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  // PostgreSQL-only auth — generate a UUID for the new user
  const userId = crypto.randomUUID();
  const isEmailVerified = false;

  // Hash password for PostgreSQL storage
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user in PostgreSQL
  const name = displayName || email.split('@')[0];
  const nameParts = name.trim().split(/\s+/);
  const userData = {
    id: userId,
    email,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    role: normalizedRole,
    password: hashedPassword,
    isEmailVerified,
    isActive: true,
    profile: {
      displayName: name,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      avatar: null,
      phone: phone || null,
      address: address || null
    }
  };

  try {
    await User.create(userData);
    await ensureUserWallet(userId, userData.role);
  } catch (dbError) {
    throw new AppError(dbError.message || 'Failed to save user', 500);
  }

  // Generate JWT token
  const token = generateToken({ uid: userId, email, role: userData.role });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      uid: userId,
      email,
      displayName: name,
      role: userData.role,
      token,
      user: sanitizeUser(userData)
    }
  });
}));

const loginValidators = [
  body('email').isEmail().customSanitizer(email => email.trim().toLowerCase()),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const authenticateDatabaseUser = async (email, password, res) => {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return false;
  }

  const userData = user.toJSON();
  await user.update({ lastLoginAt: new Date(), updatedAt: new Date() });
  await ensureUserWallet(user.id, userData.role);
  const customToken = generateToken({
    uid: user.id,
    email: userData.email,
    role: userData.role
  });

  // Build display name from available fields
  const userDisplayName = userData.displayName || [userData.firstName, userData.lastName].filter(Boolean).join(' ') ||
    userData.profile?.displayName || [userData.profile?.firstName, userData.profile?.lastName].filter(Boolean).join(' ') ||
    userData.email?.split('@')[0] || '';

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      uid: user.id,
      email: userData.email,
      displayName: userDisplayName,
      role: userData.role,
      token: customToken,
      user: sanitizeUser(userData)
    }
  });
  return true;
};

const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (await authenticateDatabaseUser(email, password, res)) return;
  throw new AppError('Invalid email or password', 401);
});

/**
 * @route   POST /auth/login
 * @desc    Login user with Firebase Auth REST API
 * @access  Public
 */
router.post('/login', loginValidators, loginHandler);
router.post('/signin', loginValidators, loginHandler);

/**
 * @route   POST /auth/change-password
 * @desc    Change user password (requires current password)
 * @access  Private
 */
router.post('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { currentPassword, newPassword } = req.body;

  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  // Verify current password against the stored bcrypt hash
  if (!user.password || !(await bcrypt.compare(currentPassword, user.password))) {
    throw new AppError('Current password is incorrect', 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await user.update({ password: hashedPassword, updatedAt: new Date() });

  res.json({ success: true, message: 'Password updated successfully' });
}));

/**
 * @route   POST /auth/change-email
 * @desc    Change user email (requires current password)
 * @access  Private
 */
router.post('/change-email', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newEmail').isEmail().customSanitizer(email => email.trim().toLowerCase()).withMessage('Valid new email is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { currentPassword, newEmail } = req.body;

  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  // Verify current password against the stored bcrypt hash
  if (!user.password || !(await bcrypt.compare(currentPassword, user.password))) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Ensure new email is not already taken
  const existing = await User.findOne({ where: { email: newEmail } });
  if (existing && existing.id !== user.id) {
    throw new AppError('Email is already in use', 409);
  }

  await user.update({ email: newEmail, isEmailVerified: false, updatedAt: new Date() });

  res.json({ success: true, message: 'Email updated successfully' });
}));

/**
 * @route   POST /auth/refresh
 * @desc    Refresh JWT token
 * @access  Public
 */
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  // refreshToken is one of our JWTs — verify and re-issue
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.uid);
    if (!user) throw new AppError('User not found', 404);
    const userData = user.toJSON();
    return res.json({
      success: true,
      data: {
        token: generateToken({ uid: user.id, email: userData.email, role: userData.role }),
        refreshToken: generateToken({ uid: user.id, email: userData.email, role: userData.role }),
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('Invalid refresh token', 401);
  }
}));

/**
 * @route   GET /auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.uid, {
    include: [{ model: Vendor, as: 'vendor' }]
  });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userData = user.toJSON();
  
  // Remove sensitive information
  const { password, vendor, ...safeUserData } = userData;
  
  // Flatten vendor data into vendorProfile for frontend compatibility
  if (vendor) {
    safeUserData.vendorProfile = {
      businessAddress: vendor.businessAddress,
      businessPhone: vendor.businessPhone,
      businessEmail: vendor.businessEmail,
      storeName: vendor.storeName,
      storeDescription: vendor.storeDescription,
      rating: vendor.rating,
      isApproved: vendor.isApproved,
      status: vendor.status
    };
    if (vendor.storeName) safeUserData.storeName = vendor.storeName;
    if (vendor.businessPhone) safeUserData.businessPhone = vendor.businessPhone;
    
    // Flatten businessAddress to a string if it's an object
    if (vendor.businessAddress && typeof vendor.businessAddress === 'object') {
      const addr = vendor.businessAddress;
      safeUserData.address = [addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ');
    } else if (typeof vendor.businessAddress === 'string') {
      safeUserData.address = vendor.businessAddress;
    }
  }

  res.json({
    success: true,
    data: safeUserData
  });
}));

/**
 * @route   POST /auth/fix-email
 * @desc    Fix user email in database to match Firebase Auth (one-time fix for normalizeEmail issue)
 * @access  Private
 */
router.post('/fix-email', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const correctEmail = (req.user.email || '').trim().toLowerCase();
  if (!correctEmail) throw new AppError('Could not determine correct email', 400);

  if (user.email === correctEmail) {
    return res.json({ success: true, message: 'Email is already correct', data: { email: user.email } });
  }

  await user.update({ email: correctEmail, updatedAt: new Date() });

  res.json({
    success: true,
    message: 'Email fixed successfully',
    data: { oldEmail: user.email, newEmail: correctEmail }
  });
}));

/**
 * @route   GET /auth/me
 * @desc    Get current user info (alias for /profile)
 * @access  Private
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.uid, {
    include: [{ model: Vendor, as: 'vendor' }]
  });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userData = user.toJSON();
  const { password, vendor, ...safeUserData } = userData;
  
  if (vendor) {
    safeUserData.vendorProfile = {
      businessAddress: vendor.businessAddress,
      businessPhone: vendor.businessPhone,
      businessEmail: vendor.businessEmail,
      storeName: vendor.storeName,
      storeDescription: vendor.storeDescription,
      rating: vendor.rating,
      isApproved: vendor.isApproved,
      status: vendor.status
    };
    if (vendor.storeName) safeUserData.storeName = vendor.storeName;
    if (vendor.businessPhone) safeUserData.businessPhone = vendor.businessPhone;
    if (vendor.businessAddress && typeof vendor.businessAddress === 'object') {
      const addr = vendor.businessAddress;
      safeUserData.address = [addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ');
    } else if (typeof vendor.businessAddress === 'string') {
      safeUserData.address = vendor.businessAddress;
    }
  }

  res.json({
    success: true,
    data: safeUserData
  });
}));

/**
 * @route   PUT /auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, [
  body('displayName').optional().trim().isLength({ min: 2 }),
  body('phone').optional().isMobilePhone(),
  body('address').optional().isObject(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { displayName, phone, address } = req.body;
  const userId = req.user.uid;

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const updates = {};

  if (displayName) updates.displayName = displayName;
  if (phone) {
    updates.profile = { ...user.profile, phone };
  }
  if (address) {
    updates.profile = { ...(updates.profile || user.profile), address };
  }
  updates.updatedAt = new Date();

  await user.update(updates);

  // Get updated user data
  const userData = user.toJSON();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: userData
  });
}));

const logoutHandler = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.uid);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  await user.update({
    lastLogoutAt: new Date(),
    updatedAt: new Date()
  });

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

router.post('/logout', authenticateToken, logoutHandler);
router.post('/signout', authenticateToken, logoutHandler);

/**
 * @route   POST /auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
const passwordResetHandler = asyncHandler(async (req, res) => {
  const email = (req.body.email || '').toLowerCase();

  const user = await User.findOne({ where: { email } });
  // Always return success — do not leak whether the account exists
  if (user) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    storeOTP(email, otp, 'password-reset');
    const result = await sendOTPEmail(email, otp, 'password-reset');
    if (!result.success) {
      console.warn('⚠️ Password reset email failed:', result.message);
    }
  }

  res.json({
    success: true,
    message: 'If an account exists for this email, a reset code has been sent'
  });
});

router.post('/forgot-password', [
  body('email').isEmail().customSanitizer(email => email.trim().toLowerCase()),
  handleValidationErrors
], passwordResetHandler);

router.post('/password-reset', [
  body('email').isEmail().customSanitizer(email => email.trim().toLowerCase()),
  handleValidationErrors
], passwordResetHandler);

/**
 * @route   POST /auth/reset-password
 * @desc    Consume password-reset OTP and set a new password
 * @access  Public
 */
router.post('/reset-password', [
  body('email').isEmail().customSanitizer(email => email.trim().toLowerCase()),
  body('otp').notEmpty().withMessage('Reset code is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const email = (req.body.email || '').toLowerCase();
  const { otp, newPassword } = req.body;

  const result = verifyStoredOTP(email, otp, 'password-reset');
  if (!result.valid) {
    throw new AppError(result.reason || 'Invalid or expired reset code', 400);
  }

  const user = await User.findOne({ where: { email } });
  if (!user) throw new AppError('User not found', 404);

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await user.update({ password: hashedPassword, updatedAt: new Date() });

  res.json({ success: true, message: 'Password reset successfully' });
}));

/**
 * @route   POST /auth/otp-login
 * @desc    Login after successful OTP verification (passwordless)
 * @access  Public
 */
router.post('/otp-login', [
  body('email').isEmail().customSanitizer(email => email.trim().toLowerCase()),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const email = (req.body.email || '').toLowerCase();

  // Require a recent server-side OTP verification for this email
  const verified =
    consumeVerifiedOTP(email, 'verification') ||
    consumeVerifiedOTP(email, 'login') ||
    consumeVerifiedOTP(email, 'otp-login');
  if (!verified) {
    throw new AppError('OTP verification required before login', 401);
  }

  let user = await User.findOne({ where: { email } });

  if (!user) {
    // Passwordless signup — create the account (email already verified via OTP)
    const fallbackPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(fallbackPassword, 12);
    user = await User.create({
      id: crypto.randomUUID(),
      email,
      role: 'buyer',
      password: hashedPassword,
      isEmailVerified: true,
      isActive: true,
      profile: { displayName: email.split('@')[0] }
    });
  }

  if (user.isActive === false) throw new AppError('Account is deactivated', 403);

  const userData = user.toJSON();
  await user.update({ lastLoginAt: new Date(), isEmailVerified: true, updatedAt: new Date() });
  await ensureUserWallet(user.id, userData.role);

  const token = generateToken({ uid: user.id, email: userData.email, role: userData.role });

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: sanitizeUser(userData),
    profile: sanitizeUser(userData),
    data: {
      uid: user.id,
      email: userData.email,
      role: userData.role,
      token,
      user: sanitizeUser(userData)
    }
  });
}));

/**
 * @route   POST /auth/verify-email
 * @desc    Send email verification
 * @access  Private
 */
router.post('/verify-email', authenticateToken, asyncHandler(async (req, res) => {
  const email = req.user.email;

  // Send a verification OTP via email
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  storeOTP(email, otp, 'email-verification');
  const result = await sendOTPEmail(email, otp, 'email-verification');

  res.json({
    success: true,
    message: result.success ? 'Verification email sent' : 'Verification email queued',
    warning: result.success ? undefined : result.message
  });
}));

/**
 * @route   POST /sendEmailOTP
 * @desc    Send OTP via email (for custom OTP flow)
 * @access  Public
 */
router.post('/sendEmailOTP', [
  body('email').isEmail().customSanitizer(email => email.trim().toLowerCase()),
  body('subject').optional(),
  body('htmlContent').optional(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { email, to, subject, htmlContent, textContent, purpose, otp } = req.body;

  const recipientEmail = (to || email || '').toLowerCase();
  if (!recipientEmail) {
    return res.status(400).json({ success: false, error: 'Email recipient is required' });
  }
  const otpPurpose = purpose || 'verification';

  // Per-email rate limit (5 sends per 15 minutes)
  if (!checkOtpRateLimit(otpSendRateLimits, recipientEmail, 5, 15 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many OTP requests for this email. Please try again later.' });
  }

  console.log('📧 OTP Email Request:', {
    to: recipientEmail,
    subject: subject || 'OTP Verification',
    purpose: otpPurpose,
    timestamp: new Date().toISOString()
  });

  // Always store OTP server-side for later verification
  const otpToSend = otp || Math.floor(100000 + Math.random() * 900000).toString();
  storeOTP(recipientEmail, otpToSend, otpPurpose);

  const sendchampResult = await sendOTPEmail(recipientEmail, otpToSend, otpPurpose);

  if (sendchampResult.success) {
    res.json({
      success: true,
      message: 'OTP email sent successfully',
      requestId: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'sendchamp'
    });
  } else {
    console.warn('⚠️ Sendchamp email failed:', sendchampResult.message);
    res.json({
      success: true,
      message: 'OTP email queued (Sendchamp unavailable)',
      requestId: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'fallback',
      warning: sendchampResult.message
    });
  }
}));

/**
 * @route   POST /verifyEmailOTP
 * @desc    Verify OTP (server-side validation)
 * @access  Public
 */
router.post('/verifyEmailOTP', [
  body('email').isEmail().customSanitizer(email => email.trim().toLowerCase()),
  body('otp').notEmpty().withMessage('OTP is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { email, otp, purpose, timestamp } = req.body;

  const normalizedEmail = (email || '').toLowerCase();
  if (!normalizedEmail) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  // Per-email verification rate limit (10 attempts per 15 minutes)
  if (!checkOtpRateLimit(otpVerifyRateLimits, normalizedEmail, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many OTP verification attempts. Please try again later.' });
  }

  console.log('🔐 OTP Verification Request:', {
    email: normalizedEmail,
    purpose,
    timestamp,
    verifiedAt: new Date().toISOString()
  });

  const result = verifyStoredOTP(normalizedEmail, otp, purpose || 'verification');

  if (!result.valid) {
    return res.status(400).json({
      success: false,
      verified: false,
      message: result.reason
    });
  }

  res.json({
    success: true,
    verified: true,
    message: 'OTP verified successfully'
  });
}));

module.exports = router;
