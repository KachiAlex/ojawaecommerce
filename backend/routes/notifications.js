const express = require('express');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { Notification, User } = require('../models');
const { createNotification, addSSEClient, removeSSEClient } = require('../services/NotificationService');
const router = express.Router();

// SSE-specific auth: accepts token from Authorization header OR query param
const sseAuth = async (req, res, next) => {
  try {
    const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).json({ error: 'Token required' });

    const JWT_SECRET = process.env.JWT_SECRET;
    let uid = null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      uid = decoded.uid;
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!uid) return res.status(401).json({ error: 'Invalid token' });

    const user = await User.findByPk(uid);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = { uid: user.id, ...user.toJSON() };
    delete req.user.password;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { page = 1, limit = 20, unreadOnly = false } = req.query;

  const where = { userId };
  if (unreadOnly === 'true') {
    where.isRead = false;
  }

  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  const notifications = await Notification.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: limitInt,
    offset
  });

  const total = await Notification.count({ where });

  const serializeNotification = (n) => {
    const plain = n.toJSON();
    return { ...plain, read: plain.isRead ?? false };
  };

  res.json({
    success: true,
    data: {
      notifications: notifications.map(serializeNotification),
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(total / limitInt),
        totalItems: total,
        itemsPerPage: limitInt
      }
    }
  });
}));

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.uid;

  const notification = await Notification.findByPk(id);
  
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  const notificationData = notification.toJSON();

  // Check ownership
  if (notificationData.userId !== userId) {
    throw new AppError('Not authorized', 403);
  }

  await notification.update({
    isRead: true,
    readAt: new Date()
  });

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
}));

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  await Notification.update(
    { isRead: true, readAt: new Date() },
    { where: { userId, isRead: false } }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.uid;

  const notification = await Notification.findByPk(id);
  
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  const notificationData = notification.toJSON();

  // Check ownership
  if (notificationData.userId !== userId) {
    throw new AppError('Not authorized', 403);
  }

  await notification.destroy();

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
}));

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notifications count
 * @access  Private
 */
router.get('/unread-count', authenticateToken, asyncHandler(async (req, res) => {
  // This must come before /:id routes
  const userId = req.user.uid;

  const unreadCount = await Notification.count({
    where: { userId, isRead: false }
  });

  res.json({
    success: true,
    data: {
      unreadCount
    }
  });
}));

/**
 * @route   POST /api/notifications
 * @desc    Create notification (uses unified NotificationService for push + email dispatch)
 * @access  Private
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, type, title, message, data = {}, orderId, amount, productName, productId } = req.body;

  // Only admin can create notifications for other users
  if (userId !== req.user.uid && req.user.role !== 'admin') {
    throw new AppError('Not authorized to create notifications for other users', 403);
  }

  const notification = await createNotification({
    userId,
    type,
    title,
    message,
    data,
    orderId,
    amount,
    productName,
    productId
  });

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: notification
  });
}));

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences for current user
 * @access  Private
 */
router.get('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.uid);
  if (!user) throw new AppError('User not found', 404);

  res.json({
    success: true,
    data: user.notificationPreferences || {
      push: { enabled: true, orders: true, payments: true, disputes: true, messages: true, marketing: false },
      email: { enabled: true, orders: true, payments: true, disputes: true, messages: true, marketing: false }
    }
  });
}));

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences for current user
 * @access  Private
 */
router.put('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.uid);
  if (!user) throw new AppError('User not found', 404);

  const preferences = req.body;
  await user.update({ notificationPreferences: preferences });

  res.json({
    success: true,
    message: 'Notification preferences updated',
    data: preferences
  });
}));

/**
 * @route   GET /api/notifications/stream
 * @desc    SSE endpoint for real-time notifications
 * @access  Private
 */
router.get('/stream', sseAuth, (req, res) => {
  const userId = req.user.uid;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Send initial heartbeat
  res.write(': connected\n\n');

  // Register client
  addSSEClient(userId, res);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeat);
      removeSSEClient(userId, res);
    }
  }, 30000);

  // Cleanup on close
  req.on('close', () => {
    clearInterval(heartbeat);
    removeSSEClient(userId, res);
  });
});

module.exports = router;
module.exports.sseAuth = sseAuth;
