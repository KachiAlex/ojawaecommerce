const express = require('express');
const { query, validationResult } = require('express-validator');
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
 * @route   GET /api/analytics/products
 * @desc    Get product analytics
 * @access  Private (admin)
 */
router.get('/products', authenticateToken, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { limit = 50 } = req.query;

  // Get top products by sales
  const productsSnapshot = await db.collection('products')
    .where('status', '==', 'active')
    .orderBy('salesCount', 'desc')
    .limit(parseInt(limit))
    .get();

  const products = productsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Get category distribution
  const allProductsSnapshot = await db.collection('products')
    .where('status', '==', 'active')
    .get();

  const categoryDistribution = {};
  allProductsSnapshot.forEach(doc => {
    const product = doc.data();
    const category = product.category || 'uncategorized';
    categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
  });

  // Calculate total stats
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);
  const averagePrice = totalProducts > 0 
    ? products.reduce((sum, product) => sum + (product.price || 0), 0) / totalProducts 
    : 0;

  res.json({
    success: true,
    data: {
      topProducts: products,
      categoryDistribution,
      summary: {
        totalProducts,
        totalStock,
        averagePrice
      }
    }
  });
}));

/**
 * @route   GET /api/analytics/orders
 * @desc    Get order analytics
 * @access  Private (admin)
 */
router.get('/orders', authenticateToken, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const {
    startDate,
    endDate
  } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Get orders within date range
  const ordersSnapshot = await db.collection('orders')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(start))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(end))
    .get();

  const orders = ordersSnapshot.docs.map(doc => ({
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate()
  }));

  // Calculate order statistics
  const totalOrders = orders.length;
  const statusDistribution = {};
  const paymentMethodDistribution = {};

  orders.forEach(order => {
    const status = order.orderStatus || 'unknown';
    const paymentMethod = order.paymentMethod || 'unknown';
    
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    paymentMethodDistribution[paymentMethod] = (paymentMethodDistribution[paymentMethod] || 0) + 1;
  });

  const completedOrders = orders.filter(order => order.orderStatus === 'delivered').length;
  const cancelledOrders = orders.filter(order => order.orderStatus === 'cancelled').length;
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  res.json({
    success: true,
    data: {
      period: { start, end },
      summary: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        completionRate
      },
      statusDistribution,
      paymentMethodDistribution
    }
  });
}));

/**
 * @route   GET /api/analytics/users
 * @desc    Get user analytics
 * @access  Private (admin)
 */
router.get('/users', authenticateToken, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const {
    startDate,
    endDate
  } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Get users registered within date range
  const usersSnapshot = await db.collection('users')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(start))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(end))
    .get();

  const users = usersSnapshot.docs.map(doc => doc.data());

  // Get user role distribution
  const allUsersSnapshot = await db.collection('users').get();
  const roleDistribution = {};

  allUsersSnapshot.forEach(doc => {
    const user = doc.data();
    const role = user.role || 'user';
    roleDistribution[role] = (roleDistribution[role] || 0) + 1;
  });

  // Calculate active users (users with orders in the last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeUsersSnapshot = await db.collection('orders')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
    .get();

  const activeUserIds = new Set();
  activeUsersSnapshot.forEach(doc => {
    activeUserIds.add(doc.data().buyerId);
  });

  res.json({
    success: true,
    data: {
      period: { start, end },
      summary: {
        newUsers: users.length,
        totalUsers: allUsersSnapshot.size,
        activeUsers: activeUserIds.size
      },
      roleDistribution
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
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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

  // Get last 7 days orders for trend
  const lastWeekOrdersSnapshot = await db.collection('orders')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
    .get();

  const dailyOrders = {};
  lastWeekOrdersSnapshot.forEach(doc => {
    const order = doc.data();
    const date = order.createdAt.toDate().toISOString().split('T')[0];
    dailyOrders[date] = (dailyOrders[date] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      summary: {
        totalProducts,
        recentOrders,
        recentUsers,
        totalRevenue
      },
      dailyOrders,
      lastUpdated: now
    }
  });
}));

/**
 * @route   GET /api/analytics/vendors
 * @desc    Get vendor analytics
 * @access  Private (admin or vendor)
 */
router.get('/vendors', authenticateToken, [
  query('vendorId').optional(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { vendorId, limit = 20 } = req.query;
  const user = req.user;

  // If not admin, can only see own analytics
  if (user.role !== 'admin' && vendorId && vendorId !== user.uid) {
    throw new AppError('Not authorized', 403);
  }

  const targetVendorId = vendorId || (user.role === 'vendor' ? user.uid : null);
  
  if (!targetVendorId) {
    throw new AppError('Vendor ID required', 400);
  }

  // Get vendor's products
  const productsSnapshot = await db.collection('products')
    .where('vendorId', '==', targetVendorId)
    .get();

  const products = productsSnapshot.docs.map(doc => doc.data());
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);

  // Get vendor's orders
  const ordersSnapshot = await db.collection('orders')
    .where('vendorIds', 'array-contains', targetVendorId)
    .get();

  const orders = ordersSnapshot.docs.map(doc => doc.data());
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => {
    const vendorItems = order.items?.filter(item => item.vendorId === targetVendorId) || [];
    const vendorTotal = vendorItems.reduce((itemSum, item) => itemSum + (item.totalPrice || 0), 0);
    return sum + vendorTotal;
  }, 0);

  // Get vendor info
  const userDoc = await db.collection('users').doc(targetVendorId).get();
  const vendorInfo = userDoc.exists ? userDoc.data() : {};

  res.json({
    success: true,
    data: {
      vendorInfo: {
        displayName: vendorInfo.displayName,
        email: vendorInfo.email,
        role: vendorInfo.role
      },
      summary: {
        totalProducts,
        totalStock,
        totalOrders,
        totalRevenue
      }
    }
  });
}));

module.exports = router;
