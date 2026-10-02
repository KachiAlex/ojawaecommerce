const express = require('express');
const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  User, Order, Product, Wallet, WalletTransaction, Notification, Review,
  DeliveryTracking, EmailLog, AppSetting
} = require('../models');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

// Compatibility routes for frontend endpoints that predate the Express backend.
// Everything here is mounted under /api (e.g. /api/wallet_transactions).

const ensureOwnOrAdmin = (req, userId) => {
  const requester = req.user || {};
  if (requester.id !== userId && requester.role !== 'admin') {
    throw new AppError('Forbidden', 403);
  }
};

/* ---------------- Wallets ---------------- */

// GET /api/wallets?userId=... or ?walletId=... — lookup wallets (trackingService)
router.get('/wallets', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, walletId } = req.query;
  const where = {};
  if (userId) where.userId = userId;
  if (walletId) where.id = walletId;
  if (!userId && req.user.role !== 'admin') where.userId = req.user.id;
  if (userId) ensureOwnOrAdmin(req, userId);
  const wallets = await Wallet.findAll({ where });
  res.json({ success: true, wallets, data: wallets });
}));

// PUT /api/wallets/:id — update a wallet (e.g. deduct/attach metadata)
router.put('/wallets/:id', authenticateToken, asyncHandler(async (req, res) => {
  const wallet = await Wallet.findByPk(req.params.id);
  if (!wallet) throw new AppError('Wallet not found', 404);
  ensureOwnOrAdmin(req, wallet.userId);
  const allowed = ['balance', 'status', 'userType', 'metadata'];
  const updates = {};
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  await wallet.update(updates);
  res.json({ success: true, data: wallet });
}));

// POST /api/wallets — create (or return) a wallet for a user
router.post('/wallets', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, userType = 'buyer' } = req.body;
  if (!userId) throw new AppError('userId is required', 400);
  ensureOwnOrAdmin(req, userId);

  let wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) {
    wallet = await Wallet.create({ userId, userType, balance: 0 });
  }
  res.json({ success: true, data: wallet });
}));

// GET /api/wallet_transactions — admin: all transactions; user: own
router.get('/wallet_transactions', authenticateToken, asyncHandler(async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const where = isAdmin ? {} : { userId: req.user.id };
  if (req.query.userId && isAdmin) where.userId = req.query.userId;

  const items = await WalletTransaction.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Math.min(parseInt(req.query.limit, 10) || 100, 500)
  });
  res.json({ success: true, items, total: items.length });
}));

router.get('/wallet_transactions/:id', authenticateToken, asyncHandler(async (req, res) => {
  const tx = await WalletTransaction.findByPk(req.params.id);
  if (!tx) throw new AppError('Transaction not found', 404);
  ensureOwnOrAdmin(req, tx.userId);
  res.json({ success: true, data: tx });
}));

// PATCH /api/wallet_transactions/:id — admin updates a transaction (e.g. reverse escrow)
router.patch('/wallet_transactions/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const tx = await WalletTransaction.findByPk(req.params.id);
  if (!tx) throw new AppError('Transaction not found', 404);

  const updates = {};
  if (req.body.status) updates.status = req.body.status;
  const metadata = { ...(tx.metadata || {}) };
  for (const k of ['reversedAt', 'reversedBy', 'notes', 'reason']) {
    if (req.body[k] !== undefined) metadata[k] = req.body[k];
  }
  updates.metadata = metadata;
  await tx.update(updates);
  res.json({ success: true, data: tx });
}));

/* ---------------- Support tickets ---------------- */

// GET /api/support_tickets — admin sees all tickets (stored in user profiles)
router.get('/support_tickets', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const users = await User.findAll({ attributes: ['id', 'email', 'profile'] });
  const items = [];
  for (const u of users) {
    for (const t of (u.profile?.supportTickets || [])) {
      items.push({ ...t, userId: u.id, userEmail: u.email });
    }
  }
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, items, total: items.length });
}));

/* ---------------- Admin messages ---------------- */

// Admin messages are notifications with type 'admin_message'
router.get('/admin_messages', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const items = await Notification.findAll({
    where: { type: 'admin_message' },
    order: [['createdAt', 'DESC']],
    limit: 200
  });
  res.json({ success: true, items, total: items.length });
}));

// POST /api/admin_messages — admin sends a message to a user (stored as notification)
router.post('/admin_messages', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { userId, recipientId, title, subject, message, content } = req.body;
  const targetUserId = userId || recipientId;
  const text = message || content;
  if (!targetUserId || !text) throw new AppError('userId and message are required', 400);

  const target = await User.findByPk(targetUserId);
  if (!target) throw new AppError('Recipient not found', 404);

  const notification = await Notification.create({
    userId: targetUserId,
    type: 'admin_message',
    title: title || subject || 'Message from admin',
    message: text,
    isRead: false,
    data: { fromAdmin: req.user.id }
  });
  res.status(201).json({ success: true, data: notification });
}));

/* ---------------- Ratings ---------------- */

// GET /api/ratings?rateeId= — ratings for a user (reviews on their products or by them)
router.get('/ratings', authenticateToken, asyncHandler(async (req, res) => {
  const { rateeId } = req.query;
  let items;
  if (rateeId) {
    const productIds = (await Product.findAll({ where: { vendorId: rateeId }, attributes: ['id'], raw: true })).map(p => p.id);
    const where = productIds.length
      ? { [Op.or]: [{ productId: productIds }, { userId: rateeId }] }
      : { userId: rateeId };
    items = await Review.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(req.query.limit, 10) || 100, 500)
    });
  } else {
    items = await Review.findAll({ order: [['createdAt', 'DESC']], limit: 100 });
  }
  res.json({ success: true, items: items || [], total: (items || []).length });
}));

/* ---------------- Logistics companies ---------------- */

// Logistics companies are users with the logistics role
router.get('/logistics_companies', asyncHandler(async (req, res) => {
  const where = { role: 'logistics' };
  const items = await User.findAll({
    where,
    attributes: ['id', 'email', 'profile', 'isActive', 'createdAt'],
    limit: 200
  });
  const mapped = items.map(u => ({
    id: u.id,
    name: u.profile?.displayName || u.profile?.companyName || u.email,
    status: u.isActive ? 'active' : 'inactive',
    rating: u.profile?.rating ?? null,
    ...Object.fromEntries(Object.entries(u.profile || {}).filter(([, v]) => typeof v !== 'object'))
  }));
  if (req.query.sort === 'rating_desc') {
    mapped.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  res.json({ success: true, items: mapped, total: mapped.length });
}));

router.put('/logistics_companies/:id', authenticateToken, asyncHandler(async (req, res) => {
  ensureOwnOrAdmin(req, req.params.id);
  const user = await User.findByPk(req.params.id);
  if (!user) throw new AppError('Logistics company not found', 404);
  const allowed = ['displayName', 'companyName', 'phone', 'address', 'serviceAreas', 'pricing'];
  const profile = { ...(user.profile || {}) };
  for (const k of allowed) {
    if (req.body[k] !== undefined) profile[k] = req.body[k];
  }
  await user.update({ profile });
  res.json({ success: true, data: user });
}));

/* ---------------- Email queue ---------------- */

const TEMPLATE_TYPES = [
  'order_placed', 'order_confirmed', 'order_shipped', 'order_delivered',
  'order_cancelled', 'payment_received', 'payment_released', 'new_order',
  'dispute_created', 'dispute_resolved', 'return_requested', 'return_update',
  'wallet_funded', 'wallet_low_balance', 'message_received', 'system_update', 'promotion'
];

// POST /api/email-queue and /api/send-email — send an email now and log it
const queueEmailHandler = asyncHandler(async (req, res) => {
  const { to, type = 'general', subject, body, message, userId, data = {} } = req.body;
  const recipient = to || req.body.recipient || req.body.email;
  if (!recipient) throw new AppError('Recipient email is required', 400);

  const log = await EmailLog.create({
    userId: userId || req.user.id,
    recipient,
    type,
    subject: subject || type,
    status: 'queued',
    data: { ...data, body: body || message }
  });

  const result = await sendEmail({
    to: recipient,
    type: TEMPLATE_TYPES.includes(type) ? type : 'system_update',
    data: { ...data, message: body || message || data.message }
  });

  await log.update({
    status: result.sent ? 'sent' : 'failed',
    messageId: result.messageId || null,
    error: result.sent ? null : (result.reason || 'send failed')
  });

  res.status(result.sent ? 201 : 502).json({ success: result.sent, data: log });
});

router.post('/email-queue', authenticateToken, queueEmailHandler);
router.post('/send-email', authenticateToken, queueEmailHandler);

router.patch('/email-queue/:id/status', authenticateToken, asyncHandler(async (req, res) => {
  const log = await EmailLog.findByPk(req.params.id);
  if (!log) throw new AppError('Email not found', 404);
  const { status } = req.body;
  if (!['queued', 'sent', 'failed'].includes(status)) throw new AppError('Invalid status', 400);
  await log.update({ status });
  res.json({ success: true, data: log });
}));

// GET /api/users/:userId/emails — email log for a user
router.get('/users/:userId/emails', authenticateToken, asyncHandler(async (req, res) => {
  ensureOwnOrAdmin(req, req.params.userId);
  const items = await EmailLog.findAll({
    where: { userId: req.params.userId },
    order: [['createdAt', 'DESC']],
    limit: Math.min(parseInt(req.query.limit, 10) || 50, 200)
  });
  res.json({ success: true, items, emails: items, total: items.length });
}));

/* ---------------- Admin settings ---------------- */

router.get('/admin-settings/:key', asyncHandler(async (req, res) => {
  const setting = await AppSetting.findByPk(req.params.key);
  res.json({ success: true, data: setting ? setting.value : {}, key: req.params.key });
}));

router.put('/admin-settings/:key', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const [setting] = await AppSetting.upsert({
    key: req.params.key,
    value: req.body,
    updatedBy: req.user.id
  });
  res.json({ success: true, data: setting });
}));

router.post('/admin-settings/:key', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const [setting] = await AppSetting.upsert({
    key: req.params.key,
    value: req.body,
    updatedBy: req.user.id
  });
  res.json({ success: true, data: setting });
}));

/* ---------------- Disputes ---------------- */

// GET /api/disputes/:id — a dispute is an order flagged as disputed
router.get('/disputes/:id', authenticateToken, asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError('Dispute not found', 404);
  ensureOwnOrAdmin(req, order.buyerId);
  res.json({
    success: true,
    data: {
      id: order.id,
      orderId: order.id,
      buyerId: order.buyerId,
      vendorId: order.vendorId,
      status: order.disputeStatus || order.status,
      reason: order.disputeReason || null,
      order
    }
  });
}));

// PATCH /api/disputes/:id — admin resolves/updates a dispute (disputes live on orders)
router.patch('/disputes/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError('Dispute not found', 404);

  const body = req.body || {};
  const updates = {};
  if (body.status === 'resolved' || body.resolution) {
    updates.disputeStatus = 'resolved';
    updates.disputeResolution = body.resolution || body.notes || null;
    updates.disputeResolvedAt = new Date();
    if (body.resolution === 'refund_buyer') {
      updates.refundStatus = 'refunded';
      updates.paymentStatus = 'refunded';
      updates.refundedAt = new Date();
    }
  } else if (body.status) {
    updates.disputeStatus = body.status;
  }
  await order.update(updates);
  res.json({ success: true, data: order });
}));

/* ---------------- Delivery tracking ---------------- */

const genTrackingNumber = () => `OJW-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const addTrackingEvent = (record, type, details = {}) => {
  const events = Array.isArray(record.events) ? record.events : [];
  events.push({ type, timestamp: new Date().toISOString(), ...details });
  return events;
};

// POST /api/delivery-tracking — create a tracking record
router.post('/delivery-tracking', authenticateToken, asyncHandler(async (req, res) => {
  const { orderId, partnerId, origin, destination, estimatedDelivery, trackingNumber } = req.body;
  if (!orderId) throw new AppError('orderId is required', 400);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(orderId)) throw new AppError('orderId must be a valid UUID', 400);
  if (!destination || (!destination.address && !destination.lat)) {
    throw new AppError('destination (address or lat/lng) is required', 400);
  }
  const order = await Order.findByPk(orderId);
  if (!order) throw new AppError('Order not found', 404);
  const record = await DeliveryTracking.create({
    trackingNumber: trackingNumber || genTrackingNumber(),
    orderId: orderId || null,
    partnerId: partnerId || req.user.id,
    origin: origin || {},
    destination: destination || {},
    estimatedDelivery: estimatedDelivery || null,
    status: 'pending',
    events: [{ type: 'created', timestamp: new Date().toISOString() }]
  });
  res.status(201).json({ success: true, data: record, tracking: record });
}));

// GET /api/delivery-tracking — query by trackingNumber, orderId, or partnerId
router.get('/delivery-tracking', asyncHandler(async (req, res) => {
  const { trackingNumber, orderId, partnerId, status } = req.query;
  const where = {};
  if (trackingNumber) where.trackingNumber = trackingNumber;
  if (orderId) where.orderId = orderId;
  if (partnerId) where.partnerId = partnerId;
  if (status) where.status = status;

  const items = await DeliveryTracking.findAll({ where, order: [['createdAt', 'DESC']], limit: 200 });
  if (trackingNumber && items.length === 1) {
    return res.json({ success: true, data: items[0], tracking: items[0], items });
  }
  res.json({ success: true, items, data: items[0] || null, total: items.length });
}));

router.get('/delivery-tracking/:id', asyncHandler(async (req, res) => {
  const record = await DeliveryTracking.findByPk(req.params.id)
    || await DeliveryTracking.findOne({ where: { trackingNumber: req.params.id } });
  if (!record) throw new AppError('Tracking record not found', 404);
  res.json({ success: true, data: record, tracking: record });
}));

router.put('/delivery-tracking/:id', authenticateToken, asyncHandler(async (req, res) => {
  const record = await DeliveryTracking.findByPk(req.params.id)
    || await DeliveryTracking.findOne({ where: { trackingNumber: req.params.id } });
  if (!record) throw new AppError('Tracking record not found', 404);
  ensureOwnOrAdmin(req, record.partnerId);

  const updates = {};
  for (const k of ['status', 'origin', 'destination', 'currentLocation', 'estimatedDelivery', 'metadata']) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  if (updates.status) {
    updates.events = addTrackingEvent(record, 'status_change', { status: updates.status });
    if (updates.status === 'delivered') updates.deliveredAt = new Date();
  }
  await record.update(updates);
  res.json({ success: true, data: record, tracking: record });
}));

// POST /api/delivery-tracking/:id/location — update current location
router.post('/delivery-tracking/:id/location', authenticateToken, asyncHandler(async (req, res) => {
  const record = await DeliveryTracking.findByPk(req.params.id)
    || await DeliveryTracking.findOne({ where: { trackingNumber: req.params.id } });
  if (!record) throw new AppError('Tracking record not found', 404);
  ensureOwnOrAdmin(req, record.partnerId);

  const { lat, lng, address, note } = req.body;
  await record.update({
    currentLocation: { lat, lng, address, updatedAt: new Date().toISOString() },
    events: addTrackingEvent(record, 'location_update', { lat, lng, address, note })
  });
  res.json({ success: true, data: record, tracking: record });
}));

// POST /api/delivery-tracking/:id/attempt — record a delivery attempt
router.post('/delivery-tracking/:id/attempt', authenticateToken, asyncHandler(async (req, res) => {
  const record = await DeliveryTracking.findByPk(req.params.id)
    || await DeliveryTracking.findOne({ where: { trackingNumber: req.params.id } });
  if (!record) throw new AppError('Tracking record not found', 404);
  ensureOwnOrAdmin(req, record.partnerId);

  await record.update({
    attempts: (record.attempts || 0) + 1,
    events: addTrackingEvent(record, 'delivery_attempt', { note: req.body.note, outcome: req.body.outcome })
  });
  res.json({ success: true, data: record, tracking: record });
}));

// POST /api/delivery-tracking/:id/complete — mark delivered
router.post('/delivery-tracking/:id/complete', authenticateToken, asyncHandler(async (req, res) => {
  const record = await DeliveryTracking.findByPk(req.params.id)
    || await DeliveryTracking.findOne({ where: { trackingNumber: req.params.id } });
  if (!record) throw new AppError('Tracking record not found', 404);
  ensureOwnOrAdmin(req, record.partnerId);

  await record.update({
    status: 'delivered',
    deliveredAt: new Date(),
    events: addTrackingEvent(record, 'delivered', { note: req.body.note })
  });

  if (record.orderId) {
    await Order.update(
      { status: 'delivered' },
      { where: { id: record.orderId } }
    ).catch(() => {});
  }
  res.json({ success: true, data: record, tracking: record });
}));

module.exports = router;
