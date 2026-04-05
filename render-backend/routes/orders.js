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
    const productDoc = await db.collection('products').doc(item.productId).get();
    
    if (!productDoc.exists) {
      throw new AppError(`Product ${item.productId} not found`, 400);
    }

    const product = productDoc.data();

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
    vendorIds: Array.from(vendorIds),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const orderRef = await db.collection('orders').add(orderData);

  // Update product stock
  for (const item of items) {
    await db.collection('products').doc(item.productId).update({
      stock: admin.firestore.FieldValue.increment(-item.quantity),
      salesCount: admin.firestore.FieldValue.increment(item.quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  // Clear user's cart
  await db.collection('carts').doc(userId).delete();

  // Create notifications for vendors
  const vendorNotifications = [];
  for (const vendorId of vendorIds) {
    const vendorItems = orderItems.filter(item => item.vendorId === vendorId);
    
    vendorNotifications.push(
      db.collection('notifications').add({
        userId: vendorId,
        type: 'new_order',
        title: 'New Order Received',
        message: `You have received a new order (${orderNumber}) containing ${vendorItems.length} item(s)`,
        orderId: orderRef.id,
        orderNumber,
        itemCount: vendorItems.length,
        totalAmount: vendorItems.reduce((sum, item) => sum + item.totalPrice, 0),
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
    );
  }

  await Promise.all(vendorNotifications);

  // Create order confirmation notification for buyer
  await db.collection('notifications').add({
    userId,
    type: 'order_confirmation',
    title: 'Order Placed Successfully',
    message: `Your order ${orderNumber} has been placed successfully`,
    orderId: orderRef.id,
    orderNumber,
    totalAmount: total,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      orderId: orderRef.id,
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

  // Build query
  let query = db.collection('orders').where('buyerId', '==', userId);

  if (status) {
    query = query.where('orderStatus', '==', status);
  }

  // Apply sorting
  const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
  query = query.orderBy(sortBy, sortDirection);

  // Pagination
  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  // Get total count
  const countQuery = query;
  const countSnapshot = await countQuery.get();
  const total = countSnapshot.size;

  // Apply pagination
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

  const orderDoc = await db.collection('orders').doc(id).get();
  
  if (!orderDoc.exists) {
    throw new AppError('Order not found', 404);
  }

  const order = {
    id: orderDoc.id,
    ...orderDoc.data()
  };

  // Check ownership
  if (order.buyerId !== userId && req.user.role !== 'admin') {
    throw new AppError('Not authorized to view this order', 403);
  }

  // Convert timestamps
  if (order.createdAt) {
    order.createdAt = order.createdAt.toDate?.() || order.createdAt;
  }
  if (order.updatedAt) {
    order.updatedAt = order.updatedAt.toDate?.() || order.updatedAt;
  }

  res.json({
    success: true,
    data: order
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

  const orderDoc = await db.collection('orders').doc(id).get();
  
  if (!orderDoc.exists) {
    throw new AppError('Order not found', 404);
  }

  const order = orderDoc.data();

  // Check authorization (vendor or admin)
  const isVendor = order.vendorIds.includes(user.uid);
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

  const currentStatus = order.orderStatus;
  const allowedStatuses = validTransitions[currentStatus] || [];

  if (!allowedStatuses.includes(status)) {
    throw new AppError(`Cannot change order status from ${currentStatus} to ${status}`, 400);
  }

  const updates = {
    orderStatus: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

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
    changedAt: admin.firestore.FieldValue.serverTimestamp(),
    notes: notes || ''
  };

  updates.statusHistory = admin.firestore.FieldValue.arrayUnion(statusLog);

  await db.collection('orders').doc(id).update(updates);

  // Notify buyer of status change
  await db.collection('notifications').add({
    userId: order.buyerId,
    type: 'order_status_update',
    title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your order ${order.orderNumber} has been ${status}`,
    orderId: id,
    orderNumber: order.orderNumber,
    status,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Get updated order
  const updatedOrderDoc = await db.collection('orders').doc(id).get();
  const updatedOrder = {
    id: updatedOrderDoc.id,
    ...updatedOrderDoc.data()
  };

  res.json({
    success: true,
    message: `Order status updated to ${status}`,
    data: updatedOrder
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

  const orderDoc = await db.collection('orders').doc(id).get();
  
  if (!orderDoc.exists) {
    throw new AppError('Order not found', 404);
  }

  const order = orderDoc.data();

  // Check ownership
  if (order.buyerId !== userId) {
    throw new AppError('Not authorized to cancel this order', 403);
  }

  // Check if order can be cancelled
  if (order.orderStatus !== 'pending') {
    throw new AppError('Order can only be cancelled while pending', 400);
  }

  // Update order status
  await db.collection('orders').doc(id).update({
    orderStatus: 'cancelled',
    cancellationReason: reason || 'Cancelled by buyer',
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Restore product stock
  for (const item of order.items) {
    await db.collection('products').doc(item.productId).update({
      stock: admin.firestore.FieldValue.increment(item.quantity),
      salesCount: admin.firestore.FieldValue.increment(-item.quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  // Notify vendors
  for (const vendorId of order.vendorIds) {
    await db.collection('notifications').add({
      userId: vendorId,
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message: `Order ${order.orderNumber} has been cancelled by the buyer`,
      orderId: id,
      orderNumber: order.orderNumber,
      reason: reason || 'Cancelled by buyer',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
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

  const ordersSnapshot = await db.collection('orders')
    .where('buyerId', '==', userId)
    .get();

  const orders = ordersSnapshot.docs.map(doc => doc.data());

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
