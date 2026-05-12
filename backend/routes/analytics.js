const express = require('express');
const { body, query, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

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
 * @route   POST /api/analytics/events
 * @desc    Track analytics events
 * @access  Private
 */
router.post('/events', authenticateToken, [
  body('events').isArray(),
  body('events.*.name').isString(),
  body('events.*.category').optional().isString(),
  body('events.*.action').optional().isString(),
  body('events.*.label').optional().isString(),
  body('events.*.value').optional().isNumeric(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { events } = req.body;
  const userId = req.user.uid;

  // Process and store analytics events
  const batch = db.batch();
  const eventDocs = [];

  events.forEach(event => {
    const eventData = {
      userId,
      name: event.name,
      category: event.category || 'general',
      action: event.action || 'unknown',
      label: event.label || null,
      value: event.value || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: req.get('user-agent'),
      ipAddress: req.ip
    };

    const eventRef = db.collection('analytics_events').doc();
    batch.set(eventRef, eventData);
    eventDocs.push({
      id: eventRef.id,
      ...eventData
    });
  });

  await batch.commit();

  res.json({
    success: true,
    message: `${events.length} events tracked successfully`,
    data: {
      events: eventDocs
    }
  });
}));

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Private (admin)
 */
router.get('/revenue', authenticateToken, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('groupBy').optional().isIn(['daily', 'weekly', 'monthly']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const {
    startDate,
    endDate,
    groupBy = 'daily'
  } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Get completed orders within date range
  const ordersSnapshot = await db.collection('orders')
    .where('paymentStatus', '==', 'paid')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(start))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(end))
    .get();

  const orders = ordersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate()
  }));

  // Calculate revenue metrics
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Group revenue by period
  const groupedRevenue = {};
  orders.forEach(order => {
    const date = new Date(order.createdAt);
    let key;
    
    switch (groupBy) {
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default: // daily
        key = date.toISOString().split('T')[0];
    }
    
    if (!groupedRevenue[key]) {
      groupedRevenue[key] = {
        date: key,
        revenue: 0,
        orders: 0
      };
    }
    
    groupedRevenue[key].revenue += order.total || 0;
    groupedRevenue[key].orders += 1;
  });

  const revenueData = Object.values(groupedRevenue).sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  res.json({
    success: true,
    data: {
      period: { start, end },
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue
      },
      revenueData,
      groupBy
    }
  });
}));

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard summary
 * @access  Private (admin)
 */
router.get('/dashboard', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get recent metrics
  const [
    totalProductsSnapshot,
    recentOrdersSnapshot,
    recentUsersSnapshot,
    totalRevenueSnapshot
  ] = await Promise.all([
    db.collection('products').where('status', '==', 'active').get(),
    db.collection('orders').where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo)).get(),
    db.collection('users').where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo)).get(),
    db.collection('orders').where('paymentStatus', '==', 'paid').where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo)).get()
  ]);

  // Calculate metrics
  const totalProducts = totalProductsSnapshot.size;
  const recentOrders = recentOrdersSnapshot.size;
  const recentUsers = recentUsersSnapshot.size;
  
  const totalRevenue = totalRevenueSnapshot.docs.reduce((sum, doc) => {
    return sum + (doc.data().total || 0);
  }, 0);

  res.json({
    success: true,
    data: {
      summary: {
        totalProducts,
        recentOrders,
        recentUsers,
        totalRevenue
      },
      lastUpdated: now
    }
  });
}));

module.exports = router;
