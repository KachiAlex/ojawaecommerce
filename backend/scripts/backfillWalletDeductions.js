require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const FALLBACK_DATABASE_URL = 'postgresql://neondb_owner:npg_Da79GjxwVoIM@ep-flat-surf-ap5wq3vs-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'null' || process.env.DATABASE_URL === 'undefined') {
  process.env.DATABASE_URL = FALLBACK_DATABASE_URL;
}

const { sequelize } = require('../config/database');
const OrderDef = require('../models/Order');
const WalletDef = require('../models/Wallet');
const WalletTransactionDef = require('../models/WalletTransaction');
const NotificationDef = require('../models/Notification');

async function backfillWalletDeductions() {
  await sequelize.authenticate();
  console.log('Connected to database');

  const Order = OrderDef.init(sequelize);
  const Wallet = WalletDef.init(sequelize);
  const WalletTransaction = WalletTransactionDef.init(sequelize);
  const Notification = NotificationDef.init(sequelize);

  // Find orders paid via wallet/escrow that are still 'pending' (wallet was never deducted)
  const orders = await Order.findAll({
    where: {
      paymentMethod: ['wallet', 'escrow'],
      paymentStatus: 'pending'
    },
    order: [['createdAt', 'ASC']]
  });

  console.log(`Found ${orders.length} orders with pending wallet/escrow payment`);

  if (orders.length === 0) {
    console.log('No orders need backfilling. Done.');
    process.exit(0);
  }

  for (const order of orders) {
    const totalAmount = parseFloat(order.totalAmount);
    const userId = order.buyerId;
    const orderNumber = order.orderNumber || order.id;

    console.log(`\nProcessing order ${order.id} (${orderNumber}) - ₦${totalAmount.toFixed(2)} for user ${userId}`);

    // Check if a WalletTransaction already exists for this order (avoid double-deduct)
    const existingTxn = await WalletTransaction.findOne({
      where: { orderId: order.id, type: 'payment' }
    });

    if (existingTxn) {
      console.log(`  SKIP: WalletTransaction already exists (ref: ${existingTxn.reference})`);
      // Still update order status if needed
      if (order.paymentStatus === 'pending') {
        await order.update({ paymentStatus: 'paid', status: 'processing' });
        console.log('  Updated order paymentStatus to paid (transaction already existed)');
      }
      continue;
    }

    // Find wallet
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) {
      console.log(`  ERROR: No wallet found for user ${userId}. Skipping.`);
      continue;
    }

    const currentBalance = parseFloat(wallet.balance);
    console.log(`  Current wallet balance: ₦${currentBalance.toFixed(2)}`);

    if (currentBalance < totalAmount) {
      console.log(`  WARNING: Insufficient balance (₦${currentBalance.toFixed(2)} < ₦${totalAmount.toFixed(2)}). Deducting anyway (balance will go negative).`);
    }

    const newBalance = currentBalance - totalAmount;
    await wallet.update({ balance: newBalance });
    console.log(`  Deducted ₦${totalAmount.toFixed(2)} from wallet. New balance: ₦${newBalance.toFixed(2)}`);

    const reference = 'WLP_BACKFILL_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    await WalletTransaction.create({
      userId,
      type: 'payment',
      amount: -totalAmount,
      orderId: order.id,
      reference,
      description: `Wallet payment for order ${orderNumber} (backfilled)`,
      status: 'completed',
      metadata: { orderNumber, backfilled: true }
    });
    console.log(`  Created WalletTransaction (ref: ${reference})`);

    // Update order payment status
    await order.update({
      paymentStatus: 'paid',
      status: 'processing',
      paymentReference: reference
    });
    console.log(`  Updated order status to 'processing', paymentStatus to 'paid'`);

    // Create notification
    await Notification.create({
      userId,
      type: 'payment',
      title: 'Payment Completed',
      message: `Your wallet payment of ₦${totalAmount.toFixed(2)} for order ${orderNumber} was processed. New balance: ₦${newBalance.toFixed(2)}`,
      data: { orderId: order.id, orderNumber, amount: totalAmount, newBalance, reference, backfilled: true },
      isRead: false
    });
    console.log(`  Created payment notification for user`);
  }

  console.log('\nBackfill complete!');
  process.exit(0);
}

backfillWalletDeductions().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
