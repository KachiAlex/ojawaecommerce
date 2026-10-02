require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const FALLBACK_DATABASE_URL = 'postgresql://neondb_owner:npg_Da79GjxwVoIM@ep-flat-surf-ap5wq3vs-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'null' || process.env.DATABASE_URL === 'undefined') {
  process.env.DATABASE_URL = FALLBACK_DATABASE_URL;
}

const { sequelize } = require('../config/database');
const OrderDef = require('../models/Order');
const NotificationDef = require('../models/Notification');
const StockReservationDef = require('../models/StockReservation');
const { Op } = require('sequelize');

async function deleteDuplicateOrders() {
  await sequelize.authenticate();
  const Order = OrderDef.init(sequelize);
  const Notification = NotificationDef.init(sequelize);
  const StockReservation = StockReservationDef.init(sequelize);

  // Get all orders ordered by createdAt ASC (oldest first) using raw query
  const [allOrders] = await sequelize.query(`
    SELECT id, "buyerId", items, "totalAmount", "createdAt", status, "paymentStatus"
    FROM orders
    ORDER BY "createdAt" ASC
  `);

  console.log(`Found ${allOrders.length} total orders`);

  // Group orders by buyerId + similar items signature
  const groups = {};
  for (const order of allOrders) {
    let itemsSignature = '';
    try {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      if (Array.isArray(items)) {
        itemsSignature = items.map(i => `${i.productId}:${i.quantity}`).sort().join(',');
      }
    } catch (e) {
      itemsSignature = JSON.stringify(order.items || {});
    }

    const key = `${order.buyerId}|${itemsSignature}|${Number(order.totalAmount).toFixed(2)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(order);
  }

  // Find duplicates (groups with more than 1 order, created within 10 minutes of each other)
  const toDelete = [];
  for (const [key, orders] of Object.entries(groups)) {
    if (orders.length < 2) continue;

    // Sort by createdAt ASC (already sorted, but just in case)
    orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Keep the first (oldest), mark the rest as duplicates if within 10 minutes
    const kept = orders[0];
    const keptTime = new Date(kept.createdAt).getTime();

    for (let i = 1; i < orders.length; i++) {
      const orderTime = new Date(orders[i].createdAt).getTime();
      const diffMinutes = (orderTime - keptTime) / (1000 * 60);

      if (diffMinutes <= 10) {
        // Duplicate within 10 minutes
        toDelete.push(orders[i]);
        console.log(`  DUPLICATE: order ${orders[i].id} (created ${orders[i].createdAt}, ${diffMinutes.toFixed(1)}min after order ${kept.id})`);
      } else {
        // Not a duplicate - different time window, treat as separate order
        // Update the "kept" reference to this order for subsequent comparisons
        kept = orders[i];
      }
    }
  }

  if (toDelete.length === 0) {
    console.log('\nNo duplicate orders found.');
    await sequelize.close();
    return;
  }

  console.log(`\nFound ${toDelete.length} duplicate orders to delete.`);

  // Delete duplicates
  for (const order of toDelete) {
    try {
      // Delete associated notifications (data column contains orderId)
      await sequelize.query(`DELETE FROM notifications WHERE "userId" = :userId AND data->>'orderId' = :orderId`, {
        replacements: { userId: order.buyerId, orderId: order.id }
      });

      // Delete stock reservations
      await sequelize.query(`DELETE FROM stock_reservations WHERE "userId" = :userId AND "orderId" = :orderId`, {
        replacements: { userId: order.buyerId, orderId: order.id }
      });

      // Delete the order
      await sequelize.query(`DELETE FROM orders WHERE id = :id`, {
        replacements: { id: order.id }
      });
      console.log(`  Deleted order ${order.id} (created ${order.createdAt})`);
    } catch (err) {
      console.error(`  Error deleting order ${order.id}:`, err.message);
    }
  }

  console.log(`\nDone. Deleted ${toDelete.length} duplicate orders.`);
  await sequelize.close();
}

deleteDuplicateOrders().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
