/**
 * Backfill logisticsPartnerId on existing orders.
 * 
 * This script finds orders that have logistics info in their items or metadata
 * but don't have logisticsPartnerId set, and attempts to assign the correct partner.
 * 
 * It also can manually assign a specific order to a specific logistics partner.
 * 
 * Usage:
 *   node scripts/backfillLogisticsPartner.js                    # List orders without logisticsPartnerId
 *   node scripts/backfillLogisticsPartner.js --orderId=XXX --partnerId=YYY  # Manually assign
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
const envFiles = ['.env', '.env.local'];
envFiles.forEach((file) => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    require('dotenv').config({ path: fullPath, override: true });
  }
});

const { sequelize, Order, User, LogisticsRoute } = require('../models');

async function main() {
  await sequelize.authenticate();
  console.log('✅ Database connected\n');

  // Parse command line args
  const args = process.argv.slice(2);
  const orderIdArg = args.find(a => a.startsWith('--orderId='))?.split('=')[1];
  const partnerIdArg = args.find(a => a.startsWith('--partnerId='))?.split('=')[1];

  if (orderIdArg && partnerIdArg) {
    // Manual assignment
    console.log(`📋 Manually assigning order ${orderIdArg} to logistics partner ${partnerIdArg}`);
    const order = await Order.findByPk(orderIdArg);
    if (!order) {
      console.error('❌ Order not found');
      process.exit(1);
    }
    await order.update({ logisticsPartnerId: partnerIdArg });
    console.log('✅ Order updated successfully');
    process.exit(0);
  }

  // List orders without logisticsPartnerId
  const orders = await Order.findAll({
    where: { logisticsPartnerId: null },
    attributes: ['id', 'orderNumber', 'buyerId', 'vendorId', 'status', 'paymentStatus', 'shippingAddress', 'items', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  console.log(`📦 Found ${orders.length} orders without logisticsPartnerId\n`);

  for (const order of orders) {
    const addr = order.shippingAddress || {};
    const items = order.items || [];
    console.log(`Order: ${order.orderNumber || order.id}`);
    console.log(`  Status: ${order.status} | Payment: ${order.paymentStatus}`);
    console.log(`  Buyer: ${order.buyerId}`);
    console.log(`  Vendor: ${order.vendorId}`);
    console.log(`  Shipping: ${JSON.stringify(addr)}`);
    console.log(`  Items: ${items.length} item(s)`);
    if (items.length > 0) {
      console.log(`  First item vendor: ${items[0].vendorId || items[0].vendorName || 'N/A'}`);
    }
    console.log('');
  }

  if (orders.length > 0) {
    console.log('To manually assign a logistics partner to an order, run:');
    console.log('  node scripts/backfillLogisticsPartner.js --orderId=<order-id> --partnerId=<partner-uid>');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
