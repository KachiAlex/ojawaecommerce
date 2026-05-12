const express = require('express');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { Notification } = require('../models');
const router = express.Router();

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
    where.read = false;
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

  res.json({
    success: true,
    data: {
      notifications: notifications.map(n => n.toJSON()),
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
    read: true,
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
    { read: true, readAt: new Date() },
    { where: { userId, read: false } }
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
  const userId = req.user.uid;

  const unreadCount = await Notification.count({
    where: { userId, read: false }
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
 * @desc    Create notification (internal use)
 * @access  Private
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, type, title, message, data = {} } = req.body;

  // Only admin can create notifications for other users
  if (userId !== req.user.uid && req.user.role !== 'admin') {
    throw new AppError('Not authorized to create notifications for other users', 403);
  }

  const notificationData = {
    userId,
    type,
    title,
    message,
    ...data,
    read: false
  };

  const notification = await Notification.create(notificationData);

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: notification.toJSON()
  });
}));

module.exports = router;
