const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateVapidKeys, configureVapid } = require('../services/pushService');

const router = express.Router();

/**
 * @route   GET /api/push/vapidPublicKey
 * @desc    Get VAPID public key for web push
 * @access  Public
 */
router.get('/vapidPublicKey', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ vapidPublicKey: publicKey });
});

/**
 * @route   POST /api/push/subscribe
 * @desc    Save push subscription for a user
 * @access  Private
 */
router.post('/subscribe', authenticateToken, asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  const userId = req.user.uid;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Valid subscription required' });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const subs = user.pushSubscriptions || [];

  // Check if subscription already exists (by endpoint)
  const exists = subs.some(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push(subscription);
    await user.update({ pushSubscriptions: subs });
    console.log(`📱 Push subscription added for user ${userId}: ${subscription.endpoint.substring(0, 50)}...`);
  }

  res.json({ success: true, message: 'Subscription saved' });
}));

/**
 * @route   POST /api/push/unsubscribe
 * @desc    Remove push subscription for a user
 * @access  Private
 */
router.post('/unsubscribe', authenticateToken, asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  const userId = req.user.uid;

  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const subs = user.pushSubscriptions || [];
  const filtered = endpoint
    ? subs.filter(s => s.endpoint !== endpoint)
    : []; // If no endpoint, remove all

  await user.update({ pushSubscriptions: filtered });
  console.log(`📱 Push subscription removed for user ${userId}`);

  res.json({ success: true, message: 'Subscription removed' });
}));

/**
 * @route   POST /api/push/subscribe-topic
 * @desc    Subscribe to a topic (placeholder for future)
 * @access  Private
 */
router.post('/subscribe-topic', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Topic subscription not yet implemented' });
}));

/**
 * @route   POST /api/push/unsubscribe-topic
 * @desc    Unsubscribe from a topic (placeholder for future)
 * @access  Private
 */
router.post('/unsubscribe-topic', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Topic unsubscription not yet implemented' });
}));

module.exports = router;
