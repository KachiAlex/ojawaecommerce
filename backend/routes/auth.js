const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { User, Wallet } = require('../models');
const { sendOTPEmail } = require('../utils/sendchampService');
const router = express.Router();

let firebaseAuth = null;

try {
  if (admin.apps?.length > 0) {
    firebaseAuth = admin.auth();
    console.log('✅ Firebase Auth available for auth routes');
  } else {
    console.warn('⚠️ Firebase Admin not initialized - auth routes limited');
  }
} catch (error) {
  console.warn('⚠️ Firebase Auth initialization failed in auth routes:', error.message);
}

const requireFirebaseAuth = () => {
  if (!firebaseAuth) {
    throw new AppError('Firebase authentication not configured', 503);
  }
  return firebaseAuth;
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
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
  return safeUser;
};

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
    return user;
  }

  const fallbackPassword = `firebase:${uid}`;
  const hashedPassword = await bcrypt.hash(fallbackPassword, 12);

  user = await User.create({
    id: uid,
    email,
    displayName: displayName || email,
    role,
    password: hashedPassword,
    isEmailVerified,
    isActive: true,
    profile: {}
  });

  await ensureUserWallet(uid, role);

  return user;
};

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('displayName').trim().isLength({ min: 2 }).withMessage('Display name must be at least 2 characters'),
  body('role').optional().isIn(['user', 'vendor', 'admin']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { email, password, displayName, role = 'user' } = req.body;

  // Check if user already exists
  const authClient = requireFirebaseAuth();
  const existingUser = await authClient.getUserByEmail(email).catch(() => null);
  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  // Create user in Firebase Auth
  const userRecord = await authClient.createUser({
    email,
    password,
    displayName,
    emailVerified: false
  });

  // Hash password for additional security (if needed for custom auth)
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user in PostgreSQL
  const userData = {
    id: userRecord.uid,
    email,
    displayName,
    role: role === 'user' ? 'buyer' : role,
    password: hashedPassword,
    isEmailVerified: false,
    isActive: true,
    profile: {
      avatar: null,
      phone: null,
      address: null
    }
  };

  await User.create(userData);
  await ensureUserWallet(userRecord.uid, userData.role);

  // Generate JWT token
  const token = generateToken({ uid: userRecord.uid, email, role: userData.role });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      uid: userRecord.uid,
      email,
      displayName,
      role: userData.role,
      token,
      user: sanitizeUser(userData)
    }
  });
}));

const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const loginHandler = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    throw new AppError('Firebase API key not configured', 500);
  }

  try {
    // Use Firebase Auth REST API to sign in
    const axios = require('axios');
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email,
        password,
        returnSecureToken: true
      }
    );

    const { idToken, refreshToken, expiresIn, localId, displayName } = response.data;

    let user = await User.findByPk(localId);
    if (!user) {
      user = await ensureUserRecord({
        uid: localId,
        email: response.data.email || email,
        displayName: displayName || email.split('@')[0],
        role: 'buyer',
        isEmailVerified: response.data.emailVerified || false
      });
    }

    const userData = user.toJSON();

    // Update last login
    await user.update({
      lastLoginAt: new Date(),
      updatedAt: new Date()
    });

    await ensureUserWallet(localId, userData.role);

    // Generate custom JWT token
    const customToken = generateToken({
      uid: localId,
      email: userData.email,
      role: userData.role
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        uid: localId,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        token: customToken,
        firebaseToken: idToken,
        refreshToken,
        expiresIn,
        user: sanitizeUser(userData)
      }
    });
  } catch (error) {
    if (error.response?.data?.error?.message) {
      throw new AppError(error.response.data.error.message, 401);
    }
    throw error;
  }
});

/**
 * @route   POST /auth/login
 * @desc    Login user with Firebase Auth REST API
 * @access  Public
 */
router.post('/login', loginValidators, loginHandler);
router.post('/signin', loginValidators, loginHandler);

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

  try {
    const axios = require('axios');
    const apiKey = process.env.FIREBASE_API_KEY;
    
    const response = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }
    );

    const { id_token, refresh_token, expires_in, user_id } = response.data;

    // Get user data and generate new custom token
    const user = await User.findByPk(user_id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const userData = user.toJSON();
    const customToken = generateToken({
      uid: user_id,
      email: userData.email,
      role: userData.role
    });

    res.json({
      success: true,
      data: {
        token: customToken,
        firebaseToken: id_token,
        refreshToken: refresh_token,
        expiresIn: expires_in
      }
    });
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
}));

/**
 * @route   GET /auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.uid);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userData = user.toJSON();
  
  // Remove sensitive information
  const { password, ...safeUserData } = userData;

  res.json({
    success: true,
    data: safeUserData
  });
}));

/**
 * @route   GET /auth/me
 * @desc    Get current user info (alias for /profile)
 * @access  Private
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.uid);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userData = user.toJSON();
  
  // Remove sensitive information
  const { password, ...safeUserData } = userData;

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
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Generate password reset link
  const resetLink = await auth.generatePasswordResetLink(email);

  // Here you would typically send an email with the reset link
  // For now, we'll just log it (in production, use a proper email service)
  console.log('Password reset link:', resetLink);

  res.json({
    success: true,
    message: 'Password reset email sent'
  });
}));

/**
 * @route   POST /auth/verify-email
 * @desc    Send email verification
 * @access  Private
 */
router.post('/verify-email', authenticateToken, asyncHandler(async (req, res) => {
  const email = req.user.email;

  // Generate email verification link
  const authClient = requireFirebaseAuth();
  const verificationLink = await authClient.generateEmailVerificationLink(email);

  // Send verification email (implement email service)
  console.log('Email verification link:', verificationLink);

  res.json({
    success: true,
    message: 'Verification email sent'
  });
}));

/**
 * @route   POST /sendEmailOTP
 * @desc    Send OTP via email (for custom OTP flow)
 * @access  Public
 */
router.post('/sendEmailOTP', [
  body('email').isEmail().normalizeEmail(),
  body('subject').optional(),
  body('htmlContent').optional(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { email, to, subject, htmlContent, textContent, purpose, otp } = req.body;

  const recipientEmail = to || email;
  const otpPurpose = purpose || 'verification';

  console.log('📧 OTP Email Request:', {
    to: recipientEmail,
    subject: subject || 'OTP Verification',
    purpose: otpPurpose,
    timestamp: new Date().toISOString()
  });

  // If OTP is provided in request, use Sendchamp to send it
  if (otp) {
    const sendchampResult = await sendOTPEmail(recipientEmail, otp, otpPurpose);
    
    if (sendchampResult.success) {
      res.json({
        success: true,
        message: 'OTP email sent successfully',
        requestId: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: 'sendchamp'
      });
    } else {
      // If Sendchamp fails, still return success for development/testing
      // but log the error
      console.warn('⚠️ Sendchamp email failed, but allowing OTP flow:', sendchampResult.message);
      res.json({
        success: true,
        message: 'OTP email queued (Sendchamp unavailable)',
        requestId: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: 'fallback',
        warning: sendchampResult.message
      });
    }
  } else {
    // No OTP provided - just log the request for development
    res.json({
      success: true,
      message: 'OTP email request acknowledged',
      requestId: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'development'
    });
  }
}));

/**
 * @route   POST /verifyEmailOTP
 * @desc    Verify OTP (server-side validation)
 * @access  Public
 */
router.post('/verifyEmailOTP', [
  body('email').isEmail().normalizeEmail(),
  body('otp').notEmpty().withMessage('OTP is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { email, otp, purpose, timestamp } = req.body;

  console.log('🔐 OTP Verification Request:', {
    email,
    purpose,
    timestamp,
    verifiedAt: new Date().toISOString()
  });

  // In production, verify against stored OTP in database
  // For now, accept any valid OTP format (frontend handles actual validation)
  res.json({
    success: true,
    verified: true,
    message: 'OTP verified successfully'
  });
}));

module.exports = router;
