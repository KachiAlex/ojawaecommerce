const express = require('express');
const { body, query, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin, validateAdminContext } = require('../middleware/auth');
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
 * @route   GET /admin/users
 * @desc    Get all users (admin only)
 * @access  Private (admin)
 */
router.get('/users', authenticateToken, requireAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['user', 'vendor', 'admin']),
  query('status').optional().isIn(['active', 'inactive', 'suspended']),
  query('search').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    role,
    status,
    search
  } = req.query;

  let query = db.collection('users').orderBy('createdAt', 'desc');

  // Apply filters
  if (role) {
    query = query.where('role', '==', role);
  }

  if (status) {
    query = query.where('status', '==', status);
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

  const users = [];
  snapshot.forEach(doc => {
    const user = {
      id: doc.id,
      ...doc.data()
    };

    // Convert timestamps
    if (user.createdAt) {
      user.createdAt = user.createdAt.toDate?.() || user.createdAt;
    }
    if (user.lastLoginAt) {
      user.lastLoginAt = user.lastLoginAt.toDate?.() || user.lastLoginAt;
    }

    // Remove sensitive information
    delete user.password;

    // Apply search filter if needed
    if (search) {
      const searchTerm = search.toLowerCase();
      const matchesSearch = 
        user.displayName?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm);
      
      if (matchesSearch) {
        users.push(user);
      }
    } else {
      users.push(user);
    }
  });

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(users.length / limitInt),
        totalItems: users.length,
        itemsPerPage: limitInt
      }
    }
  });
}));

/**
 * @route   PUT /admin/users/:id/status
 * @desc    Update user status (admin only)
 * @access  Private (admin)
 */
router.put('/users/:id/status', authenticateToken, requireAdmin, validateAdminContext, [
  body('status').isIn(['active', 'inactive', 'suspended']),
  body('reason').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const userDoc = await db.collection('users').doc(id).get();
  
  if (!userDoc.exists) {
    throw new AppError('User not found', 404);
  }

  const user = userDoc.data();

  // Prevent admin from deactivating themselves
  if (id === req.user.uid && status !== 'active') {
    throw new AppError('Cannot deactivate your own account', 400);
  }

  await db.collection('users').doc(id).update({
    status,
    statusReason: reason,
    statusChangedBy: req.user.uid,
    statusChangedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Log admin action
  await db.collection('admin_audit_logs').add({
    adminId: req.user.uid,
    adminEmail: req.user.email,
    action: 'user_status_change',
    targetUserId: id,
    targetUserEmail: user.email,
    oldStatus: user.status || 'active',
    newStatus: status,
    reason,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  // Notify user of status change
  await db.collection('notifications').add({
    userId: id,
    type: 'account_status',
    title: `Account ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your account has been ${status}${reason ? ': ' + reason : ''}`,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  res.json({
    success: true,
    message: `User status updated to ${status}`
  });
}));

/**
 * @route   GET /admin/orders
 * @desc    Get all orders (admin only)
 * @access  Private (admin)
 */
router.get('/orders', authenticateToken, requireAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  query('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    status,
    paymentStatus,
    startDate,
    endDate
  } = req.query;

  let query = db.collection('orders').orderBy('createdAt', 'desc');

  // Apply filters
  if (status) {
    query = query.where('orderStatus', '==', status);
  }

  if (paymentStatus) {
    query = query.where('paymentStatus', '==', paymentStatus);
  }

  if (startDate) {
    query = query.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)));
  }

  if (endDate) {
    query = query.where('createdAt', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)));
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

  const orders = [];
  snapshot.forEach(doc => {
    const order = {
      id: doc.id,
      ...doc.data()
    };

    // Convert timestamps
    if (order.createdAt) {
      order.createdAt = order.createdAt.toDate?.() || order.createdAt;
    }
    if (order.updatedAt) {
      order.updatedAt = order.updatedAt.toDate?.() || order.updatedAt;
    }

    orders.push(order);
  });

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(orders.length / limitInt),
        totalItems: orders.length,
        itemsPerPage: limitInt
      }
    }
  });
}));

/**
 * @route   GET /admin/products
 * @desc    Get all products (admin only)
 * @access  Private (admin)
 */
router.get('/products', authenticateToken, requireAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['active', 'inactive', 'pending']),
  query('featured').optional().isBoolean(),
  query('category').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    status,
    featured,
    category
  } = req.query;

  let query = db.collection('products').orderBy('createdAt', 'desc');

  // Apply filters
  if (status) {
    query = query.where('status', '==', status);
  }

  if (featured !== undefined) {
    query = query.where('featured', '==', featured === 'true');
  }

  if (category) {
    query = query.where('category', '==', category);
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

  const products = [];
  snapshot.forEach(doc => {
    const product = {
      id: doc.id,
      ...doc.data()
    };

    // Convert timestamps
    if (product.createdAt) {
      product.createdAt = product.createdAt.toDate?.() || product.createdAt;
    }
    if (product.updatedAt) {
      product.updatedAt = product.updatedAt.toDate?.() || product.updatedAt;
    }

    products.push(product);
  });

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(products.length / limitInt),
        totalItems: products.length,
        itemsPerPage: limitInt
      }
    }
  });
}));

/**
 * @route   PUT /admin/products/:id/approve
 * @desc    Approve product (admin only)
 * @access  Private (admin)
 */
router.put('/products/:id/approve', authenticateToken, requireAdmin, validateAdminContext, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const productDoc = await db.collection('products').doc(id).get();
  
  if (!productDoc.exists) {
    throw new AppError('Product not found', 404);
  }

  const product = productDoc.data();

  if (product.status === 'active') {
    throw new AppError('Product is already active', 400);
  }

  await db.collection('products').doc(id).update({
    status: 'active',
    approvedBy: req.user.uid,
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Log admin action
  await db.collection('admin_audit_logs').add({
    adminId: req.user.uid,
    adminEmail: req.user.email,
    action: 'product_approval',
    targetProductId: id,
    productName: product.name,
    vendorId: product.vendorId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  // Notify vendor
  await db.collection('notifications').add({
    userId: product.vendorId,
    type: 'product_approved',
    title: 'Product Approved',
    message: `Your product "${product.name}" has been approved and is now live`,
    productId: id,
    productName: product.name,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  res.json({
    success: true,
    message: 'Product approved successfully'
  });
}));

/**
 * @route   PUT /admin/products/:id/reject
 * @desc    Reject product (admin only)
 * @access  Private (admin)
 */
router.put('/products/:id/reject', authenticateToken, requireAdmin, validateAdminContext, [
  body('reason').isString().isLength({ min: 5, max: 500 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const productDoc = await db.collection('products').doc(id).get();
  
  if (!productDoc.exists) {
    throw new AppError('Product not found', 404);
  }

  const product = productDoc.data();

  await db.collection('products').doc(id).update({
    status: 'rejected',
    rejectionReason: reason,
    rejectedBy: req.user.uid,
    rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Log admin action
  await db.collection('admin_audit_logs').add({
    adminId: req.user.uid,
    adminEmail: req.user.email,
    action: 'product_rejection',
    targetProductId: id,
    productName: product.name,
    vendorId: product.vendorId,
    reason,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  // Notify vendor
  await db.collection('notifications').add({
    userId: product.vendorId,
    type: 'product_rejected',
    title: 'Product Rejected',
    message: `Your product "${product.name}" has been rejected: ${reason}`,
    productId: id,
    productName: product.name,
    reason,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  res.json({
    success: true,
    message: 'Product rejected successfully'
  });
}));

/**
 * @route   GET /admin/analytics/overview
 * @desc    Get admin dashboard analytics
 * @access  Private (admin)
 */
router.get('/analytics/overview', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get key metrics in parallel
  const [
    totalUsersSnapshot,
    recentUsersSnapshot,
    totalProductsSnapshot,
    pendingProductsSnapshot,
    totalOrdersSnapshot,
    recentOrdersSnapshot,
    revenueSnapshot
  ] = await Promise.all([
    db.collection('users').get(),
    db.collection('users').where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo)).get(),
    db.collection('products').where('status', '==', 'active').get(),
    db.collection('products').where('status', '==', 'pending').get(),
    db.collection('orders').get(),
    db.collection('orders').where('createdAt', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo)).get(),
    db.collection('orders').where('paymentStatus', '==', 'paid').where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo)).get()
  ]);

  // Calculate metrics
  const totalUsers = totalUsersSnapshot.size;
  const recentUsers = recentUsersSnapshot.size;
  const totalProducts = totalProductsSnapshot.size;
  const pendingProducts = pendingProductsSnapshot.size;
  const totalOrders = totalOrdersSnapshot.size;
  const recentOrders = recentOrdersSnapshot.size;
  
  const totalRevenue = revenueSnapshot.docs.reduce((sum, doc) => {
    return sum + (doc.data().total || 0);
  }, 0);

  // Get order status distribution
  const statusCounts = {};
  totalOrdersSnapshot.forEach(doc => {
    const status = doc.data().orderStatus || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      overview: {
        totalUsers,
        recentUsers,
        totalProducts,
        pendingProducts,
        totalOrders,
        recentOrders,
        totalRevenue
      },
      orderStatusDistribution: statusCounts,
      lastUpdated: now
    }
  });
}));

/**
 * @route   GET /admin/security/events
 * @desc    Get security events (admin only)
 * @access  Private (admin)
 */
router.get('/security/events', authenticateToken, requireAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('eventType').optional().isString(),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    eventType,
    severity,
    startDate,
    endDate
  } = req.query;

  let query = db.collection('security_audit_logs').orderBy('timestamp', 'desc');

  // Apply filters
  if (eventType) {
    query = query.where('eventType', '==', eventType);
  }

  if (severity) {
    query = query.where('severity', '==', severity);
  }

  if (startDate) {
    query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)));
  }

  if (endDate) {
    query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)));
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

  const events = [];
  snapshot.forEach(doc => {
    const event = {
      id: doc.id,
      ...doc.data()
    };

    // Convert timestamp
    if (event.timestamp) {
      event.timestamp = event.timestamp.toDate?.() || event.timestamp;
    }

    events.push(event);
  });

  res.json({
    success: true,
    data: {
      events,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(events.length / limitInt),
        totalItems: events.length,
        itemsPerPage: limitInt
      }
    }
  });
}));

/**
 * @route   GET /admin/audit-logs
 * @desc    Get admin audit logs (admin only)
 * @access  Private (admin)
 */
router.get('/audit-logs', authenticateToken, requireAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('action').optional().isString(),
  query('adminId').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    action,
    adminId,
    startDate,
    endDate
  } = req.query;

  let query = db.collection('admin_audit_logs').orderBy('timestamp', 'desc');

  // Apply filters
  if (action) {
    query = query.where('action', '==', action);
  }

  if (adminId) {
    query = query.where('adminId', '==', adminId);
  }

  if (startDate) {
    query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)));
  }

  if (endDate) {
    query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)));
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

  const logs = [];
  snapshot.forEach(doc => {
    const log = {
      id: doc.id,
      ...doc.data()
    };

    // Convert timestamp
    if (log.timestamp) {
      log.timestamp = log.timestamp.toDate?.() || log.timestamp;
    }

    logs.push(log);
  });

  res.json({
    success: true,
    data: {
      auditLogs: logs,
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(logs.length / limitInt),
        totalItems: logs.length,
        itemsPerPage: limitInt
      }
    }
  });
}));

module.exports = router;
