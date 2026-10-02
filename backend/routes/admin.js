const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op, Sequelize } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin, validateAdminContext } = require('../middleware/auth');
const { User, Order, Product, AdminAuditLog, SecurityAuditLog, Notification, Vendor, Wallet, WalletTransaction, Withdrawal, EscrowRelease, Cart, CartItem, Message, Review, LogisticsRoute, StockReservation, AnalyticsEvent, PromoCampaign, sequelize } = require('../models');
const { createNotification } = require('../services/NotificationService');
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
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('role').optional().isIn(['buyer', 'vendor', 'admin', 'logistics']),
  query('status').optional().isIn(['active', 'inactive', 'suspended']),
  query('search').optional().isString().isLength({ max: 100 }),
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
  if (status === 'active') {
    where.isActive = true;
  } else if (status === 'inactive') {
    where.isActive = false;
  } else if (status === 'suspended') {
    where.isActive = false;
  }
  if (search) {
    const searchTerm = String(search).slice(0, 100);
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${searchTerm}%` } },
      { lastName: { [Op.iLike]: `%${searchTerm}%` } },
      { email: { [Op.iLike]: `%${searchTerm}%` } },
      { phoneNumber: { [Op.iLike]: `%${searchTerm}%` } }
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

  // Flatten profile JSONB into top-level for frontend compatibility
  const processedUsers = users.map(u => {
    const plain = u.toJSON();
    const profile = plain.profile || {};
    const firstName = plain.firstName || profile.firstName || null;
    const lastName = plain.lastName || profile.lastName || null;
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
    return {
      ...plain,
      displayName: fullName || profile.displayName || plain.email?.split('@')[0] || null,
      firstName,
      lastName,
      phoneNumber: plain.phoneNumber || profile.phoneNumber || profile.phone || null,
      dateOfBirth: plain.dateOfBirth || profile.dateOfBirth || profile.dob || null,
      gender: plain.gender || profile.gender || null,
      nin: plain.nin || profile.nin || profile.ninNumber || null,
      ninDocument: plain.ninDocument || profile.ninDocument || profile.ninImages || null,
      address: plain.address || profile.address || profile.streetAddress || null,
      city: plain.city || profile.city || null,
      state: plain.state || profile.state || null,
      country: plain.country || profile.country || null,
      emailVerified: plain.isEmailVerified || profile.emailVerified || false,
      phoneVerified: plain.phoneVerified || profile.phoneVerified || false,
      kycComplete: plain.kycComplete || profile.kycComplete || false,
      kycVerified: plain.kycVerified || profile.kycVerified || false,
      kycStatus: plain.kycStatus || profile.kycStatus || (profile.kycVerified ? 'verified' : 'pending'),
      vendorProfile: profile.vendorProfile || null,
      logisticsProfile: profile.logisticsProfile || null,
      vendorApproved: profile.vendorApproved || plain.vendorApproved || false,
      suspended: profile.suspended || plain.suspended || false,
      banned: profile.banned || plain.banned || false
    };
  });

  res.json({
    success: true,
    data: {
      users: processedUsers,
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
 * @route   DELETE /admin/users/:id
 * @desc    Delete a user (admin only)
 * @access  Private (admin)
 */
router.delete('/users/:id', authenticateToken, requireAdmin, validateAdminContext, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (id === req.user.id) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete your own account'
    });
  }

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Prevent deleting other admins
  if (user.role === 'admin') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete admin accounts'
    });
  }

  const userEmail = user.email;

  // Use transaction for atomicity - if any step fails, everything rolls back
  await sequelize.transaction(async (t) => {
    // Delete all related data to avoid FK constraint violations
    // Order matters: delete child tables before parent tables

    // 1. Delete escrow releases where user is vendor (before deleting orders)
    await EscrowRelease.destroy({ where: { vendorId: id }, transaction: t });

    // 2. Delete orders where user is buyer or vendor
    await Order.destroy({ where: { [Op.or]: [{ buyerId: id }, { vendorId: id }] }, transaction: t });

    // 3. Delete reviews by user
    await Review.destroy({ where: { userId: id }, transaction: t });

    // 4. Delete stock reservations by user
    await StockReservation.destroy({ where: { userId: id }, transaction: t });

    // 5. Delete messages by user (senderId)
    await Message.destroy({ where: { senderId: id }, transaction: t });

    // 6. Delete cart items via cart (must delete cart items before cart)
    const userCart = await Cart.findOne({ where: { userId: id }, transaction: t });
    if (userCart) {
      await CartItem.destroy({ where: { cartId: userCart.id }, transaction: t });
      await userCart.destroy({ transaction: t });
    }

    // 7. Delete wallet transactions
    await WalletTransaction.destroy({ where: { userId: id }, transaction: t });

    // 8. Delete withdrawals
    await Withdrawal.destroy({ where: { userId: id }, transaction: t });

    // 9. Delete wallet
    await Wallet.destroy({ where: { userId: id }, transaction: t });

    // 10. Delete products by vendor (if user is vendor)
    await Product.destroy({ where: { vendorId: id }, transaction: t });

    // 11. Delete vendor profile (if exists)
    await Vendor.destroy({ where: { userId: id }, transaction: t });

    // 12. Delete logistics routes
    await LogisticsRoute.destroy({ where: { logisticsPartnerId: id }, transaction: t });

    // 13. Delete notifications
    await Notification.destroy({ where: { userId: id }, transaction: t });

    // 14. Delete security audit logs
    await SecurityAuditLog.destroy({ where: { userId: id }, transaction: t });

    // 15. Delete analytics events
    await AnalyticsEvent.destroy({ where: { userId: id }, transaction: t });

    // 16. Log the action with correct AdminAuditLog fields
    await AdminAuditLog.create({
      adminId: req.user.id,
      adminEmail: req.user.email || 'admin',
      action: 'delete_user',
      targetUserId: id,
      targetUserEmail: userEmail,
      reason: 'User deleted by admin',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    }, { transaction: t });

    // 17. Finally delete the user
    await user.destroy({ transaction: t });
  });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

/**
 * @route   PUT /admin/users/:id/verify-kyc
 * @desc    Verify user KYC (admin only)
 * @access  Private (admin)
 */
router.put('/users/:id/verify-kyc', authenticateToken, requireAdmin, validateAdminContext, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const profile = user.profile || {};
  await user.update({
    profile: {
      ...profile,
      kycVerified: true,
      kycStatus: 'verified',
      kycVerifiedAt: new Date(),
      kycVerifiedBy: req.user.id,
      kycComplete: true
    },
    updatedAt: new Date()
  });

  // Create notification for the user
  await createNotification({
    userId: id,
    type: 'system_update',
    title: 'KYC Verified',
    message: 'Your KYC verification has been approved by the admin team.',
    data: { verifiedAt: new Date() }
  }).catch(err => console.warn('Notification creation failed:', err.message));

  // Log the action
  await AdminAuditLog.create({
    adminId: req.user.id,
    adminEmail: req.user.email || 'admin',
    action: 'verify_kyc',
    targetUserId: id,
    targetUserEmail: user.email,
    reason: 'KYC verified by admin',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  }).catch(err => console.warn('Audit log creation failed:', err.message));

  res.json({
    success: true,
    message: 'KYC verified successfully',
    data: { kycVerified: true, kycStatus: 'verified' }
  });
}));

/**
 * @route   PUT /admin/users/:id/reject-kyc
 * @desc    Reject user KYC (admin only)
 * @access  Private (admin)
 */
router.put('/users/:id/reject-kyc', authenticateToken, requireAdmin, validateAdminContext, [
  body('reason').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const user = await User.findByPk(id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const profile = user.profile || {};
  await user.update({
    profile: {
      ...profile,
      kycVerified: false,
      kycStatus: 'rejected',
      kycRejectedAt: new Date(),
      kycRejectedBy: req.user.id,
      kycRejectionReason: reason || 'Rejected by admin',
      kycComplete: false
    },
    updatedAt: new Date()
  });

  // Create notification for the user
  await createNotification({
    userId: id,
    type: 'system_update',
    title: 'KYC Rejected',
    message: reason || 'Your KYC verification was rejected. Please update your documents and try again.',
    data: { rejectedAt: new Date(), reason }
  }).catch(err => console.warn('Notification creation failed:', err.message));

  // Log the action
  await AdminAuditLog.create({
    adminId: req.user.id,
    adminEmail: req.user.email || 'admin',
    action: 'reject_kyc',
    targetUserId: id,
    targetUserEmail: user.email,
    reason: reason || 'KYC rejected by admin',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  }).catch(err => console.warn('Audit log creation failed:', err.message));

  res.json({
    success: true,
    message: 'KYC rejected',
    data: { kycVerified: false, kycStatus: 'rejected' }
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
  await createNotification({
    userId: id,
    type: 'system_update',
    title: `Account ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your account has been ${status}${reason ? ': ' + reason : ''}`
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
  query('limit').optional().isInt({ min: 1, max: 1000 }),
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
    where.status = status;
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
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'out_of_stock']),
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

  if (productData.status === 'approved') {
    throw new AppError('Product is already approved', 400);
  }

  await product.update({
    status: 'approved',
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
  await createNotification({
    userId: productData.vendorId,
    type: 'system_update',
    title: 'Product Approved',
    message: `Your product "${productData.name}" has been approved and is now live`,
    data: { productId: id },
    productId: id,
    productName: productData.name
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
  await createNotification({
    userId: productData.vendorId,
    type: 'system_update',
    title: 'Product Rejected',
    message: `Your product "${productData.name}" has been rejected: ${reason}`,
    data: { productId: id, reason },
    productId: id,
    productName: productData.name
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
    Product.count({ where: { status: 'approved' } }),
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
  const allOrders = await Order.findAll({ attributes: ['status'] });
  allOrders.forEach(order => {
    const status = order.status || 'unknown';
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

  const events = await SecurityAuditLog.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: limitInt,
    offset
  });

  const total = await SecurityAuditLog.count({ where });

  const serialized = events.map(e => e.toJSON());
  res.json({
    success: true,
    events: serialized,
    data: {
      events: serialized,
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
 * @route   GET /admin/security/summary
 * @desc    Aggregate security stats (admin only)
 * @access  Private (admin)
 */
router.get('/security/summary', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const events = await SecurityAuditLog.findAll({
    where: { createdAt: { [Op.gte]: since } },
    attributes: ['eventType', 'severity'],
    raw: true
  });

  const byType = {};
  const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const e of events) {
    byType[e.eventType] = (byType[e.eventType] || 0) + 1;
    if (e.severity && bySeverity[e.severity] !== undefined) bySeverity[e.severity]++;
  }

  res.json({
    success: true,
    summary: {
      windowDays: 30,
      totalEvents: events.length,
      byType,
      bySeverity,
      criticalCount: bySeverity.critical + bySeverity.high
    }
  });
}));

/**
 * @route   GET /admin/security/failed-logins
 * @desc    Recent failed login attempts (admin only)
 * @access  Private (admin)
 */
router.get('/security/failed-logins', authenticateToken, requireAdmin, [
  query('limit').optional().isInt({ min: 1, max: 500 }),
  query('page').optional().isInt({ min: 1 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const limitInt = Math.min(parseInt(req.query.limit, 10) || 50, 500);
  const pageInt = parseInt(req.query.page, 10) || 1;

  const failedLogins = await SecurityAuditLog.findAll({
    where: {
      eventType: { [Op.in]: ['failed_login', 'login_failed', 'FAILED_LOGIN', 'auth_failure'] }
    },
    order: [['createdAt', 'DESC']],
    limit: limitInt,
    offset: (pageInt - 1) * limitInt
  });

  res.json({
    success: true,
    failedLogins: failedLogins.map(e => e.toJSON()),
    data: failedLogins.map(e => e.toJSON()),
    total: failedLogins.length
  });
}));

/* ---------------- Promo campaigns ---------------- */

router.get('/promo-campaigns', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const items = await PromoCampaign.findAll({ order: [['createdAt', 'DESC']], limit: 200 });
  res.json({ success: true, items, data: items, total: items.length });
}));

router.post('/promo-campaigns/create', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { name, description, startDate, endDate, discountConfig = {}, status = 'draft' } = req.body;
  if (!name) throw new AppError('Campaign name is required', 400);

  const campaign = await PromoCampaign.create({
    name, description, startDate, endDate, discountConfig, status,
    createdBy: req.user.id,
    metadata: { ...req.body }
  });
  res.status(201).json({ success: true, data: campaign, campaign });
}));

router.post('/promo-campaigns/:id/update', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const campaign = await PromoCampaign.findByPk(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);

  const updates = {};
  for (const k of ['name', 'description', 'status', 'startDate', 'endDate', 'discountConfig']) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  await campaign.update(updates);
  res.json({ success: true, data: campaign, campaign });
}));

router.post('/promo-campaigns/:id/vendor-participation', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const campaign = await PromoCampaign.findByPk(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);

  const { vendorId, action = 'add' } = req.body;
  const vendorIds = Array.isArray(campaign.vendorIds) ? [...campaign.vendorIds] : [];
  if (action === 'remove') {
    await campaign.update({ vendorIds: vendorIds.filter(v => v !== vendorId) });
  } else if (vendorId && !vendorIds.includes(vendorId)) {
    vendorIds.push(vendorId);
    await campaign.update({ vendorIds });
  }
  res.json({ success: true, data: campaign, campaign });
}));

router.post('/promo-campaigns/:id/vendors', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const campaign = await PromoCampaign.findByPk(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);

  const vendorIds = Array.isArray(campaign.vendorIds) ? campaign.vendorIds : [];
  const vendors = vendorIds.length
    ? await User.findAll({ where: { id: vendorIds }, attributes: ['id', 'email', 'profile'] })
    : [];
  res.json({ success: true, items: vendors, data: vendors, total: vendors.length });
}));

router.post('/promo-campaigns/:id/notify-vendors', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const campaign = await PromoCampaign.findByPk(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);

  const vendorIds = Array.isArray(campaign.vendorIds) && campaign.vendorIds.length
    ? campaign.vendorIds
    : (await User.findAll({ where: { role: 'vendor' }, attributes: ['id'] })).map(u => u.id);

  let notified = 0;
  for (const vendorId of vendorIds) {
    try {
      await createNotification({
        userId: vendorId,
        type: 'promotion',
        title: `Promo campaign: ${campaign.name}`,
        message: campaign.description || `You are invited to join the "${campaign.name}" campaign.`,
        data: { campaignId: campaign.id },
        skipPush: true
      });
      notified++;
    } catch (e) { /* best-effort */ }
  }
  res.json({ success: true, notified });
}));

router.post('/promo-campaigns/:id/apply-to-product', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const campaign = await PromoCampaign.findByPk(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);

  const { productId, discountConfig } = req.body;
  if (!productId) throw new AppError('productId is required', 400);

  const product = await Product.findByPk(productId);
  if (!product) throw new AppError('Product not found', 404);

  const productIds = Array.isArray(campaign.productIds) ? [...campaign.productIds] : [];
  if (!productIds.includes(productId)) productIds.push(productId);

  const meta = { ...(product.metadata || product.dataValues?.metadata || {}) };
  meta.promo = { campaignId: campaign.id, discountConfig: discountConfig || campaign.discountConfig };
  try {
    await product.update({ metadata: meta });
  } catch (e) { /* product model may not expose metadata */ }

  await campaign.update({ productIds });
  res.json({ success: true, data: campaign, campaign });
}));

router.post('/promo-campaigns/:id/remove-from-product', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const campaign = await PromoCampaign.findByPk(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);

  const { productId } = req.body;
  const productIds = (Array.isArray(campaign.productIds) ? campaign.productIds : []).filter(p => p !== productId);
  await campaign.update({ productIds });
  res.json({ success: true, data: campaign, campaign });
}));

router.post('/promo-campaigns/:id/compliance', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const campaign = await PromoCampaign.findByPk(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);

  res.json({
    success: true,
    data: {
      campaignId: campaign.id,
      compliant: true,
      checks: {
        hasDates: !!(campaign.startDate && campaign.endDate),
        hasDiscount: !!(campaign.discountConfig && Object.keys(campaign.discountConfig).length),
        vendorCount: (campaign.vendorIds || []).length,
        productCount: (campaign.productIds || []).length
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

/**
 * @route   GET /api/admin/contacts
 * @desc    Get all contacts (buyers, vendors, logistics, guests) for admin dashboard
 * @access  Private (admin)
 */
router.get('/contacts', authenticateToken, requireAdmin, [
  query('type').optional().isIn(['all', 'buyers', 'vendors', 'logistics', 'guests']),
  query('search').optional().isString().isLength({ max: 100 }),
  query('export').optional().isBoolean(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { type = 'all', search, export: isExport } = req.query;

  const contacts = [];

  // --- Registered users (buyers, vendors, logistics) ---
  const userWhere = {};
  if (type === 'buyers') {
    userWhere.role = 'buyer';
  } else if (type === 'vendors') {
    userWhere.role = 'vendor';
  } else if (type === 'logistics') {
    userWhere.role = 'logistics';
  } else if (type === 'guests') {
    // Skip user query entirely for guests-only
  } else {
    // 'all' — fetch all roles
  }

  if (search && type !== 'guests') {
    const searchTerm = String(search).slice(0, 100);
    userWhere[Op.or] = [
      { firstName: { [Op.iLike]: `%${searchTerm}%` } },
      { lastName: { [Op.iLike]: `%${searchTerm}%` } },
      { email: { [Op.iLike]: `%${searchTerm}%` } },
      { phoneNumber: { [Op.iLike]: `%${searchTerm}%` } }
    ];
  }

  if (type !== 'guests') {
    const users = await User.findAll({
      where: userWhere,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      ...(isExport === 'true' ? {} : { limit: 500 })
    });

    for (const user of users) {
      const profile = user.profile || {};
      contacts.push({
        id: user.id,
        type: user.role,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || profile.displayName || 'N/A',
        email: user.email,
        phone: user.phoneNumber || profile.phone || 'N/A',
        businessName: profile.businessName || profile.vendorProfile?.businessName || 'N/A',
        address: profile.address || profile.vendorProfile?.businessAddress || 'N/A',
        city: profile.city || 'N/A',
        state: profile.state || 'N/A',
        country: profile.country || 'Nigeria',
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        source: 'registered'
      });
    }
  }

  // --- Guest contacts from orders ---
  if (type === 'all' || type === 'guests') {
    const guestWhere = { isGuest: true };
    if (search) {
      const searchTerm = String(search).slice(0, 100);
      guestWhere[Op.or] = [
        { guestEmail: { [Op.iLike]: `%${searchTerm}%` } },
        { guestPhone: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    const guestOrders = await Order.findAll({
      where: guestWhere,
      attributes: ['guestEmail', 'guestPhone', 'shippingAddress', 'createdAt', 'orderNumber'],
      order: [['createdAt', 'DESC']],
      ...(isExport === 'true' ? {} : { limit: 500 }),
      group: ['guestEmail']
    });

    for (const order of guestOrders) {
      const addr = order.shippingAddress || {};
      contacts.push({
        id: `guest_${order.guestEmail}`,
        type: 'guest',
        name: 'Guest Customer',
        email: order.guestEmail || 'N/A',
        phone: order.guestPhone || 'N/A',
        businessName: 'N/A',
        address: addr.line1 || 'N/A',
        city: addr.city || 'N/A',
        state: addr.state || 'N/A',
        country: addr.country || 'Nigeria',
        isActive: true,
        isEmailVerified: false,
        createdAt: order.createdAt,
        source: 'guest_order',
        lastOrderNumber: order.orderNumber
      });
    }
  }

  // Sort by most recent first
  contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // If export=true, return flat array for CSV generation
  if (isExport === 'true') {
    return res.json({
      success: true,
      data: contacts
    });
  }

  res.json({
    success: true,
    data: contacts,
    summary: {
      total: contacts.length,
      buyers: contacts.filter(c => c.type === 'buyer').length,
      vendors: contacts.filter(c => c.type === 'vendor').length,
      logistics: contacts.filter(c => c.type === 'logistics').length,
      guests: contacts.filter(c => c.type === 'guest').length,
    }
  });
}));

/* ---------------- Admin analytics (used by AdminAnalyticsDashboard) ---------------- */

/**
 * @route   GET /api/admin/analytics/summary
 * @desc    Revenue/payment/vendor summary for admin analytics page
 * @access  Private (admin)
 */
router.get('/analytics/summary', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const period = (req.query.period || '30d').toString();
  const days = period === '7d' ? 7 : period === '90d' ? 90 : period === 'year' ? 365 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [orders, vendors] = await Promise.all([
    Order.findAll({ where: { createdAt: { [Op.gte]: since } }, attributes: ['totalAmount', 'paymentStatus', 'refundStatus', 'refundAmount', 'createdAt'], raw: true }),
    User.findAll({ where: { role: 'vendor' }, attributes: ['isActive', 'isEmailVerified', 'profile'], raw: true })
  ]);

  const paid = orders.filter(o => ['paid', 'escrow_funded'].includes(o.paymentStatus));
  const failed = orders.filter(o => o.paymentStatus === 'failed');
  const refunded = orders.filter(o => o.refundStatus === 'refunded');
  const refundAmount = refunded.reduce((s, o) => s + parseFloat(o.refundAmount || o.totalAmount || 0), 0);

  const failureReasons = {};
  for (const o of failed) {
    const r = o.failureReason || 'payment_failed';
    failureReasons[r] = (failureReasons[r] || 0) + 1;
  }

  // Revenue by day
  const byCycle = {};
  for (const o of paid) {
    const d = new Date(o.createdAt).toISOString().slice(0, 10);
    byCycle[d] = (byCycle[d] || 0) + parseFloat(o.totalAmount || 0);
  }

  res.json({
    success: true,
    summary: {
      revenue: {
        total: paid.reduce((s, o) => s + parseFloat(o.totalAmount || 0), 0),
        orderCount: paid.length,
        byPlan: {},
        byCycle
      },
      payments: {
        totalAttempts: orders.length,
        successCount: paid.length,
        successRate: orders.length ? paid.length / orders.length : 0,
        failureReasons,
        refundAmount,
        refundCount: refunded.length
      },
      vendors: {
        registeredCount: vendors.length,
        approvedCount: vendors.filter(v => v.isActive !== false).length,
        suspendedCount: vendors.filter(v => v.isActive === false).length,
        activationRate: vendors.length ? vendors.filter(v => v.isEmailVerified).length / vendors.length : 0,
        topPlans: {}
      }
    }
  });
}));

/**
 * @route   GET /api/admin/analytics/events
 * @desc    Raw analytics event feed for admin analytics page
 * @access  Private (admin)
 */
router.get('/analytics/events', authenticateToken, requireAdmin, [
  query('eventType').optional().isString(),
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate(),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.eventType && req.query.eventType !== 'all') {
    where[Op.or] = [{ name: req.query.eventType }, { category: req.query.eventType }];
  }
  if (req.query.startDate || req.query.endDate) {
    where.createdAt = {};
    if (req.query.startDate) where.createdAt[Op.gte] = new Date(req.query.startDate);
    if (req.query.endDate) where.createdAt[Op.lte] = new Date(req.query.endDate);
  }

  const rows = await AnalyticsEvent.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Math.min(parseInt(req.query.limit, 10) || 50, 500)
  });

  res.json({
    success: true,
    events: rows.map(e => ({
      id: e.id,
      timestamp: e.createdAt,
      userId: e.userId,
      eventType: e.name,
      category: e.category,
      action: e.action,
      label: e.label,
      data: e.metadata || {}
    }))
  });
}));

/**
 * @route   GET /api/admin/analytics/audit
 * @desc    Admin audit log feed for admin analytics page
 * @access  Private (admin)
 */
router.get('/analytics/audit', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const rows = await AdminAuditLog.findAll({
    order: [['createdAt', 'DESC']],
    limit: Math.min(parseInt(req.query.limit, 10) || 20, 200)
  });

  res.json({
    success: true,
    logs: rows.map(l => ({
      id: l.id,
      timestamp: l.createdAt,
      adminId: l.adminId,
      adminEmail: l.adminEmail,
      action: l.action,
      targetType: l.targetUserId ? 'user' : l.targetProductId ? 'product' : l.vendorId ? 'vendor' : 'system',
      targetId: l.targetUserId || l.targetProductId || l.vendorId || null,
      reason: l.reason,
      metadata: l.metadata
    }))
  });
}));

module.exports = router;
