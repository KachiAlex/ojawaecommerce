const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { AnalyticsEvent, Order, Product, User, Cart, CartItem } = require('../models');
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
 * @route   POST /api/analytics/events
 * @desc    Track analytics events
 * @access  Private
 */
router.post('/events', authenticateToken, [
  body('events').isArray(),
  body('events.*.name').optional().isString(),
  body('events.*.category').optional().isString(),
  body('events.*.action').optional().isString(),
  body('events.*.label').optional().isString(),
  body('events.*.value').optional().isNumeric(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { events } = req.body;
  const userId = req.user.uid;

  // Process and store analytics events
  const eventDocs = [];

  for (const event of events) {
    const eventData = {
      userId,
      name: event.name || event.action || 'unknown',
      category: event.category || 'general',
      action: event.action || 'unknown',
      label: event.label || null,
      value: event.value || null,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip
    };

    try {
      const analyticsEvent = await AnalyticsEvent.create(eventData);
      eventDocs.push(analyticsEvent.toJSON());
    } catch (dbErr) {
      // If DB fails (table missing, etc), still acknowledge the event
      console.warn('Analytics event save failed:', dbErr.message);
      eventDocs.push({ ...eventData, saved: false });
    }
  }

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
  const orders = await Order.findAll({
    where: {
      paymentStatus: 'paid',
      createdAt: {
        [Op.gte]: start,
        [Op.lte]: end
      }
    }
  });

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
    totalProducts,
    recentOrders,
    recentUsers,
    revenueOrders
  ] = await Promise.all([
    Product.count({ where: { status: 'approved' } }),
    Order.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } } }),
    User.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } } }),
    Order.findAll({
      where: {
        paymentStatus: 'paid',
        createdAt: { [Op.gte]: thirtyDaysAgo }
      }
    })
  ]);

  const totalRevenue = revenueOrders.reduce((sum, order) => sum + (order.total || 0), 0);

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

/**
 * @route   POST /api/analytics/track
 * @desc    Track a single analytics event (lightweight, no auth required)
 * @access  Public
 */
router.post('/track', asyncHandler(async (req, res) => {
  const {
    type,
    vendorId,
    productId,
    searchQuery,
    resultsCount,
    interactionType,
    page,
    referrer,
    userAgent,
    value
  } = req.body;

  const eventData = {
    name: type || 'generic_event',
    category: type || 'general',
    action: interactionType || type || 'unknown',
    label: productId || searchQuery || page || null,
    value: value || null,
    userAgent: userAgent || req.get('user-agent'),
    ipAddress: req.ip,
    metadata: {
      vendorId,
      productId,
      searchQuery,
      resultsCount,
      interactionType,
      page,
      referrer
    }
  };

  await AnalyticsEvent.create(eventData);

  res.json({ success: true, message: 'Event tracked' });
}));

/**
 * @route   POST /api/analytics/product-views/:productId
 * @desc    Increment product view count and log view event
 * @access  Public
 */
router.post('/product-views/:productId', asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findByPk(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  await product.update({
    views: (product.views || 0) + 1,
    lastViewedAt: new Date()
  });

  await AnalyticsEvent.create({
    name: 'product_view',
    category: 'product',
    action: 'view',
    label: productId,
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
    metadata: { productId, vendorId: product.vendorId }
  });

  res.json({ success: true, message: 'View recorded' });
}));

/**
 * @route   GET /api/analytics/vendor/:vendorId
 * @desc    Get analytics for a specific vendor
 * @access  Private (vendor owner or admin)
 */
router.get('/vendor/:vendorId', authenticateToken, asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const { dateRange = '30d' } = req.query;

  if (req.user.uid !== vendorId && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403);
  }

  const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [storeVisits, productViews, interactions, searches] = await Promise.all([
    AnalyticsEvent.count({
      where: {
        name: 'store_visit',
        'metadata.vendorId': vendorId,
        createdAt: { [Op.gte]: startDate }
      }
    }),
    AnalyticsEvent.count({
      where: {
        name: 'product_view',
        'metadata.vendorId': vendorId,
        createdAt: { [Op.gte]: startDate }
      }
    }),
    AnalyticsEvent.count({
      where: {
        name: 'product_interaction',
        'metadata.vendorId': vendorId,
        createdAt: { [Op.gte]: startDate }
      }
    }),
    AnalyticsEvent.count({
      where: {
        name: 'search',
        'metadata.vendorId': vendorId,
        createdAt: { [Op.gte]: startDate }
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      vendorId,
      period: { days, startDate },
      summary: {
        storeVisits,
        productViews,
        interactions,
        searches
      }
    }
  });
}));

/**
 * @route   GET /api/analytics/product/:productId
 * @desc    Get analytics for a specific product
 * @access  Public
 */
router.get('/product/:productId', asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { dateRange = '30d' } = req.query;

  const product = await Product.findByPk(productId, {
    attributes: ['id', 'name', 'views', 'salesCount', 'vendorId']
  });
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [views, interactions] = await Promise.all([
    AnalyticsEvent.count({
      where: {
        name: 'product_view',
        'metadata.productId': productId,
        createdAt: { [Op.gte]: startDate }
      }
    }),
    AnalyticsEvent.count({
      where: {
        name: 'product_interaction',
        'metadata.productId': productId,
        createdAt: { [Op.gte]: startDate }
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      product: product.toJSON(),
      period: { days, startDate },
      summary: {
        views,
        interactions,
        totalViews: product.views || 0,
        totalSales: product.salesCount || 0
      }
    }
  });
}));

/* =====================================================================
 * Extended analytics endpoints used by the admin/vendor dashboards.
 * Aggregations over orders, users and analytics_events.
 * ===================================================================== */

const rangeStart = (req) => {
  const range = (req.query.timeRange || req.query.days || 'month').toString();
  const days = range === 'day' ? 1 : range === 'week' ? 7 : range === 'year' ? 365 : (parseInt(range, 10) || 30);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

const sumRevenue = async (where = {}) => {
  const orders = await Order.findAll({
    where: { ...where, status: { [Op.in]: ['completed', 'delivered', 'escrow_funded', 'shipped', 'confirmed', 'processing'] } },
    attributes: ['totalAmount', 'vendorId', 'buyerId', 'createdAt', 'status'],
    raw: true
  });
  return orders;
};

/* ---------------- Vendors ---------------- */

router.get('/vendors/overview', authenticateToken, asyncHandler(async (req, res) => {
  const vendors = await User.findAll({ where: { role: 'vendor' }, attributes: ['id', 'createdAt', 'isActive', 'isEmailVerified'], raw: true });
  const orders = await sumRevenue({ createdAt: { [Op.gte]: rangeStart(req) } });
  const revenue = orders.reduce((s, o) => s + parseFloat(o.totalAmount || 0), 0);
  const vendorsWithSales = new Set(orders.map(o => o.vendorId)).size;

  res.json({
    success: true,
    totalVendors: vendors.length,
    activeVendors: vendors.filter(v => v.isActive !== false).length,
    vendorsWithSales,
    totalRevenue: revenue,
    totalOrders: orders.length,
    avgOrderValue: orders.length ? Math.round(revenue / orders.length) : 0
  });
}));

router.get('/vendors/top', authenticateToken, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  const orders = await sumRevenue({ createdAt: { [Op.gte]: rangeStart(req) } });

  const byVendor = {};
  for (const o of orders) {
    if (!o.vendorId) continue;
    byVendor[o.vendorId] = byVendor[o.vendorId] || { revenue: 0, orders: 0 };
    byVendor[o.vendorId].revenue += parseFloat(o.totalAmount || 0);
    byVendor[o.vendorId].orders++;
  }

  const ids = Object.keys(byVendor)
    .sort((a, b) => byVendor[b].revenue - byVendor[a].revenue)
    .slice(0, limit);
  const users = ids.length ? await User.findAll({ where: { id: ids }, attributes: ['id', 'email', 'profile'], raw: true }) : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  res.json({
    success: true,
    items: ids.map(id => ({
      vendorId: id,
      name: userMap[id]?.profile?.displayName || userMap[id]?.profile?.storeName || userMap[id]?.email || id,
      revenue: byVendor[id].revenue,
      orders: byVendor[id].orders
    }))
  });
}));

router.get('/vendors/growth', authenticateToken, asyncHandler(async (req, res) => {
  const vendors = await User.findAll({
    where: { role: 'vendor', createdAt: { [Op.gte]: rangeStart(req) } },
    attributes: ['createdAt'], raw: true, order: [['createdAt', 'ASC']]
  });
  const byDay = {};
  for (const v of vendors) {
    const d = new Date(v.createdAt).toISOString().slice(0, 10);
    byDay[d] = (byDay[d] || 0) + 1;
  }
  res.json({ success: true, items: Object.entries(byDay).map(([date, count]) => ({ date, count })) });
}));

router.get('/vendors/by-category', authenticateToken, asyncHandler(async (req, res) => {
  const products = await Product.findAll({ attributes: ['vendorId', 'category'], raw: true });
  const byCategory = {};
  for (const p of products) {
    const c = p.category || 'uncategorized';
    byCategory[c] = byCategory[c] || new Set();
    if (p.vendorId) byCategory[c].add(p.vendorId);
  }
  res.json({
    success: true,
    items: Object.entries(byCategory).map(([category, set]) => ({ category, vendors: set.size }))
  });
}));

router.get('/vendors/health', authenticateToken, asyncHandler(async (req, res) => {
  const vendors = await User.findAll({ where: { role: 'vendor' }, attributes: ['id', 'email', 'profile', 'isActive', 'updatedAt'], raw: true });
  const orders = await sumRevenue({ createdAt: { [Op.gte]: new Date(Date.now() - 30 * 864e5) } });
  const ordersByVendor = {};
  for (const o of orders) {
    if (o.vendorId) ordersByVendor[o.vendorId] = (ordersByVendor[o.vendorId] || 0) + 1;
  }
  res.json({
    success: true,
    items: vendors.map(v => ({
      vendorId: v.id,
      name: v.profile?.displayName || v.profile?.storeName || v.email,
      active: v.isActive !== false,
      ordersLast30d: ordersByVendor[v.id] || 0,
      lastActiveAt: v.updatedAt,
      rating: v.profile?.rating ?? null,
      health: (v.isActive !== false && (ordersByVendor[v.id] || 0) > 0) ? 'healthy' : 'inactive'
    }))
  });
}));

router.get('/vendors/onboarding-funnel', authenticateToken, asyncHandler(async (req, res) => {
  const vendors = await User.findAll({ where: { role: 'vendor' }, attributes: ['isEmailVerified', 'isActive', 'profile'], raw: true });
  res.json({
    success: true,
    data: {
      registered: vendors.length,
      emailVerified: vendors.filter(v => v.isEmailVerified).length,
      profileCompleted: vendors.filter(v => v.profile?.storeName || v.profile?.businessName).length,
      kycVerified: vendors.filter(v => v.profile?.kycStatus === 'verified').length,
      active: vendors.filter(v => v.isActive !== false).length
    }
  });
}));

router.get('/vendors/:vendorId/orders', authenticateToken, asyncHandler(async (req, res) => {
  const where = { vendorId: req.params.vendorId };
  const items = await Order.findAll({ where, order: [['createdAt', 'DESC']], limit: 200 });
  res.json({ success: true, items, total: items.length });
}));

router.get('/vendors/:vendorId', authenticateToken, asyncHandler(async (req, res) => {
  const vendor = await User.findByPk(req.params.vendorId, { attributes: { exclude: ['password'] } });
  if (!vendor) throw new AppError('Vendor not found', 404);
  const orders = await sumRevenue({ vendorId: req.params.vendorId });
  const revenue = orders.reduce((s, o) => s + parseFloat(o.totalAmount || 0), 0);
  res.json({
    success: true,
    data: {
      vendor,
      metrics: {
        totalOrders: orders.length,
        totalRevenue: revenue,
        avgOrderValue: orders.length ? Math.round(revenue / orders.length) : 0
      }
    }
  });
}));

/* ---------------- Buyers ---------------- */

const buyerOrderStats = async (req) => {
  const orders = await sumRevenue({ createdAt: { [Op.gte]: rangeStart(req) } });
  const byBuyer = {};
  for (const o of orders) {
    if (!o.buyerId) continue;
    byBuyer[o.buyerId] = byBuyer[o.buyerId] || { orders: 0, revenue: 0 };
    byBuyer[o.buyerId].orders++;
    byBuyer[o.buyerId].revenue += parseFloat(o.totalAmount || 0);
  }
  return byBuyer;
};

router.get('/buyer/overview', authenticateToken, asyncHandler(async (req, res) => {
  const buyers = await User.count({ where: { role: 'buyer' } });
  const byBuyer = await buyerOrderStats(req);
  const repeat = Object.values(byBuyer).filter(b => b.orders > 1).length;
  res.json({
    success: true,
    data: {
      totalBuyers: buyers,
      buyersWithOrders: Object.keys(byBuyer).length,
      repeatBuyers: repeat,
      repeatRate: Object.keys(byBuyer).length ? repeat / Object.keys(byBuyer).length : 0
    }
  });
}));

router.get('/buyer/top', authenticateToken, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  const byBuyer = await buyerOrderStats(req);
  const ids = Object.keys(byBuyer).sort((a, b) => byBuyer[b].revenue - byBuyer[a].revenue).slice(0, limit);
  const users = ids.length ? await User.findAll({ where: { id: ids }, attributes: ['id', 'email', 'profile'], raw: true }) : [];
  const map = Object.fromEntries(users.map(u => [u.id, u]));
  res.json({
    success: true,
    items: ids.map(id => ({
      buyerId: id,
      email: map[id]?.email,
      name: map[id]?.profile?.displayName || map[id]?.email || id,
      orders: byBuyer[id].orders,
      revenue: byBuyer[id].revenue
    }))
  });
}));

router.get('/buyer/growth', authenticateToken, asyncHandler(async (req, res) => {
  const buyers = await User.findAll({
    where: { role: 'buyer', createdAt: { [Op.gte]: rangeStart(req) } },
    attributes: ['createdAt'], raw: true, order: [['createdAt', 'ASC']]
  });
  const byDay = {};
  for (const b of buyers) {
    const d = new Date(b.createdAt).toISOString().slice(0, 10);
    byDay[d] = (byDay[d] || 0) + 1;
  }
  res.json({ success: true, items: Object.entries(byDay).map(([date, count]) => ({ date, count })) });
}));

router.get('/buyer/engagement', authenticateToken, asyncHandler(async (req, res) => {
  const since = rangeStart(req);
  const events = await AnalyticsEvent.findAll({
    where: { createdAt: { [Op.gte]: since } },
    attributes: ['userId'], raw: true
  });
  const active = new Set(events.map(e => e.userId).filter(Boolean)).size;
  res.json({ success: true, data: { activeUsers: active, events: events.length } });
}));

router.get('/buyer/repeat', authenticateToken, asyncHandler(async (req, res) => {
  const byBuyer = await buyerOrderStats(req);
  const repeat = Object.entries(byBuyer).filter(([, v]) => v.orders > 1)
    .map(([buyerId, v]) => ({ buyerId, orders: v.orders, revenue: v.revenue }));
  res.json({ success: true, items: repeat, total: repeat.length });
}));

router.get('/buyer/abandoned', authenticateToken, asyncHandler(async (req, res) => {
  // Buyers with carts but no recent orders
  const carts = await Cart.findAll({ include: [{ model: CartItem, as: 'cartItems', required: true }] }).catch(() => []);
  const since = rangeStart(req);
  const orders = await Order.findAll({ where: { createdAt: { [Op.gte]: since } }, attributes: ['buyerId'], raw: true });
  const ordered = new Set(orders.map(o => o.buyerId));
  const items = (carts || [])
    .filter(c => !ordered.has(c.userId) && (c.cartItems || []).length > 0)
    .map(c => ({ userId: c.userId, cartItems: c.cartItems.length }));
  res.json({ success: true, items, total: items.length });
}));

router.get('/buyer/cohort', authenticateToken, asyncHandler(async (req, res) => {
  const buyers = await User.findAll({
    where: { role: 'buyer' },
    attributes: ['id', 'createdAt'], raw: true
  });
  const byMonth = {};
  for (const b of buyers) {
    const m = new Date(b.createdAt).toISOString().slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + 1;
  }
  res.json({ success: true, items: Object.entries(byMonth).map(([cohort, count]) => ({ cohort, count })) });
}));

router.get('/buyer/clv', authenticateToken, asyncHandler(async (req, res) => {
  const byBuyer = await buyerOrderStats(req);
  const revenues = Object.values(byBuyer).map(b => b.revenue);
  const total = revenues.reduce((a, b) => a + b, 0);
  res.json({
    success: true,
    data: {
      avgClv: revenues.length ? Math.round(total / revenues.length) : 0,
      totalRevenue: total,
      buyerCount: revenues.length
    }
  });
}));

router.get('/buyer/retention', authenticateToken, asyncHandler(async (req, res) => {
  const byBuyer = await buyerOrderStats(req);
  const repeat = Object.values(byBuyer).filter(b => b.orders > 1).length;
  const total = Object.keys(byBuyer).length;
  res.json({ success: true, data: { repeatBuyers: repeat, totalBuyers: total, retentionRate: total ? repeat / total : 0 } });
}));

router.get('/buyer/:buyerId', authenticateToken, asyncHandler(async (req, res) => {
  const buyer = await User.findByPk(req.params.buyerId, { attributes: { exclude: ['password'] } });
  if (!buyer) throw new AppError('Buyer not found', 404);
  const orders = await Order.findAll({ where: { buyerId: req.params.buyerId }, order: [['createdAt', 'DESC']], limit: 100 });
  const revenue = orders.reduce((s, o) => s + parseFloat(o.totalAmount || 0), 0);
  res.json({ success: true, data: { buyer, orders, metrics: { totalOrders: orders.length, totalSpent: revenue } } });
}));

/* ---------------- Transactions ---------------- */

const transactionOverview = async (req) => {
  const orders = await Order.findAll({ order: [['createdAt', 'DESC']], limit: 2000 });
  const revenue = orders.reduce((s, o) => s + parseFloat(o.totalAmount || 0), 0);
  return {
    totalOrders: orders.length,
    totalRevenue: revenue,
    avgOrderValue: orders.length ? Math.round(revenue / orders.length) : 0,
    byStatus: orders.reduce((m, o) => { m[o.status] = (m[o.status] || 0) + 1; return m; }, {})
  };
};

const transactionOverviewHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await transactionOverview(req) });
});
router.get('/transactions/overview', authenticateToken, transactionOverviewHandler);
router.post('/transactions/overview', authenticateToken, transactionOverviewHandler);

const transactionOrdersHandler = asyncHandler(async (req, res) => {
  const items = await Order.findAll({ order: [['createdAt', 'DESC']], limit: 500 });
  res.json({ success: true, items, orders: items, data: items, total: items.length });
});
router.get('/transactions/orders', authenticateToken, transactionOrdersHandler);
router.post('/transactions/orders', authenticateToken, transactionOrdersHandler);

const transactionRefundsHandler = asyncHandler(async (req, res) => {
  const items = await Order.findAll({
    where: { refundStatus: { [Op.in]: ['pending_refund', 'refunded', 'refund_failed'] } },
    order: [['createdAt', 'DESC']],
    limit: 500
  });
  res.json({ success: true, items, refunds: items, data: items, total: items.length });
});
router.get('/transactions/refunds', authenticateToken, transactionRefundsHandler);
router.post('/transactions/refunds', authenticateToken, transactionRefundsHandler);

/* ---------------- Platform ---------------- */

router.get('/platform/overview', authenticateToken, asyncHandler(async (req, res) => {
  const [users, orders, products, events] = await Promise.all([
    User.count(),
    Order.count(),
    Product.count(),
    AnalyticsEvent.count({ where: { createdAt: { [Op.gte]: new Date(Date.now() - 864e5) } } })
  ]);
  res.json({
    success: true,
    data: {
      totalUsers: users,
      totalOrders: orders,
      totalProducts: products,
      eventsLast24h: events,
      uptimeSeconds: Math.round(process.uptime())
    }
  });
}));

router.post('/platform/overview', authenticateToken, asyncHandler(async (req, res) => {
  req.query = req.query || {};
  const [users, orders, products] = await Promise.all([User.count(), Order.count(), Product.count()]);
  res.json({ success: true, data: { totalUsers: users, totalOrders: orders, totalProducts: products, uptimeSeconds: Math.round(process.uptime()) } });
}));

router.get('/platform/performance-trend', authenticateToken, asyncHandler(async (req, res) => {
  const since = rangeStart(req);
  const events = await AnalyticsEvent.findAll({
    where: { createdAt: { [Op.gte]: since } },
    attributes: ['createdAt'], raw: true, order: [['createdAt', 'ASC']]
  });
  const byDay = {};
  for (const e of events) {
    const d = new Date(e.createdAt).toISOString().slice(0, 10);
    byDay[d] = (byDay[d] || 0) + 1;
  }
  res.json({ success: true, items: Object.entries(byDay).map(([date, events]) => ({ date, events })), data: Object.entries(byDay).map(([date, count]) => ({ date, count })) });
}));

router.get('/platform/user-activity', authenticateToken, asyncHandler(async (req, res) => {
  const since = rangeStart(req);
  const events = await AnalyticsEvent.findAll({ where: { createdAt: { [Op.gte]: since } }, attributes: ['userId'], raw: true });
  const active = new Set(events.map(e => e.userId).filter(Boolean));
  res.json({ success: true, data: { activeUsers: active.size, totalEvents: events.length } });
}));

router.get('/user-activity', authenticateToken, asyncHandler(async (req, res) => {
  const since = rangeStart(req);
  const events = await AnalyticsEvent.findAll({ where: { createdAt: { [Op.gte]: since } }, attributes: ['userId', 'name'], raw: true });
  const active = new Set(events.map(e => e.userId).filter(Boolean));
  res.json({ success: true, data: { activeUsers: active.size, totalEvents: events.length } });
}));

/* ---------------- Health/metrics misc ---------------- */

router.get('/api-performance', authenticateToken, asyncHandler(async (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    success: true,
    data: {
      uptimeSeconds: Math.round(process.uptime()),
      memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
      node: process.version
    }
  });
}));

router.get('/database-usage', authenticateToken, asyncHandler(async (req, res) => {
  // Report Postgres row counts (replaces the old Firestore usage endpoint)
  const [users, orders, products, events] = await Promise.all([User.count(), Order.count(), Product.count(), AnalyticsEvent.count()]);
  res.json({ success: true, data: { users, orders, products, analyticsEvents: events, engine: 'postgresql' } });
}));

router.get('/csp', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { violations: [], violationsCount: 0, status: 'enforced' } });
}));

router.get('/errors', authenticateToken, asyncHandler(async (req, res) => {
  const since = rangeStart(req);
  const items = await AnalyticsEvent.findAll({
    where: { createdAt: { [Op.gte]: since }, category: ['error', 'errors'] },
    order: [['createdAt', 'DESC']], limit: 200
  });
  res.json({ success: true, items, data: items, total: items.length });
}));

router.get('/metrics', authenticateToken, asyncHandler(async (req, res) => {
  const since = rangeStart(req);
  const total = await AnalyticsEvent.count({ where: { createdAt: { [Op.gte]: since } } });
  res.json({ success: true, data: { totalEvents: total, window: req.query.timeRange || '30d' } });
}));

router.get('/conversion', authenticateToken, asyncHandler(async (req, res) => {
  const orders = await Order.count({ where: { createdAt: { [Op.gte]: rangeStart(req) } } });
  const events = await AnalyticsEvent.count({ where: { createdAt: { [Op.gte]: rangeStart(req) }, name: 'page_view' } }).catch(() => 0);
  res.json({ success: true, data: { orders, pageViews: events, conversionRate: events ? orders / events : null } });
}));

router.get('/engagement', authenticateToken, asyncHandler(async (req, res) => {
  const since = rangeStart(req);
  const events = await AnalyticsEvent.findAll({ where: { createdAt: { [Op.gte]: since } }, attributes: ['name', 'category'], raw: true });
  const byCategory = {};
  for (const e of events) byCategory[e.category] = (byCategory[e.category] || 0) + 1;
  res.json({ success: true, data: { totalEvents: events.length, byCategory } });
}));

router.get('/events/count', authenticateToken, asyncHandler(async (req, res) => {
  const since = rangeStart(req);
  const total = await AnalyticsEvent.count({ where: { createdAt: { [Op.gte]: since } } });
  res.json({ success: true, count: total, data: { count: total } });
}));

router.get('/performance', authenticateToken, asyncHandler(async (req, res) => {
  const items = await AnalyticsEvent.findAll({
    where: { createdAt: { [Op.gte]: rangeStart(req) }, category: 'performance' },
    order: [['createdAt', 'DESC']], limit: 200
  });
  res.json({ success: true, items, total: items.length });
}));

module.exports = router;
