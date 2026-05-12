const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { Order, Product, Notification, Cart } = require('../models');
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
  body('deliveryOption').isIn(['standard', 'express']),
  body('paymentMethod').isIn(['wallet', 'paystack', 'flutterwave']),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const {
    items,
    deliveryAddress,
    deliveryOption = 'standard',
    paymentMethod,
    notes = '',
    couponCode = null
  } = req.body;

  // Verify all products and calculate totals
  let subtotal = 0;
  const orderItems = [];
  const vendorIds = new Set();

  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    
    if (!product) {
      throw new AppError(`Product ${item.productId} not found`, 400);
    }

    // Check product availability
    if (product.status !== 'active') {
      throw new AppError(`Product ${product.name} is not available`, 400);
    }

    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}. Available: ${product.stock}`, 400);
    }

    // Verify price
    const currentPrice = product.price;
    if (Math.abs(item.price - currentPrice) > 0.01) {
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
  const shippingCost = deliveryOption === 'express' ? 1500 : 500;
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + shippingCost + tax;

  // Generate order number
  const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  // Create order
  const orderData = {
    orderNumber,
    buyerId: userId,
    buyerEmail: req.user.email,
    buyerName: req.user.displayName || req.user.email,
    items: orderItems,
    deliveryAddress,
    deliveryOption,
    paymentMethod,
    paymentStatus: 'pending',
    orderStatus: 'pending',
    subtotal,
    shippingCost,
    tax,
    total,
    notes,
    couponCode,
    vendorIds: Array.from(vendorIds)
  };

  const order = await Order.create(orderData);

  // Update product stock
  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    await product.update({
      stock: product.stock - item.quantity,
      salesCount: (product.salesCount || 0) + item.quantity
    });
  }

  // Clear user's cart
  await Cart.destroy({ where: { userId } });

  // Create notifications for vendors
  for (const vendorId of vendorIds) {
    const vendorItems = orderItems.filter(item => item.vendorId === vendorId);
    await Notification.create({
      userId: vendorId,
      type: 'new_order',
      title: 'New Order Received',
      message: `You have received a new order (${orderNumber}) containing ${vendorItems.length} item(s)`,
      orderId: order.id,
      orderNumber,
      itemCount: vendorItems.length,
      totalAmount: vendorItems.reduce((sum, item) => sum + item.totalPrice, 0),
      read: false
    });
  }

  // Create order confirmation notification for buyer
  await Notification.create({
    userId,
    type: 'order_confirmation',
    title: 'Order Placed Successfully',
    message: `Your order ${orderNumber} has been placed successfully`,
    orderId: order.id,
    orderNumber,
    totalAmount: total,
    read: false
  });

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      orderId: order.id,
      orderNumber,
      ...orderData
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
    where.orderStatus = status;
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
  const isVendor = orderData.vendorIds.includes(user.uid);
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

  const currentStatus = orderData.orderStatus;
  const allowedStatuses = validTransitions[currentStatus] || [];

  if (!allowedStatuses.includes(status)) {
    throw new AppError(`Cannot change order status from ${currentStatus} to ${status}`, 400);
  }

  const updates = { orderStatus: status };

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
  await Notification.create({
    userId: orderData.buyerId,
    type: 'order_status_update',
    title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your order ${orderData.orderNumber} has been ${status}`,
    orderId: order.id,
    orderNumber: orderData.orderNumber,
    status,
    read: false
  });

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
  if (orderData.orderStatus !== 'pending') {
    throw new AppError('Order can only be cancelled while pending', 400);
  }

  // Update order status
  await order.update({
    orderStatus: 'cancelled',
    cancellationReason: reason || 'Cancelled by buyer',
    cancelledAt: new Date()
  });

  // Restore product stock
  for (const item of orderData.items) {
    const product = await Product.findByPk(item.productId);
    await product.update({
      stock: product.stock + item.quantity,
      salesCount: (product.salesCount || 0) - item.quantity
    });
  }

  // Notify vendors
  for (const vendorId of orderData.vendorIds) {
    await Notification.create({
      userId: vendorId,
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message: `Order ${orderData.orderNumber} has been cancelled by the buyer`,
      orderId: order.id,
      orderNumber: orderData.orderNumber,
      reason: reason || 'Cancelled by buyer',
      read: false
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
router.get('/summary/stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  const orders = await Order.findAll({ where: { buyerId: userId } });

  const stats = {
    totalOrders: orders.length,
    totalSpent: orders.reduce((sum, order) => sum + (order.total || 0), 0),
    pendingOrders: orders.filter(order => order.orderStatus === 'pending').length,
    completedOrders: orders.filter(order => order.orderStatus === 'delivered').length,
    cancelledOrders: orders.filter(order => order.orderStatus === 'cancelled').length
  };

  res.json({
    success: true,
    data: stats
  });
}));

module.exports = router;
