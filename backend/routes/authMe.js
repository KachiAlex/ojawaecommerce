// Quick fix for /api/auth/me endpoint
const express = require('express');
const router = express.Router();

// Simple /api/auth/me endpoint for testing
router.get('/me', (req, res) => {
  // For now, return a mock response
  res.json({
    success: true,
    data: {
      uid: 'test-user',
      email: 'test@ojawa.africa',
      displayName: 'Test User',
      role: 'user',
      isActive: true
    }
  });
});

module.exports = router;
