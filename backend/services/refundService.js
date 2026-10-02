const { Order, Wallet, WalletTransaction, Notification } = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * Process a refund for an order.
 * Supports wallet refunds (instant) and Paystack refunds (async via API).
 */
async function processRefund({ orderId, reason, initiatedBy, amount = null }) {
  const order = await Order.findByPk(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.paymentStatus !== 'paid') {
    throw new AppError('Only paid orders can be refunded', 400);
  }

  if (order.refundStatus === 'refunded') {
    throw new AppError('Order has already been fully refunded', 400);
  }

  const refundAmount = parseFloat(amount || order.total) || 0;
  const userId = order.buyerId;
  const refundReason = reason || 'Refund requested';

  let refundResult;

  switch (order.paymentMethod) {
    case 'wallet': {
      // Instant wallet refund
      const wallet = await Wallet.findOne({ where: { userId } });
      if (wallet) {
        const currentBalance = parseFloat(wallet.balance) || 0;
        await wallet.update({ balance: currentBalance + refundAmount });
      } else {
        await Wallet.create({
          userId,
          balance: refundAmount,
          currency: 'NGN'
        });
      }

      const reference = `REF_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      await WalletTransaction.create({
        userId,
        type: 'refund',
        amount: refundAmount,
        orderId,
        reference,
        description: `Refund for order ${order.orderNumber}: ${refundReason}`,
        status: 'completed'
      });

      refundResult = {
        status: 'completed',
        method: 'wallet',
        reference,
        refundedAt: new Date()
      };
      break;
    }

    case 'paystack':
    case 'escrow': {
      // Paystack refund must be initiated via API
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) {
        throw new AppError('Paystack not configured for refunds', 500);
      }

      const axios = require('axios');
      const paystackResponse = await axios.post(
        'https://api.paystack.co/refund',
        {
          transaction: order.paymentReference || order.paymentId,
          amount: Math.round(refundAmount * 100) // kobo
        },
        {
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (paystackResponse.data.status) {
        refundResult = {
          status: 'pending',
          method: 'paystack',
          reference: paystackResponse.data.data?.reference,
          paystackRefundId: paystackResponse.data.data?.id,
          refundedAt: new Date()
        };
      } else {
        throw new AppError('Paystack refund failed', 500);
      }
      break;
    }

    default:
      throw new AppError(`Refunds not supported for payment method: ${order.paymentMethod}`, 400);
  }

  // Update order
  await order.update({
    refundStatus: refundResult.status === 'completed' ? 'refunded' : 'pending_refund',
    refundAmount: refundAmount,
    refundReason,
    refundedAt: refundResult.refundedAt,
    refundReference: refundResult.reference,
    paymentStatus: refundResult.status === 'completed' ? 'refunded' : order.paymentStatus
  });

  // Notify buyer
  await Notification.create({
    userId,
    type: 'refund_processed',
    title: 'Refund Processed',
    message: `A refund of ₦${refundAmount} for order ${order.orderNumber} has been initiated. Status: ${refundResult.status}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: refundAmount,
    isRead: false
  });

  return {
    success: true,
    orderId,
    refundAmount,
    ...refundResult
  };
}

/**
 * Handle Paystack refund webhook / status update.
 */
async function handlePaystackRefundUpdate(paystackRefundId, status, amount) {
  // Find order by refund reference or payment reference
  const order = await Order.findOne({
    where: {
      refundReference: paystackRefundId
    }
  });

  if (!order) {
    console.warn('Paystack refund update for unknown order:', paystackRefundId);
    return null;
  }

  if (status === 'success' || status === 'processed') {
    await order.update({
      refundStatus: 'refunded',
      paymentStatus: 'refunded'
    });

    await Notification.create({
      userId: order.buyerId,
      type: 'refund_completed',
      title: 'Refund Completed',
      message: `Your refund of ₦${amount / 100} for order ${order.orderNumber} is complete.`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: amount / 100,
      isRead: false
    });
  } else if (status === 'failed') {
    await order.update({
      refundStatus: 'refund_failed'
    });
  }

  return order;
}

module.exports = {
  processRefund,
  handlePaystackRefundUpdate
};
