const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler, generateToken } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const auth = admin.auth();
const db = admin.firestore();

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
  const existingUser = await auth.getUserByEmail(email).catch(() => null);
  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  // Create user in Firebase Auth
  const userRecord = await auth.createUser({
    email,
    password,
    displayName,
    emailVerified: false
  });

  // Hash password for additional security (if needed for custom auth)
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user document in Firestore
  const userData = {
    uid: userRecord.uid,
    email,
    displayName,
    role,
    emailVerified: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    isActive: true,
    profile: {
      avatar: null,
      phone: null,
      address: null
    },
    settings: {
      notifications: true,
      emailMarketing: false,
      language: 'en'
    }
  };

  await db.collection('users').doc(userRecord.uid).set(userData);

  // Generate JWT token
  const token = generateToken({ uid: userRecord.uid, email, role });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      uid: userRecord.uid,
      email,
      displayName,
      role,
      token
    }
  });
}));

/**
 * @route   POST /auth/login
 * @desc    Login user with Firebase Auth REST API
 * @access  Public
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
], asyncHandler(async (req, res) => {
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

    const { idToken, refreshToken, expiresIn, localId } = response.data;

    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(localId).get();
    if (!userDoc.exists) {
      throw new AppError('User not found', 404);
    }

    const userData = userDoc.data();

    // Update last login
    await db.collection('users').doc(localId).update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

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
        expiresIn
      }
    });
  } catch (error) {
    if (error.response?.data?.error?.message) {
      throw new AppError(error.response.data.error.message, 401);
    }
    throw error;
  }
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
    const userDoc = await db.collection('users').doc(user_id).get();
    if (!userDoc.exists) {
      throw new AppError('User not found', 404);
    }

    const userData = userDoc.data();
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
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }

  const userData = userDoc.data();
  
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

  const updates = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (displayName) updates.displayName = displayName;
  if (phone) updates['profile.phone'] = phone;
  if (address) updates['profile.address'] = address;

  await db.collection('users').doc(userId).update(updates);

  // Get updated user data
  const updatedUserDoc = await db.collection('users').doc(userId).get();
  const userData = updatedUserDoc.data();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: userData
  });
}));

/**
 * @route   POST /auth/logout
 * @desc    Logout user (revoke tokens)
 * @access  Private
 */
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // In a production environment, you might want to:
  // 1. Revoke the Firebase token
  // 2. Add the JWT token to a blacklist
  // 3. Clear any server-side sessions

  // For now, we'll just update the last logout time
  await db.collection('users').doc(req.user.uid).update({
    lastLogoutAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

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
  const verificationLink = await auth.generateEmailVerificationLink(email);

  // Send verification email (implement email service)
  console.log('Email verification link:', verificationLink);

  res.json({
    success: true,
    message: 'Verification email sent'
  });
}));

module.exports = router;
