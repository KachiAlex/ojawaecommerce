const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { Order, Product, Notification, Cart, Wallet, WalletTransaction, User } = require('../models');
const { createNotification } = require('../services/NotificationService');
const {
  reserveStock,
  convertReservationsToStockDeduction,
  releaseReservations,
  getAvailableStock
} = require('../services/inventoryService');
const { processRefund } = require('../services/refundService');
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
 * @route   POST /api/orders/guest
 * @desc    Create order as guest (no auth required, email + phone required)
 * @access  Public
 */
router.post('/guest', [
  body('items').isArray({ min: 1 }),
  body('items.*.productId').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.price').isFloat({ min: 0 }),
  body('deliveryAddress').isObject(),
  body('deliveryOption').isIn(['standard', 'express', 'same_day']),
  body('paymentMethod').isIn(['paystack', 'flutterwave']),
  body('guestEmail').isEmail().normalizeEmail(),
  body('guestPhone').notEmpty(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const {
    items,
    deliveryAddress,
    deliveryOption = 'standard',
    paymentMethod,
    guestEmail,
    guestPhone,
    notes = '',
    logisticsPartnerId = null,
    logisticsMeta = null
  } = req.body;

  const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // Verify all products and calculate totals
  let subtotal = 0;
  const orderItems = [];
  const vendorIds = new Set();

  for (const item of items) {
    const product = await Product.findByPk(item.productId);

    if (!product) {
      throw new AppError(`Product ${item.productId} not found`, 400);
    }

    if (product.status !== 'active' && product.status !== 'approved') {
      throw new AppError(`Product ${product.name} is not available`, 400);
    }

    const currentPrice = parseFloat(product.price);
    if (Math.abs(parseFloat(item.price) - currentPrice) > 0.01) {
      throw new AppError(`Price changed for ${product.name}`, 400);
    }

    const itemTotal = currentPrice * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      productId: item.productId,
      productName: product.name,
      productImage: product.images?.[0]?.url || product.thumbnail,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      quantity: item.quantity,
      unitPrice: currentPrice,
      totalPrice: itemTotal,
      processingTimeDays: product.processingTimeDays || 2,
      status: 'pending'
    });

    vendorIds.add(product.vendorId);
  }

  const shippingCost = deliveryOption === 'express' ? 1500 : deliveryOption === 'same_day' ? 2500 : 500;
  const tax = subtotal * 0.05;
  const total = subtotal + shippingCost + tax;

  const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const trackingNumber = 'TRK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();

  const orderData = {
    orderNumber,
    trackingNumber,
    buyerId: guestId,
    isGuest: true,
    guestEmail,
    guestPhone,
    vendorId: Array.from(vendorIds)[0] || '',
    vendorIds: Array.from(vendorIds),
    items: orderItems,
    totalAmount: total,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod,
    shippingAddress: deliveryAddress,
    deliveryOption,
    logisticsPartnerId: logisticsPartnerId || null,
    logisticsMeta: logisticsMeta || null,
    notes,
  };

  const order = await Order.create(orderData);

  // Deduct stock directly (no reservation system for guests)
  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    if (product) {
      const newStock = Math.max(0, product.stockQuantity - item.quantity);
      await product.update({
        stockQuantity: newStock,
        status: newStock === 0 ? 'out_of_stock' : product.status,
        salesCount: (product.salesCount || 0) + item.quantity
      });
    }
  }

  // Create notifications for vendors
  for (const vendorId of vendorIds) {
    const vendorItems = orderItems.filter(item => item.vendorId === vendorId);
    await createNotification({
      userId: vendorId,
      type: 'new_order',
      title: 'New Guest Order Received',
      message: `You have received a new order (${orderNumber}) from a guest customer containing ${vendorItems.length} item(s)`,
      data: { orderId: order.id, orderNumber, itemCount: vendorItems.length, totalAmount: vendorItems.reduce((sum, item) => sum + item.totalPrice, 0), isGuest: true, guestEmail },
      orderId: order.id
    });
  }

  res.status(201).json({
    success: true,
    message: 'Guest order created successfully',
    data: {
      orderId: order.id,
      orderNumber,
      trackingNumber,
      totalAmount: total,
      subtotal,
      shippingCost,
      tax,
      items: orderItems,
      vendorIds: Array.from(vendorIds),
      guestEmail,
    }
  });
}));

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private
 */
router.post('/', authenticateToken, [
  body('items').isArray({ min: 1 }),
  body('items.*.productId').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.price').isFloat({ min: 0 }),
  body('deliveryAddress').isObject(),
  body('deliveryOption').isIn(['standard', 'express', 'same_day']),
  body('paymentMethod').isIn(['wallet', 'paystack', 'flutterwave', 'escrow']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const {
    items,
    deliveryAddress,
    deliveryOption = 'standard',
    paymentMethod,
    notes = '',
    couponCode = null,
    logisticsPartnerId = null,
    logisticsMeta = null
  } = req.body;

  // Reserve stock before creating order
  let reservations = [];
  try {
    reservations = await reserveStock(userId, items);
  } catch (stockError) {
    throw new AppError(stockError.message, 400);
  }

  // Verify all products and calculate totals
  let subtotal = 0;
  const orderItems = [];
  const vendorIds = new Set();

  for (const item of items) {
    const product = await Product.findByPk(item.productId);

    if (!product) {
      await releaseReservations(userId, items.map(i => i.productId));
      throw new AppError(`Product ${item.productId} not found`, 400);
    }

    // Check product availability
    if (product.status !== 'active' && product.status !== 'approved') {
      await releaseReservations(userId, items.map(i => i.productId));
      throw new AppError(`Product ${product.name} is not available`, 400);
    }

    // Verify price
    const currentPrice = parseFloat(product.price);
    if (Math.abs(parseFloat(item.price) - currentPrice) > 0.01) {
      await releaseReservations(userId, items.map(i => i.productId));
      throw new AppError(`Price changed for ${product.name}`, 400);
    }

    const itemTotal = currentPrice * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      productId: item.productId,
      productName: product.name,
      productImage: product.images?.[0]?.url || product.thumbnail,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      quantity: item.quantity,
      unitPrice: currentPrice,
      totalPrice: itemTotal,
      processingTimeDays: product.processingTimeDays || 2,
      status: 'pending'
    });

    vendorIds.add(product.vendorId);
  }

  // Calculate shipping (simplified - could be more complex)
  const shippingCost = deliveryOption === 'express' ? 1500 : deliveryOption === 'same_day' ? 2500 : 500;
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + shippingCost + tax;

  // Generate order number and tracking number
  const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const trackingNumber = 'TRK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();

  // Create order
  const orderData = {
    orderNumber,
    trackingNumber,
    buyerId: userId,
    vendorId: Array.from(vendorIds)[0] || '',
    vendorIds: Array.from(vendorIds),
    items: orderItems,
    totalAmount: total,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod,
    shippingAddress: deliveryAddress,
    deliveryOption,
    logisticsPartnerId: logisticsPartnerId || null,
    logisticsMeta: logisticsMeta || null,
    notes,
  };

  let order;
  try {
    order = await Order.create(orderData);
  } catch (createError) {
    console.error('Order creation error:', createError.message, createError.errors?.map(e => e.message));
    await releaseReservations(userId, items.map(i => i.productId));
    throw new AppError(`Failed to create order: ${createError.message}`, 500);
  }

  // Convert reservations to actual stock deduction
  try {
    await convertReservationsToStockDeduction(order.id, userId, items);
  } catch (deductionError) {
    console.error('Stock deduction error:', deductionError.message);
    // Order exists but stock may be inconsistent - log for admin review
  }

  // Deduct wallet balance for wallet/escrow payments
  if (paymentMethod === 'wallet' || paymentMethod === 'escrow') {
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
      throw new AppError('Wallet not found. Please create a wallet first.', 400);
    }
    const currentBalance = parseFloat(wallet.balance);
    if (currentBalance < total) {
      throw new AppError(`Insufficient wallet balance. Required: ₦${total.toFixed(2)}, Available: ₦${currentBalance.toFixed(2)}`, 400);
    }

    const newBalance = currentBalance - total;
    await wallet.update({ balance: newBalance });

    const reference = 'WLP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    await WalletTransaction.create({
      userId,
      type: 'payment',
      amount: -total,
      orderId: order.id,
      reference,
      description: `Wallet payment for order ${orderNumber}`,
      status: 'completed',
      metadata: { orderNumber, subtotal, shippingCost, tax }
    });

    // Update order payment status
    await order.update({
      paymentStatus: 'paid',
      status: 'processing',
      paymentReference: reference
    });

    // Notify buyer of successful payment
    await createNotification({
      userId,
      type: 'payment_received',
      title: 'Payment Completed',
      message: `Your wallet payment of ₦${total.toFixed(2)} for order ${orderNumber} was successful. New balance: ₦${newBalance.toFixed(2)}`,
      data: { orderId: order.id, orderNumber, amount: total, newBalance, reference },
      orderId: order.id,
      amount: total
    });
  }

  // Clear user's cart
  await Cart.destroy({ where: { userId } });

  // Create notifications for vendors
  for (const vendorId of vendorIds) {
    const vendorItems = orderItems.filter(item => item.vendorId === vendorId);
    await createNotification({
      userId: vendorId,
      type: 'new_order',
      title: 'New Order Received',
      message: `You have received a new order (${orderNumber}) containing ${vendorItems.length} item(s)`,
      data: { orderId: order.id, orderNumber, itemCount: vendorItems.length, totalAmount: vendorItems.reduce((sum, item) => sum + item.totalPrice, 0) },
      orderId: order.id
    });
  }

  // Create order confirmation notification for buyer
  await createNotification({
    userId,
    type: 'order_placed',
    title: 'Order Placed Successfully',
    message: `Your order ${orderNumber} has been placed successfully`,
    data: { orderId: order.id, orderNumber, totalAmount: total },
    orderId: order.id
  });

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      orderId: order.id,
      orderNumber,
      trackingNumber,
      totalAmount: total,
      subtotal,
      shippingCost,
      tax,
      items: orderItems,
      vendorIds: Array.from(vendorIds),
    }
  });
}));

/**
 * @route   GET /api/orders
 * @desc    Get user's orders
 * @access  Private
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  query('sortBy').optional().isIn(['createdAt', 'total', 'status']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  handleValidationErrors
], authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const {
    page = 1,
    limit = 20,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query options
  const where = { buyerId: userId };
  if (status) {
    where.status = status;
  }

  const order = [[sortBy, sortOrder.toUpperCase()]];
  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  // Get total count
  const total = await Order.count({ where });

  // Fetch orders with pagination
  const orders = await Order.findAll({
    where,
    order,
    limit: limitInt,
    offset
  });

  res.json({
    success: true,
    data: {
      orders: orders.map(o => o.toJSON()),
      pagination: {
        currentPage: pageInt,
        totalPages: Math.ceil(total / limitInt),
        totalItems: total,
        itemsPerPage: limitInt,
        hasNextPage: pageInt * limitInt < total,
        hasPreviousPage: pageInt > 1
      }
    }
  });
}));

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.uid;

  const order = await Order.findByPk(id);
  
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const orderData = order.toJSON();

  // Check ownership
  if (orderData.buyerId !== userId && req.user.role !== 'admin') {
    throw new AppError('Not authorized to view this order', 403);
  }

  res.json({
    success: true,
    data: orderData
  });
}));

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (vendor/admin only)
 * @access  Private (vendor or admin)
 */
router.put('/:id/status', authenticateToken, [
  body('status').isIn(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  body('trackingNumber').optional().isString(),
  body('notes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber, notes } = req.body;
  const user = req.user;

  const order = await Order.findByPk(id);
  
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const orderData = order.toJSON();

  // Check authorization (vendor or admin)
  const vendorIds = orderData.vendorIds || [orderData.vendorId].filter(Boolean);
  const isVendor = vendorIds.includes(user.uid) || orderData.vendorId === user.uid;
  const isAdmin = user.role === 'admin';
  
  if (!isVendor && !isAdmin) {
    throw new AppError('Not authorized to update this order', 403);
  }

  // Validate status transitions
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered'],
    'cancelled': [],
    'delivered': []
  };

  const currentStatus = orderData.status;
  const allowedStatuses = validTransitions[currentStatus] || [];

  if (!allowedStatuses.includes(status)) {
    throw new AppError(`Cannot change order status from ${currentStatus} to ${status}`, 400);
  }

  const updates = { status };

  if (trackingNumber) {
    updates.trackingNumber = trackingNumber;
  }

  if (notes) {
    updates.notes = notes;
  }

  // Add status change log
  const statusLog = {
    status,
    changedBy: user.uid,
    changedByName: user.displayName || user.email,
    notes: notes || ''
  };

  const statusHistory = orderData.statusHistory || [];
  updates.statusHistory = [...statusHistory, statusLog];

  await order.update(updates);

  // Notify buyer of status change
  const statusTypeMap = { shipped: 'order_shipped', delivered: 'order_delivered', completed: 'order_delivered', cancelled: 'order_cancelled' };
  await createNotification({
    userId: orderData.buyerId,
    type: statusTypeMap[status] || 'order_update',
    title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your order ${orderData.orderNumber} has been ${status}`,
    data: { orderId: order.id, orderNumber: orderData.orderNumber, status },
    orderId: order.id
  });

  // Notify logistics partner when order is marked as shipped (ready for pickup)
  if (status === 'shipped' && orderData.logisticsPartnerId) {
    await createNotification({
      userId: orderData.logisticsPartnerId,
      type: 'new_order',
      title: 'New Order Ready for Pickup',
      message: `Order ${orderData.orderNumber} is ready for shipment. Please arrange pickup.`,
      data: {
        orderId: order.id,
        orderNumber: orderData.orderNumber,
        status,
        buyerId: orderData.buyerId,
        shippingAddress: orderData.shippingAddress,
        items: orderData.items,
        logisticsMeta: orderData.logisticsMeta
      },
      orderId: order.id
    });
  }

  const updatedOrder = await Order.findByPk(id);

  res.json({
    success: true,
    message: `Order status updated to ${status}`,
    data: updatedOrder.toJSON()
  });
}));

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order (buyer only, if pending)
 * @access  Private
 */
router.post('/:id/cancel', authenticateToken, [
  body('reason').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.uid;

  const order = await Order.findByPk(id);
  
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const orderData = order.toJSON();

  // Check ownership
  if (orderData.buyerId !== userId) {
    throw new AppError('Not authorized to cancel this order', 403);
  }

  // Check if order can be cancelled
  if (orderData.status !== 'pending') {
    throw new AppError('Order can only be cancelled while pending', 400);
  }

  // Update order status
  await order.update({
    status: 'cancelled',
    cancellationReason: reason || 'Cancelled by buyer',
    cancelledAt: new Date()
  });

  // Restore product stock
  for (const item of orderData.items) {
    const product = await Product.findByPk(item.productId);
    if (product) {
      const restoredStock = product.stockQuantity + item.quantity;
      await product.update({
        stockQuantity: restoredStock,
        status: restoredStock > 0 && product.status === 'out_of_stock' ? 'approved' : product.status,
        salesCount: Math.max(0, (product.salesCount || 0) - item.quantity)
      });
    }
  }

  // If order was paid, initiate refund
  if (orderData.paymentStatus === 'paid') {
    try {
      await processRefund({
        orderId: id,
        reason: reason || 'Order cancelled by buyer',
        initiatedBy: userId
      });
    } catch (refundError) {
      console.error('Refund failed during cancellation:', refundError.message);
      // Don't fail the cancellation if refund fails; admin can retry manually
    }
  }

  // Notify vendors
  for (const vendorId of orderData.vendorIds) {
    await createNotification({
      userId: vendorId,
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message: `Order ${orderData.orderNumber} has been cancelled by the buyer`,
      data: { orderId: order.id, orderNumber: orderData.orderNumber, reason: reason || 'Cancelled by buyer' },
      orderId: order.id
    });
  }

  res.json({
    success: true,
    message: 'Order cancelled successfully'
  });
}));

/**
 * @route   GET /api/orders/summary
 * @desc    Get order summary for user
 * @access  Private
 */
/**
 * @route   POST /api/orders/:id/refund
 * @desc    Request refund for a paid order
 * @access  Private (buyer or admin)
 */
router.post('/:id/refund', authenticateToken, [
  body('reason').optional().isString(),
  body('amount').optional().isFloat({ min: 0 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, amount } = req.body;
  const userId = req.user.uid;
  const userRole = req.user.role;

  const order = await Order.findByPk(id);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.buyerId !== userId && userRole !== 'admin') {
    throw new AppError('Not authorized to request refund', 403);
  }

  const result = await processRefund({
    orderId: id,
    reason,
    amount: amount || null,
    initiatedBy: userId
  });

  res.json({
    success: true,
    message: 'Refund initiated',
    data: result
  });
}));

/**
 * @route   POST /api/orders/:id/return-request
 * @desc    Request a return for a delivered order (buyer or guest)
 * @access  Private or Public (guest)
 */
router.post('/:id/return-request', optionalAuth, [
  body('reason').isString().isLength({ min: 10, max: 1000 }),
  body('guestEmail').optional().isEmail().normalizeEmail(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, guestEmail } = req.body;

  const order = await Order.findByPk(id);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Authorization: authenticated buyer or guest with matching email
  if (req.user) {
    if (order.buyerId !== req.user.uid && req.user.role !== 'admin') {
      throw new AppError('Not authorized to request return for this order', 403);
    }
  } else {
    if (!order.isGuest) {
      throw new AppError('Authentication required', 401);
    }
    if (!guestEmail || guestEmail.toLowerCase() !== (order.guestEmail || '').toLowerCase()) {
      throw new AppError('Email does not match order', 403);
    }
  }

  if (order.status !== 'delivered' && order.status !== 'completed') {
    throw new AppError('Returns can only be requested for delivered orders', 400);
  }

  if (order.returnStatus !== 'none') {
    throw new AppError(`Return already ${order.returnStatus}`, 400);
  }

  await order.update({
    returnStatus: 'requested',
    returnReason: reason,
    returnRequestedAt: new Date()
  });

  // Notify vendor(s)
  const vendorIds = order.vendorIds || [order.vendorId].filter(Boolean);
  for (const vendorId of vendorIds) {
    await createNotification({
      userId: vendorId,
      type: 'return_requested',
      title: 'Return Requested',
      message: `A return has been requested for order ${order.orderNumber}. Reason: ${reason}`,
      data: { orderId: order.id, orderNumber: order.orderNumber, reason },
      orderId: order.id
    });
  }

  res.json({
    success: true,
    message: 'Return request submitted successfully',
    data: {
      orderId: order.id,
      returnStatus: 'requested',
      returnReason: reason
    }
  });
}));

/**
 * @route   PUT /api/orders/:id/return
 * @desc    Approve or reject a return request (vendor or admin)
 * @access  Private
 */
router.put('/:id/return', authenticateToken, [
  body('action').isIn(['approve', 'reject']),
  body('returnTrackingNumber').optional().isString(),
  body('notes').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, returnTrackingNumber, notes } = req.body;
  const user = req.user;

  const order = await Order.findByPk(id);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const vendorIds = order.vendorIds || [order.vendorId].filter(Boolean);
  const isVendor = vendorIds.includes(user.uid) || order.vendorId === user.uid;
  const isAdmin = user.role === 'admin';

  if (!isVendor && !isAdmin) {
    throw new AppError('Not authorized to process returns', 403);
  }

  if (order.returnStatus !== 'requested') {
    throw new AppError(`Return is ${order.returnStatus}, cannot ${action}`, 400);
  }

  const updates = {};
  if (action === 'approve') {
    updates.returnStatus = 'approved';
    updates.returnApprovedAt = new Date();
    if (returnTrackingNumber) {
      updates.returnTrackingNumber = returnTrackingNumber;
    }
  } else {
    updates.returnStatus = 'rejected';
    updates.returnRejectedAt = new Date();
  }

  await order.update(updates);

  // Notify buyer
  const buyerId = order.isGuest ? null : order.buyerId;
  if (buyerId) {
    await createNotification({
      userId: buyerId,
      type: 'return_update',
      title: action === 'approve' ? 'Return Approved' : 'Return Rejected',
      message: `Your return request for order ${order.orderNumber} has been ${action === 'approve' ? 'approved' : 'rejected'}.${notes ? ' ' + notes : ''}`,
      data: { orderId: order.id, orderNumber: order.orderNumber, action, notes },
      orderId: order.id
    });
  }

  res.json({
    success: true,
    message: `Return ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    data: {
      orderId: order.id,
      returnStatus: updates.returnStatus
    }
  });
}));

/**
 * @route   POST /api/orders/:id/return/complete
 * @desc    Complete a return (vendor/admin confirms item received, triggers refund)
 * @access  Private
 */
router.post('/:id/return/complete', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const order = await Order.findByPk(id);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const vendorIds = order.vendorIds || [order.vendorId].filter(Boolean);
  const isVendor = vendorIds.includes(user.uid) || order.vendorId === user.uid;
  const isAdmin = user.role === 'admin';

  if (!isVendor && !isAdmin) {
    throw new AppError('Not authorized to complete returns', 403);
  }

  if (order.returnStatus !== 'approved') {
    throw new AppError('Return must be approved before completion', 400);
  }

  // Mark return as completed
  await order.update({
    returnStatus: 'completed'
  });

  // Process refund
  try {
    const refundResult = await processRefund({
      orderId: id,
      reason: order.returnReason || 'Return completed',
      initiatedBy: user.uid
    });

    res.json({
      success: true,
      message: 'Return completed and refund processed',
      data: {
        orderId: order.id,
        returnStatus: 'completed',
        refund: refundResult
      }
    });
  } catch (refundError) {
    // Return is completed but refund failed — admin can retry
    res.json({
      success: true,
      message: 'Return completed but refund failed. Admin can retry.',
      data: {
        orderId: order.id,
        returnStatus: 'completed',
        refundError: refundError.message
      }
    });
  }
}));

router.get('/summary/stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  const orders = await Order.findAll({ where: { buyerId: userId } });

  const stats = {
    totalOrders: orders.length,
    totalSpent: orders.reduce((sum, order) => sum + (order.total || 0), 0),
    pendingOrders: orders.filter(order => order.status === 'pending').length,
    completedOrders: orders.filter(order => order.status === 'delivered').length,
    cancelledOrders: orders.filter(order => order.status === 'cancelled').length
  };

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * @route   POST /api/orders/reserve
 * @desc    Reserve stock for checkout (pre-payment)
 * @access  Private
 */
router.post('/reserve', authenticateToken, [
  body('items').isArray({ min: 1 }),
  body('items.*.productId').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { items } = req.body;

  try {
    const reservations = await reserveStock(userId, items);
    res.json({
      success: true,
      message: 'Stock reserved for checkout',
      data: {
        reservations: reservations.map(r => ({
          id: r.id,
          productId: r.productId,
          quantity: r.quantity,
          expiresAt: r.expiresAt
        })),
        expiresInMinutes: 15
      }
    });
  } catch (stockError) {
    throw new AppError(stockError.message, 400);
  }
}));

/**
 * @route   POST /api/orders/reserve/release
 * @desc    Release stock reservations (user cancelled checkout)
 * @access  Private
 */
router.post('/reserve/release', authenticateToken, [
  body('productIds').optional().isArray(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { productIds } = req.body;

  await releaseReservations(userId, productIds || null);

  res.json({
    success: true,
    message: 'Stock reservations released'
  });
}));

/**
 * @route   GET /api/orders/track/:trackingId
 * @desc    Public tracking — anyone can track an order by tracking number or order ID
 * @access  Public
 */
router.get('/track/:trackingId', asyncHandler(async (req, res) => {
  const { trackingId } = req.params;
  const decoded = decodeURIComponent(trackingId).trim();

  if (!decoded) {
    throw new AppError('Tracking ID is required', 400);
  }

  // Try to find by trackingNumber first, then by orderNumber, then by PK
  let order = await Order.findOne({
    where: { trackingNumber: decoded }
  });

  if (!order) {
    order = await Order.findOne({
      where: { orderNumber: decoded }
    });
  }

  if (!order) {
    // Try by primary key (UUID)
    try {
      order = await Order.findByPk(decoded);
    } catch (e) {
      // Not a valid UUID — ignore
    }
  }

  if (!order) {
    throw new AppError('No order found with this tracking ID', 404);
  }

  const orderData = order.toJSON();

  // Fetch buyer info (public — name only)
  let buyerName = 'Customer';
  try {
    const buyer = await User.findByPk(orderData.buyerId, {
      attributes: ['firstName', 'lastName', 'profile']
    });
    if (buyer) {
      buyerName = [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') ||
        buyer.profile?.displayName || 'Customer';
    }
  } catch (e) {
    // ignore
  }

  // Build public-safe response (no sensitive data)
  const addr = orderData.shippingAddress || {};
  const items = (orderData.items || []).map(item => ({
    productName: item.productName || 'Product',
    productImage: item.productImage || null,
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice || 0,
    totalPrice: item.totalPrice || 0,
    status: item.status || 'pending'
  }));

  // Build status timeline from statusHistory if available
  const timeline = (orderData.statusHistory || []).map(h => ({
    status: h.status || h.orderStatus,
    timestamp: h.timestamp || h.changedAt,
    notes: h.notes || '',
    location: h.location || ''
  }));

  res.json({
    success: true,
    order: {
      trackingNumber: orderData.trackingNumber || orderData.id,
      orderNumber: orderData.orderNumber,
      status: orderData.status,
      paymentStatus: orderData.paymentStatus,
      buyerName,
      items,
      totalAmount: orderData.totalAmount,
      shippingAddress: {
        city: addr.city || '',
        state: addr.state || '',
        country: addr.country || 'Nigeria'
      },
      estimatedDelivery: orderData.estimatedDelivery,
      actualDelivery: orderData.actualDelivery,
      createdAt: orderData.createdAt,
      updatedAt: orderData.updatedAt,
      timeline
    }
  });
}));

/**
 * @route   POST /api/orders/dispute
 * @desc    Open a dispute on an order
 * @access  Private
 */
router.post('/dispute', authenticateToken, [
  body('orderId').notEmpty().withMessage('orderId is required'),
  body('reason').optional().isString(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { orderId, reason = 'unspecified', description = '' } = req.body;

  const order = await Order.findByPk(orderId);
  if (!order) throw new AppError('Order not found', 404);

  const isParty = [order.buyerId, order.vendorId].includes(req.user.id) || req.user.role === 'admin';
  if (!isParty) throw new AppError('Forbidden', 403);

  if (order.disputeStatus && order.disputeStatus !== 'none' && order.disputeStatus !== 'closed') {
    throw new AppError('A dispute is already open for this order', 409);
  }

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  history.push({
    status: 'dispute_opened',
    timestamp: new Date().toISOString(),
    notes: description || reason
  });

  await order.update({
    disputeStatus: 'open',
    disputeReason: `${reason}${description ? ` — ${description}` : ''}`,
    disputeCreatedAt: new Date(),
    statusHistory: history
  });

  // Notify admin-side via notification on the order's other party
  const notifyUserId = req.user.id === order.buyerId ? order.vendorId : order.buyerId;
  if (notifyUserId) {
    try {
      await createNotification({
        userId: notifyUserId,
        type: 'dispute_created',
        title: 'Dispute opened',
        message: `A dispute was opened for order ${order.orderNumber || order.id}: ${reason}`,
        data: { orderId: order.id }
      });
    } catch (e) { /* notification is best-effort */ }
  }

  res.status(201).json({ success: true, data: order, order });
}));

/**
 * @route   PATCH /api/orders/:id
 * @desc    Update order fields (admin) - used by admin dashboard for refunds/status/disputes
 * @access  Private (Admin)
 */
router.patch('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  const body = req.body || {};
  const updates = {};

  // 'refunded' maps to refund/payment status fields (not the order status enum)
  if (body.status && body.status !== 'refunded') {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'completed', 'escrow_funded'];
    if (validStatuses.includes(body.status)) {
      updates.status = body.status;
      updates.statusHistory = [...(order.statusHistory || []), { status: body.status, timestamp: new Date().toISOString(), updatedBy: user.uid, notes: body.notes }];
    }
  }
  if (body.status === 'refunded' || body.refundStatus === 'refunded') {
    updates.refundStatus = 'refunded';
    updates.paymentStatus = 'refunded';
    updates.refundedAt = body.refundedAt ? new Date(body.refundedAt) : new Date();
    if (body.refundAmount !== undefined) updates.refundAmount = parseFloat(body.refundAmount);
    if (body.refundReason) updates.refundReason = body.refundReason;
  }
  for (const f of ['refundStatus', 'refundAmount', 'refundReason', 'disputeStatus', 'disputeReason', 'disputeResolution', 'disputeCreatedAt', 'disputeResolvedAt', 'trackingNumber', 'carrier', 'estimatedDelivery']) {
    if (body[f] !== undefined) updates[f] = body[f];
  }
  if (body.disputeStatus === 'resolved' && !updates.disputeResolvedAt) updates.disputeResolvedAt = new Date();

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  await order.update(updates);
  res.json({ success: true, data: order.toJSON() });
}));

/**
 * @route   POST /api/orders/:id/resolve-dispute
 * @desc    Resolve an order dispute (admin or vendor)
 * @access  Private
 */
router.post('/:id/resolve-dispute', authenticateToken, asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  const isParty = [order.buyerId, order.vendorId].includes(req.user.id) || req.user.role === 'admin';
  if (!isParty) throw new AppError('Forbidden', 403);

  const { resolution = 'resolved', notes = '', refund = false } = req.body;

  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  history.push({
    status: 'dispute_resolved',
    timestamp: new Date().toISOString(),
    notes: `${resolution}${notes ? ` — ${notes}` : ''}`
  });

  const updates = {
    disputeStatus: 'resolved',
    disputeResolution: resolution,
    disputeResolvedAt: new Date(),
    statusHistory: history
  };

  if (refund === true || refund === 'full') {
    updates.refundStatus = 'pending_refund';
  }

  await order.update(updates);

  try {
    await createNotification({
      userId: order.buyerId,
      type: 'dispute_resolved',
      title: 'Dispute resolved',
      message: `The dispute for order ${order.orderNumber || order.id} was resolved: ${resolution}`,
      data: { orderId: order.id }
    });
  } catch (e) { /* notification is best-effort */ }

  res.json({ success: true, data: order, order });
}));

module.exports = router;
