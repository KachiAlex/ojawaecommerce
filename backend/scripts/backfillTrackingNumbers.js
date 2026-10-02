/**
 * Backfill tracking numbers on existing orders that don't have one.
 *
 * Usage:
 *   node scripts/backfillTrackingNumbers.js          # List orders without trackingNumber
 *   node scripts/backfillTrackingNumbers.js --apply   # Generate and assign tracking numbers
 */

const path = require('path');
const fs = require('fs');

const envFiles = ['.env', '.env.local'];
envFiles.forEach((file) => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    require('dotenv').config({ path: fullPath, override: true });
  }
});

const { sequelize, Order } = require('../models');

async function main() {
  await sequelize.authenticate();
  console.log('✅ Database connected\n');

  const args = process.argv.slice(2);
  const shouldApply = args.includes('--apply');

  const orders = await Order.findAll({
    where: { trackingNumber: null },
    attributes: ['id', 'orderNumber', 'status', 'createdAt'],
    order: [['createdAt', 'ASC']],
    limit: 500
  });

  console.log(`📦 Found ${orders.length} orders without trackingNumber\n`);

  if (orders.length === 0) {
    process.exit(0);
  }

  if (!shouldApply) {
    for (const order of orders) {
      console.log(`  ${order.id} | ${order.orderNumber || 'N/A'} | ${order.status} | ${order.createdAt?.toISOString?.() || order.createdAt}`);
    }
    console.log(`\nTo generate and assign tracking numbers, run:`);
    console.log(`  node scripts/backfillTrackingNumbers.js --apply`);
    process.exit(0);
  }

  console.log('🔄 Generating tracking numbers...\n');
  let updated = 0;

  for (const order of orders) {
    const trackingNumber = 'TRK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    try {
      await order.update({ trackingNumber });
      console.log(`  ✅ ${order.id} → ${trackingNumber}`);
      updated++;
    } catch (err) {
      console.error(`  ❌ ${order.id}: ${err.message}`);
    }
  }

  console.log(`\n✅ Updated ${updated} of ${orders.length} orders with tracking numbers.`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
