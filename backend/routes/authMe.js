const express = require('express');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

// GET /api/auth/me endpoint - Get current user info
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

module.exports = router;
