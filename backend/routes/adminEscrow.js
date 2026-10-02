const express = require('express');
const { Order, Wallet, WalletTransaction, EscrowRelease } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/backfill-escrow', authenticateToken, asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const completedOrders = await Order.findAll({
    where: { status: 'completed' }
  });

  const results = { total: completedOrders.length, fixed: 0, skipped: 0, errors: [] };

  for (const order of completedOrders) {
    const orderData = order.toJSON();
    const vendorId = orderData.vendorId;
    const amount = parseFloat(orderData.totalAmount) || 0;

    if (!vendorId || amount <= 0) {
      results.errors.push({ orderId: orderData.id, reason: `Invalid vendorId or amount: ${vendorId}, ${amount}` });
      continue;
    }

    // Check if wallet transaction already exists for this order
    const existingTxn = await WalletTransaction.findOne({
      where: { orderId: orderData.id, type: 'escrow_release' }
    });

    if (existingTxn) {
      results.skipped++;
      continue;
    }

    // Check if EscrowRelease record exists
    const existingRelease = await EscrowRelease.findOne({ where: { orderId: orderData.id } });

    try {
      if (!existingRelease) {
        await EscrowRelease.create({
          orderId: orderData.id,
          vendorId,
          amount,
          releasedBy: user.uid,
          releasedByName: user.displayName || user.email || 'admin',
          status: 'completed'
        });
      }

      // Update order flag if not set
      if (!orderData.escrowReleased) {
        try {
          await order.update({
            escrowReleased: true,
            escrowReleasedAt: new Date(),
            escrowReleasedBy: user.uid
          });
        } catch (e) {
          // Column may not exist
        }
      }

      // Credit vendor wallet
      let wallet = await Wallet.findOne({ where: { userId: vendorId } });
      if (!wallet) {
        wallet = await Wallet.create({ userId: vendorId, balance: 0, currency: 'NGN' });
      }
      const currentBalance = parseFloat(wallet.balance) || 0;
      await wallet.update({ balance: currentBalance + amount });

      // Create wallet transaction
      await WalletTransaction.create({
        userId: vendorId,
        type: 'escrow_release',
        amount,
        orderId: orderData.id,
        description: `Escrow release for order ${orderData.orderNumber || orderData.id}`,
        status: 'completed'
      });

      results.fixed++;
    } catch (err) {
      results.errors.push({ orderId: orderData.id, reason: err.message });
    }
  }

  res.json({ success: true, results });
}));

module.exports = router;
