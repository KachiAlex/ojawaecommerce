const express = require('express');
const { Op, fn, col } = require('sequelize');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { sequelize, User, Wallet, Order, Notification, Conversation } = require('../models');
const { serializeConversation } = require('../utils/messagingSerializer');

const router = express.Router();

const sanitizeUser = (userInstance) => {
  if (!userInstance) return null;
  const plain = typeof userInstance.toJSON === 'function' ? userInstance.toJSON() : userInstance;
  const { password, ...rest } = plain;
  return rest;
};

const ensureOwnOrAdmin = (req, targetUserId) => {
  if (req.user.role === 'admin') return;
  if (req.user.uid !== targetUserId) {
    throw new AppError('Not authorized to access this user resource', 403);
  }
};

const ensureWallet = async (userId) => {
  const [wallet] = await Wallet.findOrCreate({
    where: { userId },
    defaults: {
      balance: 0,
      currency: 'NGN'
    }
  });
  return wallet;
};

const serializeNotification = (notificationInstance) => {
  const plain = typeof notificationInstance.toJSON === 'function'
    ? notificationInstance.toJSON()
    : notificationInstance;

  return {
    ...plain,
    read: typeof plain.read === 'boolean' ? plain.read : (plain.isRead ?? false)
  };
};

router.use(authenticateToken);

// Fetch user profile
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  ensureOwnOrAdmin(req, userId);

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ success: true, user: sanitizeUser(user) });
}));

// Update profile
router.patch('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  ensureOwnOrAdmin(req, userId);

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const updates = {};
  const {
    displayName,
    firstName,
    lastName,
    phoneNumber,
    profile,
    isEmailVerified,
    isActive,
    role
  } = req.body;

  if (displayName) updates.displayName = displayName;
  if (firstName) updates.firstName = firstName;
  if (lastName) updates.lastName = lastName;
  if (phoneNumber) updates.phoneNumber = phoneNumber;
  if (typeof isEmailVerified === 'boolean') updates.isEmailVerified = isEmailVerified;
  if (typeof isActive === 'boolean' && req.user.role === 'admin') updates.isActive = isActive;
  if (role && req.user.role === 'admin') updates.role = role;
  if (profile) {
    updates.profile = {
      ...(user.profile || {}),
      ...profile
    };
  }

  await user.update({ ...updates, updatedAt: new Date() });

  res.json({ success: true, user: sanitizeUser(user) });
}));

// Delete user (admin only)
router.delete('/:userId', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin privileges required', 403);
  }

  const { userId } = req.params;
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  await user.destroy();
  res.json({ success: true, message: 'User deleted successfully' });
}));

// Wallet info
router.get('/:userId/wallet', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  ensureOwnOrAdmin(req, userId);

  const wallet = await ensureWallet(userId);
  res.json({ success: true, wallet: wallet.toJSON() });
}));

// Orders for user (buyer or vendor)
router.get('/:userId/orders', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  ensureOwnOrAdmin(req, userId);

  const { type = 'buyer', limit = 50 } = req.query;
  const where = type === 'vendor' ? { vendorId: userId } : { buyerId: userId };
  const limitInt = Math.min(parseInt(limit, 10) || 50, 100);

  const orders = await Order.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: limitInt
  });

  res.json({ success: true, items: orders.map(order => order.toJSON()) });
}));

// Notifications list
router.get('/:userId/notifications', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  ensureOwnOrAdmin(req, userId);

  const limitInt = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const notifications = await Notification.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: limitInt
  });

  res.json({ success: true, items: notifications.map(serializeNotification) });
}));

// Mark all notifications as read
router.post('/:userId/notifications/mark-all-read', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  ensureOwnOrAdmin(req, userId);

  const [updated] = await Notification.update(
    { read: true, isRead: true, readAt: new Date() },
    { where: { userId, read: false } }
  );

  res.json({ success: true, updated });
}));

// Conversations list for user
router.get('/:userId/conversations', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  ensureOwnOrAdmin(req, userId);

  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  const conversations = await Conversation.findAll({
    where: sequelize.where(
      fn('array_position', col('participantIds'), userId),
      { [Op.gt]: 0 }
    ),
    order: [['updatedAt', 'DESC']],
    limit
  });

  res.json({ success: true, items: conversations.map(serializeConversation) });
}));

module.exports = router;
