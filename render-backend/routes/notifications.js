const express = require('express');
const admin = require('firebase-admin');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const db = admin.firestore();

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { page = 1, limit = 20, unreadOnly = false } = req.query;

  let query = db.collection('notifications')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc');

  if (unreadOnly === 'true') {
    query = query.where('read', '==', false);
  }

  // Pagination
  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  if (offset > 0) {
    const previousPage = await query.limit(offset).get();
    if (previousPage.size > 0) {
      const lastDoc = previousPage.docs[previousPage.size - 1];
      query = query.startAfter(lastDoc);
    }
  }

  const snapshot = await query.limit(limitInt).get();

  const notifications = [];
  snapshot.forEach(doc => {
    const notification = {
      id: doc.id,
      ...doc.data()
    };

    if (notification.createdAt) {
      notification.createdAt = notification.createdAt.toDate?.() || notification.createdAt;
    }

    notifications.push(notification);
  });

  res.json({
    success: true,
    data: {
      notifications,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(notifications.length / limitInt),
        totalItems: notifications.length,
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

  const notificationDoc = await db.collection('notifications').doc(id).get();
  
  if (!notificationDoc.exists) {
    throw new AppError('Notification not found', 404);
  }

  const notification = notificationDoc.data();

  // Check ownership
  if (notification.userId !== userId) {
    throw new AppError('Not authorized', 403);
  }

  await db.collection('notifications').doc(id).update({
    read: true,
    readAt: admin.firestore.FieldValue.serverTimestamp()
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

  const snapshot = await db.collection('notifications')
    .where('userId', '==', userId)
    .where('read', '==', false)
    .get();

  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.update(doc.ref, {
      read: true,
      readAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();

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

  const notificationDoc = await db.collection('notifications').doc(id).get();
  
  if (!notificationDoc.exists) {
    throw new AppError('Notification not found', 404);
  }

  const notification = notificationDoc.data();

  // Check ownership
  if (notification.userId !== userId) {
    throw new AppError('Not authorized', 403);
  }

  await db.collection('notifications').doc(id).delete();

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

  const snapshot = await db.collection('notifications')
    .where('userId', '==', userId)
    .where('read', '==', false)
    .get();

  res.json({
    success: true,
    data: {
      unreadCount: snapshot.size
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
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const notificationRef = await db.collection('notifications').add(notificationData);

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: {
      id: notificationRef.id,
      ...notificationData
    }
  });
}));

module.exports = router;
