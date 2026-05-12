const express = require('express');
const { body, query, validationResult } = require('express-validator');
const axios = require('axios');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { Order, Wallet, WalletTransaction, EscrowRelease, Withdrawal, Notification } = require('../models');
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
 * @route   POST /api/payments/wallet/topup
 * @desc    Top-up wallet using Paystack
 * @access  Private
 */
router.post('/wallet/topup', authenticateToken, [
  body('amount').isFloat({ min: 100 }),
  body('email').isEmail(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { amount, email } = req.body;
  const userId = req.user.uid;

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecret) {
    throw new AppError('Paystack not configured', 500);
  }

  try {
    // Initialize Paystack transaction
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      amount: amount * 100, // Convert to kobo
      email,
      reference: 'WALLET_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      callback_url: `${process.env.FRONTEND_URL}/wallet/success`,
      metadata: {
        userId,
        type: 'wallet_topup',
        custom_fields: [
          {
            display_name: "Wallet Top-up",
            variable_name: "wallet_topup",
            value: `Top-up of ₦${amount}`
          }
        ]
      }
    }, {
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json'
      }
    });

    const { data } = response.data;

    res.json({
      success: true,
      data: {
        authorization_url: data.authorization_url,
        reference: data.reference,
        access_code: data.access_code
      }
    });
  } catch (error) {
    console.error('Paystack initialization error:', error.response?.data || error.message);
    throw new AppError('Failed to initialize payment', 500);
  }
}));

/**
 * @route   POST /api/payments/escrow/create
 * @desc    Create escrow order for payment
 * @access  Private
 */
router.post('/escrow/create', authenticateToken, [
  body('orderId').notEmpty(),
  body('amount').isFloat({ min: 0 }),
  body('email').isEmail(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { orderId, amount, email } = req.body;
  const userId = req.user.uid;

  // Verify order exists and belongs to user
  const order = await Order.findByPk(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const orderData = order.toJSON();
  if (orderData.buyerId !== userId) {
    throw new AppError('Not authorized', 403);
  }

  if (orderData.paymentStatus === 'paid') {
    throw new AppError('Order already paid', 400);
  }

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecret) {
    throw new AppError('Paystack not configured', 500);
  }

  try {
    // Initialize Paystack transaction for escrow
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      amount: amount * 100, // Convert to kobo
      email,
      reference: 'ESCROW_' + orderId + '_' + Date.now(),
      callback_url: `${process.env.FRONTEND_URL}/payment/success`,
      metadata: {
        userId,
        orderId,
        type: 'escrow_payment',
        custom_fields: [
          {
            display_name: "Order Payment",
            variable_name: "order_payment",
            value: `Payment for order ${orderData.orderNumber}`
          }
        ]
      }
    }, {
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json'
      }
    });

    const { data } = response.data;

    // Update order with payment reference
    await order.update({
      paymentReference: data.reference,
      paymentMethod: 'paystack'
    });

    res.json({
      success: true,
      data: {
        authorization_url: data.authorization_url,
        reference: data.reference,
        access_code: data.access_code
      }
    });
  } catch (error) {
    console.error('Escrow payment initialization error:', error.response?.data || error.message);
    throw new AppError('Failed to initialize escrow payment', 500);
  }
}));

/**
 * @route   POST /api/payments/escrow/release
 * @desc    Release escrow funds to vendor
 * @access  Private (admin or vendor)
 */
router.post('/escrow/release', authenticateToken, [
  body('orderId').notEmpty(),
  body('vendorId').notEmpty(),
  body('amount').isFloat({ min: 0 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { orderId, vendorId, amount } = req.body;
  const user = req.user;

  // Verify order and authorization
  const order = await Order.findByPk(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const orderData = order.toJSON();

  // Check if user is admin or vendor of this order
  const isAdmin = user.role === 'admin';
  const isVendor = orderData.vendorIds.includes(user.uid);

  if (!isAdmin && !isVendor) {
    throw new AppError('Not authorized to release funds', 403);
  }

  // Check if order is delivered and payment is completed
  if (orderData.orderStatus !== 'delivered' || orderData.paymentStatus !== 'paid') {
    throw new AppError('Order must be delivered and paid to release funds', 400);
  }

  // Check if funds already released
  if (orderData.escrowReleased) {
    throw new AppError('Funds already released', 400);
  }

  try {
    // Create transfer to vendor (this would integrate with Paystack Transfers)
    // For now, we'll just record the release in the database
    
    const releaseData = {
      orderId,
      vendorId,
      amount,
      releasedBy: user.uid,
      releasedByName: user.displayName || user.email,
      status: 'completed'
    };

    // Record escrow release
    await EscrowRelease.create(releaseData);

    // Update order status
    await order.update({
      escrowReleased: true,
      escrowReleasedAt: new Date(),
      escrowReleasedBy: user.uid
    });

    // Update vendor wallet balance
    let wallet = await Wallet.findOne({ where: { userId: vendorId } });
    if (!wallet) {
      wallet = await Wallet.create({ userId: vendorId, balance: 0 });
    }
    await wallet.update({ balance: wallet.balance + amount });

    // Create transaction record
    await WalletTransaction.create({
      userId: vendorId,
      type: 'escrow_release',
      amount,
      orderId,
      description: `Escrow release for order ${orderData.orderNumber}`,
      status: 'completed'
    });

    // Notify vendor
    await Notification.create({
      userId: vendorId,
      type: 'escrow_released',
      title: 'Escrow Funds Released',
      message: `₦${amount.toLocaleString()} has been released to your wallet from order ${orderData.orderNumber}`,
      orderId,
      amount,
      read: false
    });

    res.json({
      success: true,
      message: 'Escrow funds released successfully',
      data: releaseData
    });
  } catch (error) {
    console.error('Escrow release error:', error);
    throw new AppError('Failed to release escrow funds', 500);
  }
}));

/**
 * @route   POST /api/payments/webhook/paystack
 * @desc    Paystack webhook handler
 * @access  Public
 */
router.post('/webhook/paystack', asyncHandler(async (req, res) => {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecret) {
    throw new AppError('Paystack not configured', 500);
  }

  // Verify webhook signature
  const hash = require('crypto')
    .createHmac('sha512', paystackSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    throw new AppError('Invalid webhook signature', 401);
  }

  const event = req.body.event;
  const data = req.body.data;

  try {
    switch (event) {
      case 'charge.success':
        await handleSuccessfulPayment(data);
        break;
      case 'charge.failed':
        await handleFailedPayment(data);
        break;
      case 'transfer.success':
        await handleSuccessfulTransfer(data);
        break;
      case 'transfer.failed':
        await handleFailedTransfer(data);
        break;
      default:
        console.log('Unhandled webhook event:', event);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.sendStatus(500);
  }
}));

/**
 * @route   GET /api/payments/wallet/balance
 * @desc    Get wallet balance
 * @access  Private
 */
router.get('/wallet/balance', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.uid;

  const wallet = await Wallet.findOne({ where: { userId } });
  
  const balance = wallet ? wallet.balance : 0;

  res.json({
    success: true,
    data: {
      balance,
      currency: 'NGN'
    }
  });
}));

/**
 * @route   GET /api/payments/wallet/transactions
 * @desc    Get wallet transaction history
 * @access  Private
 */
router.get('/wallet/transactions', authenticateToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('type').optional().isIn(['topup', 'escrow_release', 'withdrawal', 'payment'])
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { page = 1, limit = 20, type } = req.query;

  const where = { userId };
  if (type) {
    where.type = type;
  }

  const limitInt = parseInt(limit);
  const pageInt = parseInt(page);
  const offset = (pageInt - 1) * limitInt;

  const transactions = await WalletTransaction.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: limitInt,
    offset
  });

  const total = await WalletTransaction.count({ where });

  res.json({
    success: true,
    data: {
      transactions: transactions.map(t => t.toJSON()),
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
 * @route   POST /api/payments/withdraw
 * @desc    Withdraw from wallet
 * @access  Private
 */
router.post('/withdraw', authenticateToken, [
  body('amount').isFloat({ min: 1000 }),
  body('bankDetails').isObject(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { amount, bankDetails } = req.body;

  // Check wallet balance
  const wallet = await Wallet.findOne({ where: { userId } });
  const balance = wallet ? wallet.balance : 0;

  if (balance < amount) {
    throw new AppError('Insufficient wallet balance', 400);
  }

  // Create withdrawal request
  const withdrawalData = {
    userId,
    amount,
    bankDetails,
    status: 'pending',
    reference: 'WTH_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase()
  };

  const withdrawal = await Withdrawal.create(withdrawalData);

  // Deduct from wallet (will be returned if withdrawal fails)
  await wallet.update({ balance: wallet.balance - amount });

  // Create transaction record
  await WalletTransaction.create({
    userId,
    type: 'withdrawal',
    amount: -amount,
    withdrawalId: withdrawal.id,
    reference: withdrawalData.reference,
    description: `Withdrawal of ₦${amount}`,
    status: 'pending'
  });

  res.status(201).json({
    success: true,
    message: 'Withdrawal request submitted successfully',
    data: {
      withdrawalId: withdrawal.id,
      reference: withdrawalData.reference,
      amount,
      status: 'pending'
    }
  });
}));

// Helper functions for webhook handling
async function handleSuccessfulPayment(data) {
  const { reference, metadata, amount, customer } = data;

  if (metadata?.type === 'wallet_topup') {
    // Process wallet top-up
    let wallet = await Wallet.findOne({ where: { userId: metadata.userId } });
    if (!wallet) {
      wallet = await Wallet.create({ userId: metadata.userId, balance: 0 });
    }
    await wallet.update({ balance: wallet.balance + (amount / 100) });

    // Record transaction
    await WalletTransaction.create({
      userId: metadata.userId,
      type: 'topup',
      amount: amount / 100,
      reference,
      description: 'Wallet top-up',
      status: 'completed'
    });

    // Notify user
    await Notification.create({
      userId: metadata.userId,
      type: 'wallet_topup',
      title: 'Wallet Top-up Successful',
      message: `₦${(amount / 100).toLocaleString()} has been added to your wallet`,
      amount: amount / 100,
      read: false
    });
  } else if (metadata?.type === 'escrow_payment') {
    // Process escrow payment
    const order = await Order.findByPk(metadata.orderId);
    if (order) {
      await order.update({
        paymentStatus: 'paid',
        paymentReference: reference,
        paidAt: new Date()
      });

      const orderData = order.toJSON();

      // Buyer notification
      await Notification.create({
        userId: orderData.buyerId,
        type: 'payment_successful',
        title: 'Payment Successful',
        message: `Payment of ₦${(amount / 100).toLocaleString()} for order ${orderData.orderNumber} was successful`,
        orderId: metadata.orderId,
        orderNumber: orderData.orderNumber,
        amount: amount / 100,
        read: false
      });
    }
  }
}

async function handleFailedPayment(data) {
  const { reference, metadata } = data;

  if (metadata?.orderId) {
    // Update order payment status
    const order = await Order.findByPk(metadata.orderId);
    if (order) {
      await order.update({
        paymentStatus: 'failed',
        paymentReference: reference
      });
    }
  }
}

async function handleSuccessfulTransfer(data) {
  // Handle successful transfers (vendor payouts)
  console.log('Transfer successful:', data);
}

async function handleFailedTransfer(data) {
  // Handle failed transfers (refund to wallet)
  console.log('Transfer failed:', data);
}

module.exports = router;
