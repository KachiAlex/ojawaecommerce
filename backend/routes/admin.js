const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op, Sequelize } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin, validateAdminContext } = require('../middleware/auth');
const { User, Order, Product, AdminAuditLog, SecurityAuditLog, Notification } = require('../models');
const router = express.Router();

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

  const where = {};
  if (role) {
    where.role = role;
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    where[Op.or] = [
      { displayName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  const users = await User.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: limitInt,
    offset,
    attributes: { exclude: ['password'] }
  });

  const total = await User.count({ where });

  res.json({
    success: true,
    data: {
      users: users.map(u => u.toJSON()),
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

  const user = await User.findByPk(id);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userData = user.toJSON();

  // Prevent admin from deactivating themselves
  if (id === req.user.uid && status !== 'active') {
    throw new AppError('Cannot deactivate your own account', 400);
  }

  await user.update({
    status,
    statusReason: reason,
    statusChangedBy: req.user.uid,
    statusChangedAt: new Date()
  });

  // Log admin action
  await AdminAuditLog.create({
    adminId: req.user.uid,
    adminEmail: req.user.email,
    action: 'user_status_change',
    targetUserId: id,
    targetUserEmail: userData.email,
    oldStatus: userData.status || 'active',
    newStatus: status,
    reason,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  // Notify user of status change
  await Notification.create({
    userId: id,
    type: 'account_status',
    title: `Account ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your account has been ${status}${reason ? ': ' + reason : ''}`,
    read: false
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

  const where = {};
  if (status) {
    where.orderStatus = status;
  }
  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      where.createdAt[Op.lte] = new Date(endDate);
    }
  }

  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  const orders = await Order.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: limitInt,
    offset
  });

  const total = await Order.count({ where });

  res.json({
    success: true,
    data: {
      orders: orders.map(o => o.toJSON()),
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

  const where = {};
  if (status) {
    where.status = status;
  }
  if (featured !== undefined) {
    where.featured = featured === 'true' || featured === true;
  }
  if (category) {
    where.category = category;
  }

  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  const products = await Product.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: limitInt,
    offset
  });

  const total = await Product.count({ where });

  res.json({
    success: true,
    data: {
      products: products.map(p => p.toJSON()),
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
 * @route   PUT /admin/products/:id/approve
 * @desc    Approve product (admin only)
 * @access  Private (admin)
 */
router.put('/products/:id/approve', authenticateToken, requireAdmin, validateAdminContext, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);
  
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const productData = product.toJSON();

  if (productData.status === 'active') {
    throw new AppError('Product is already active', 400);
  }

  await product.update({
    status: 'active',
    approvedBy: req.user.uid,
    approvedAt: new Date()
  });

  // Log admin action
  await AdminAuditLog.create({
    adminId: req.user.uid,
    adminEmail: req.user.email,
    action: 'product_approval',
    targetProductId: id,
    productName: productData.name,
    vendorId: productData.vendorId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  // Notify vendor
  await Notification.create({
    userId: productData.vendorId,
    type: 'product_approved',
    title: 'Product Approved',
    message: `Your product "${productData.name}" has been approved and is now live`,
    productId: id,
    productName: productData.name,
    read: false
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

  const product = await Product.findByPk(id);
  
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const productData = product.toJSON();

  await product.update({
    status: 'rejected',
    rejectionReason: reason,
    rejectedBy: req.user.uid,
    rejectedAt: new Date()
  });

  // Log admin action
  await AdminAuditLog.create({
    adminId: req.user.uid,
    adminEmail: req.user.email,
    action: 'product_rejection',
    targetProductId: id,
    productName: productData.name,
    vendorId: productData.vendorId,
    reason,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  // Notify vendor
  await Notification.create({
    userId: productData.vendorId,
    type: 'product_rejected',
    title: 'Product Rejected',
    message: `Your product "${productData.name}" has been rejected: ${reason}`,
    productId: id,
    productName: productData.name,
    reason,
    read: false
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
    totalUsers,
    recentUsers,
    totalProducts,
    pendingProducts,
    totalOrders,
    recentOrders,
    revenueOrders
  ] = await Promise.all([
    User.count(),
    User.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } } }),
    Product.count({ where: { status: 'active' } }),
    Product.count({ where: { status: 'pending' } }),
    Order.count(),
    Order.count({ where: { createdAt: { [Op.gte]: sevenDaysAgo } } }),
    Order.findAll({
      where: {
        paymentStatus: 'paid',
        createdAt: { [Op.gte]: thirtyDaysAgo }
      }
    })
  ]);

  const totalRevenue = revenueOrders.reduce((sum, order) => sum + (order.total || 0), 0);

  // Get order status distribution
  const statusCounts = {};
  const allOrders = await Order.findAll({ attributes: ['orderStatus'] });
  allOrders.forEach(order => {
    const status = order.orderStatus || 'unknown';
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

  const where = {};
  if (eventType) {
    where.eventType = eventType;
  }
  if (severity) {
    where.severity = severity;
  }
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      where.timestamp[Op.lte] = new Date(endDate);
    }
  }

  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  const events = await SecurityAuditLog.findAll({
    where,
    order: [['timestamp', 'DESC']],
    limit: limitInt,
    offset
  });

  const total = await SecurityAuditLog.count({ where });

  res.json({
    success: true,
    data: {
      events: events.map(e => e.toJSON()),
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

  const where = {};
  if (action) {
    where.action = action;
  }
  if (adminId) {
    where.adminId = adminId;
  }
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      where.timestamp[Op.lte] = new Date(endDate);
    }
  }

  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  const logs = await AdminAuditLog.findAll({
    where,
    order: [['timestamp', 'DESC']],
    limit: limitInt,
    offset
  });

  const total = await AdminAuditLog.count({ where });

  res.json({
    success: true,
    data: {
      auditLogs: logs.map(l => l.toJSON()),
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(total / limitInt),
        totalItems: total,
        itemsPerPage: limitInt
      }
    }
  });
}));

module.exports = router;
