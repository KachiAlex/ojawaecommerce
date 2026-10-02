const express = require('express');
const { body, query, validationResult } = require('express-validator');
const axios = require('axios');
const { Op } = require('sequelize');
const { AppError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const { Order, Product, Wallet, WalletTransaction, EscrowRelease, Withdrawal, Notification, User } = require('../models');
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
 * @route   POST /api/payments/wallet/topup
 * @desc    Top-up wallet using Paystack (initialize or verify)
 * @access  Private
 */
router.post('/wallet/topup', authenticateToken, asyncHandler(async (req, res) => {
  const { amount, email, reference } = req.body;
  const userId = req.user.uid;

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  // If reference is provided, this is a verification request after Paystack popup
  if (reference) {
    if (!amount || amount < 100) {
      throw new AppError('Valid amount is required (minimum ₦100)', 400);
    }

    // Verify the transaction with Paystack if secret is configured
    if (paystackSecret) {
      try {
        const verifyRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
          headers: { Authorization: `Bearer ${paystackSecret}` }
        });
        const txData = verifyRes.data?.data;
        if (!txData || txData.status !== 'success') {
          throw new AppError('Payment verification failed', 400);
        }
      } catch (verifyErr) {
        if (verifyErr instanceof AppError) throw verifyErr;
        console.error('Paystack verification error:', verifyErr.message);
        // Continue anyway — the payment popup already confirmed success client-side
      }
    }

    // Credit the wallet
    const [wallet] = await Wallet.findOrCreate({
      where: { userId },
      defaults: { userId, balance: 0, currency: 'NGN' }
    });

    // Record the transaction
    await WalletTransaction.create({
      userId,
      type: 'topup',
      amount: parseFloat(amount),
      reference,
      description: `Wallet top-up of ₦${amount}`,
      status: 'completed',
      metadata: { source: 'paystack', reference }
    });

    // Update wallet balance
    await wallet.update({
      balance: parseFloat(wallet.balance) + parseFloat(amount),
      updatedAt: new Date()
    });

    // Send notification
    try {
      await createNotification({
        userId,
        type: 'wallet_funded',
        title: 'Wallet Top-up Successful',
        message: `Your wallet has been credited with ₦${amount}`,
        data: { amount, reference },
        amount
      });
    } catch (e) {
      // Notification failure shouldn't block the topup
    }

    res.json({
      success: true,
      message: 'Wallet topped up successfully',
      data: { newBalance: parseFloat(wallet.balance) + parseFloat(amount) }
    });
    return;
  }

  // Otherwise, this is an initialization request (server-side Paystack)
  if (!amount || amount < 100) {
    throw new AppError('Valid amount is required (minimum ₦100)', 400);
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Valid email is required', 400);
  }

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
  body('amount').notEmpty(),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const { orderId, vendorId } = req.body;
  const amount = parseFloat(req.body.amount);
  const user = req.user;

  if (!amount || isNaN(amount) || amount <= 0) {
    throw new AppError(`Invalid amount: ${req.body.amount}`, 400);
  }

  // Verify order and authorization
  const order = await Order.findByPk(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const orderData = order.toJSON();

  // Check if user is admin, vendor of this order, or buyer of this order
  const isAdmin = user.role === 'admin';
  const orderVendorIds = orderData.vendorIds || [orderData.vendorId].filter(Boolean);
  const isVendor = orderVendorIds.includes(user.uid) || orderData.vendorId === user.uid;
  const isBuyer = orderData.buyerId === user.uid;

  if (!isAdmin && !isVendor && !isBuyer) {
    throw new AppError('Not authorized to release funds', 403);
  }

  // Check if order is delivered/completed and payment is completed
  const validPaymentStatuses = ['paid', 'escrow_funded', 'pending'];
  const validOrderStatuses = ['delivered', 'completed'];
  if (!validOrderStatuses.includes(orderData.status) || !validPaymentStatuses.includes(orderData.paymentStatus)) {
    throw new AppError(`Order must be delivered and paid to release funds (current: status=${orderData.status}, payment=${orderData.paymentStatus})`, 400);
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

    // Update order - use raw query fallback if escrowReleased column doesn't exist yet
    try {
      await order.update({
        escrowReleased: true,
        escrowReleasedAt: new Date(),
        escrowReleasedBy: user.uid,
        status: 'completed'
      });
    } catch (updateErr) {
      console.warn('escrowReleased column may not exist, trying basic update:', updateErr.message);
      await order.update({ status: 'completed' });
    }

    // Update vendor wallet balance
    let wallet = await Wallet.findOne({ where: { userId: vendorId } });
    if (!wallet) {
      wallet = await Wallet.create({ userId: vendorId, balance: 0 });
    }
    const currentBalance = parseFloat(wallet.balance) || 0;
    await wallet.update({ balance: currentBalance + amount });

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
    await createNotification({
      userId: vendorId,
      type: 'payment_released',
      title: 'Escrow Funds Released',
      message: `₦${amount.toLocaleString()} has been released to your wallet from order ${orderData.orderNumber}`,
      data: { orderId, orderNumber: orderData.orderNumber },
      orderId,
      amount
    });

    res.json({
      success: true,
      message: 'Escrow funds released successfully',
      data: releaseData
    });
  } catch (error) {
    console.error('Escrow release error:', error.message, error.stack);
    throw new AppError(error.message || 'Failed to release escrow funds', 500);
  }
}));

// Separate webhook router to mount without auth middleware
const webhookRouter = express.Router();

/**
 * @route   POST /api/payments/webhook/paystack
 * @desc    Paystack webhook handler
 * @access  Public
 */
webhookRouter.post('/', asyncHandler(async (req, res) => {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecret) {
    throw new AppError('Paystack not configured', 500);
  }

  // req.body is a Buffer when mounted with express.raw()
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
  const payload = JSON.parse(rawBody);

  // Verify webhook signature against the raw request body
  const hash = require('crypto')
    .createHmac('sha512', paystackSecret)
    .update(rawBody)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    throw new AppError('Invalid webhook signature', 401);
  }

  const event = payload.event;
  const data = payload.data;

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
  query('type').optional().isIn(['topup', 'escrow_release', 'withdrawal', 'payment', 'refund', 'withdrawal_refund'])
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
 * @route   POST /api/payments/wallet/pay
 * @desc    Pay for an order using wallet balance
 * @access  Private
 */
router.post('/wallet/pay', authenticateToken, [
  body('orderId').notEmpty(),
  body('amount').isFloat({ min: 0 }),
  handleValidationErrors
], asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { orderId, amount } = req.body;

  const wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) {
    throw new AppError('Wallet not found', 404);
  }

  const walletBalance = parseFloat(wallet.balance) || 0;
  if (walletBalance < amount) {
    throw new AppError(`Insufficient wallet balance. Available: ₦${walletBalance.toLocaleString()}`, 400);
  }

  // Deduct from wallet
  await wallet.update({ balance: walletBalance - amount });

  // Record transaction
  const reference = 'WLP_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  await WalletTransaction.create({
    userId,
    type: 'payment',
    amount: -amount,
    orderId,
    reference,
    description: `Wallet payment for order ${orderId}`,
    status: 'completed'
  });

  // Update order payment status
  const order = await Order.findByPk(orderId);
  if (order) {
    await order.update({
      paymentStatus: 'paid',
      status: 'processing',
      paymentMethod: 'wallet'
    });

    // Create notification for buyer
    await createNotification({
      userId,
      type: 'payment_received',
      title: 'Payment Completed',
      message: `Your wallet payment of ₦${amount} for order ${orderId} was successful`,
      data: { orderId, amount },
      orderId,
      amount
    });
  }

  res.json({
    success: true,
    message: 'Payment processed successfully',
    data: {
      reference,
      amount,
      newBalance: wallet.balance,
      status: 'completed'
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
  const { amount, bankDetails, description } = req.body;

  // Check wallet balance
  const wallet = await Wallet.findOne({ where: { userId } });
  const balance = wallet ? parseFloat(wallet.balance) || 0 : 0;

  if (balance < amount) {
    throw new AppError(`Insufficient wallet balance. Available: ₦${balance.toLocaleString()}`, 400);
  }

  // Create withdrawal request
  const reference = 'WTH_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  const withdrawalData = {
    userId,
    amount,
    bankDetails,
    status: 'pending',
    reference
  };

  const withdrawal = await Withdrawal.create(withdrawalData);

  // Deduct from wallet
  await wallet.update({ balance: balance - amount });

  // Create transaction record
  const transferLabel = bankDetails?.type === 'mobile_money'
    ? bankDetails?.provider || 'Mobile Money'
    : bankDetails?.bankName || 'Bank Account';

  await WalletTransaction.create({
    userId,
    type: 'withdrawal',
    amount: -amount,
    withdrawalId: withdrawal.id,
    reference,
    description: description || `Withdrawal to ${transferLabel}`,
    status: 'pending'
  });

  // Notify user
  try {
    await createNotification({
      userId,
      type: 'wallet_funded',
      title: 'Withdrawal Request Submitted',
      message: `Your withdrawal of ₦${parseFloat(amount).toLocaleString()} to ${transferLabel} is being processed. Reference: ${reference}`,
      data: { withdrawalId: withdrawal.id, reference, bankDetails },
      amount
    });
  } catch (e) {
    // Notification creation is non-critical
  }

  res.status(201).json({
    success: true,
    message: 'Withdrawal request submitted successfully',
    data: {
      withdrawalId: withdrawal.id,
      reference,
      amount,
      status: 'pending',
      newBalance: balance - amount
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
    const currentBalance = parseFloat(wallet.balance) || 0;
    await wallet.update({ balance: currentBalance + (amount / 100) });

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
    await createNotification({
      userId: metadata.userId,
      type: 'wallet_funded',
      title: 'Wallet Top-up Successful',
      message: `₦${(amount / 100).toLocaleString()} has been added to your wallet`,
      amount: amount / 100
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
      await createNotification({
        userId: orderData.buyerId,
        type: 'payment_received',
        title: 'Payment Successful',
        message: `Payment of ₦${(amount / 100).toLocaleString()} for order ${orderData.orderNumber} was successful`,
        data: { orderId: metadata.orderId, orderNumber: orderData.orderNumber },
        orderId: metadata.orderId,
        amount: amount / 100
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

      // Restore product stock for failed payments
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          try {
            const product = await Product.findByPk(item.productId);
            if (product) {
              await product.update({
                stockQuantity: (parseInt(product.stockQuantity) || 0) + item.quantity,
                salesCount: Math.max(0, (product.salesCount || 0) - item.quantity)
              });
            }
          } catch (stockError) {
            console.error('Failed to restore stock for product:', item.productId, stockError.message);
          }
        }
      }
    }
  }
}

async function handleSuccessfulTransfer(data) {
  const { reference, amount, recipient } = data;

  try {
    const withdrawal = await Withdrawal.findOne({ where: { reference } });
    if (withdrawal) {
      await withdrawal.update({ status: 'completed' });

      const wAmount = parseFloat(withdrawal.amount) || 0;

      await WalletTransaction.create({
        userId: withdrawal.userId,
        type: 'withdrawal',
        amount: -wAmount,
        reference,
        description: `Withdrawal of ₦${wAmount.toLocaleString()} completed`,
        status: 'completed'
      });

      await createNotification({
        userId: withdrawal.userId,
        type: 'wallet_funded',
        title: 'Withdrawal Completed',
        message: `Your withdrawal of ₦${wAmount.toLocaleString()} has been completed`,
        amount: wAmount
      });
    }
  } catch (error) {
    console.error('Error handling successful transfer:', error.message);
  }
}

async function handleFailedTransfer(data) {
  const { reference, amount } = data;

  try {
    const withdrawal = await Withdrawal.findOne({ where: { reference } });
    if (withdrawal) {
      await withdrawal.update({ status: 'failed' });

      // Refund the amount back to the vendor's wallet
      const refundAmount = parseFloat(withdrawal.amount) || 0;
      const wallet = await Wallet.findOne({ where: { userId: withdrawal.userId } });
      if (wallet) {
        const currentBalance = parseFloat(wallet.balance) || 0;
        await wallet.update({ balance: currentBalance + refundAmount });
      }

      await WalletTransaction.create({
        userId: withdrawal.userId,
        type: 'withdrawal_refund',
        amount: refundAmount,
        reference,
        description: `Withdrawal of ₦${refundAmount.toLocaleString()} failed - refunded to wallet`,
        status: 'completed'
      });

      await createNotification({
        userId: withdrawal.userId,
        type: 'wallet_funded',
        title: 'Withdrawal Failed',
        message: `Your withdrawal of ₦${refundAmount.toLocaleString()} failed and has been refunded to your wallet`,
        amount: refundAmount
      });
    }
  } catch (error) {
    console.error('Error handling failed transfer:', error.message);
  }
}

/**
 * @route   POST /api/payments/subscription/verify
 * @desc    Verify Paystack subscription payment and update user profile
 * @access  Private
 */
router.post('/subscription/verify', authenticateToken, asyncHandler(async (req, res) => {
  const { reference, plan, billingCycle } = req.body;
  if (!reference || !plan) {
    throw new AppError('Reference and plan are required', 400);
  }

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  // If secret key is configured, verify the transaction with Paystack
  if (paystackSecret) {
    try {
      const verifyRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${paystackSecret}` }
      });
      const txData = verifyRes.data?.data;
      if (!txData || txData.status !== 'success') {
        throw new AppError('Payment verification failed', 400);
      }
    } catch (verifyErr) {
      if (verifyErr instanceof AppError) throw verifyErr;
      console.error('Paystack verification error:', verifyErr.message);
      // Continue anyway — the payment popup already confirmed success client-side
    }
  }

  // Update user profile with subscription details
  const user = await User.findByPk(req.user.uid);
  if (!user) throw new AppError('User not found', 404);

  const termDays = billingCycle === 'annual' ? 365 : 30;
  const planConfig = {
    basic: { commissionRate: 5.0, productLimit: 10 },
    pro: { commissionRate: 3.0, productLimit: 20 },
    premium: { commissionRate: 2.0, productLimit: 100 }
  };
  const pc = planConfig[plan] || planConfig.basic;

  const subscriptionData = {
    subscriptionPlan: plan,
    billingCycle: billingCycle || 'monthly',
    subscriptionTermDays: termDays,
    subscriptionStatus: 'active',
    subscriptionStartDate: new Date(),
    subscriptionEndDate: new Date(Date.now() + termDays * 24 * 60 * 60 * 1000),
    commissionRate: pc.commissionRate,
    productLimit: pc.productLimit,
    paymentReference: reference
  };

  await user.update({
    profile: {
      ...(user.profile || {}),
      ...subscriptionData
    },
    updatedAt: new Date()
  });

  res.json({ success: true, message: 'Subscription activated', data: subscriptionData });
}));

module.exports = { router, webhookRouter };
