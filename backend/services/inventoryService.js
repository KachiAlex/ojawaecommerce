const { Op } = require('sequelize');
const { Product, StockReservation } = require('../models');

const RESERVATION_EXPIRY_MINUTES = 15;

/**
 * Reserve stock for a user during checkout.
 * Returns reservation records or throws if stock insufficient.
 */
async function reserveStock(userId, items) {
  const reservations = [];

  for (const item of items) {
    const product = await Product.findByPk(item.productId, { lock: true });
    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }

    // Calculate available stock: physical stock minus active reservations
    const activeReserved = await StockReservation.sum('quantity', {
      where: {
        productId: item.productId,
        status: 'active',
        expiresAt: { [Op.gt]: new Date() }
      }
    }) || 0;

    const availableStock = product.stockQuantity - activeReserved;

    if (availableStock < item.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${item.quantity}`
      );
    }

    const reservation = await StockReservation.create({
      productId: item.productId,
      userId,
      quantity: item.quantity,
      status: 'active',
      expiresAt: new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000)
    });

    reservations.push(reservation);
  }

  return reservations;
}

/**
 * Convert reservations to actual stock deduction (called when order is confirmed).
 */
async function convertReservationsToStockDeduction(orderId, userId, items) {
  for (const item of items) {
    const reservation = await StockReservation.findOne({
      where: {
        productId: item.productId,
        userId,
        status: 'active'
      }
    });

    if (reservation) {
      await reservation.update({ status: 'converted', orderId });
    }

    // Deduct actual stock
    const product = await Product.findByPk(item.productId);
    if (product) {
      const newStock = Math.max(0, product.stockQuantity - item.quantity);
      await product.update({
        stockQuantity: newStock,
        status: newStock === 0 ? 'out_of_stock' : product.status,
        salesCount: (product.salesCount || 0) + item.quantity
      });
    }
  }
}

/**
 * Release reservations (called on checkout cancellation or failure).
 */
async function releaseReservations(userId, productIds = null) {
  const where = {
    userId,
    status: 'active'
  };

  if (productIds && productIds.length > 0) {
    where.productId = { [Op.in]: productIds };
  }

  await StockReservation.update(
    { status: 'cancelled' },
    { where }
  );
}

/**
 * Clean up expired reservations.
 * Should be run periodically (e.g., via cron or setInterval).
 */
async function cleanupExpiredReservations() {
  const [updated] = await StockReservation.update(
    { status: 'expired' },
    {
      where: {
        status: 'active',
        expiresAt: { [Op.lte]: new Date() }
      }
    }
  );
  return updated;
}

/**
 * Get available stock for a product (physical stock minus active reservations).
 */
async function getAvailableStock(productId) {
  const product = await Product.findByPk(productId);
  if (!product) return 0;

  const activeReserved = await StockReservation.sum('quantity', {
    where: {
      productId,
      status: 'active',
      expiresAt: { [Op.gt]: new Date() }
    }
  }) || 0;

  return Math.max(0, product.stockQuantity - activeReserved);
}

module.exports = {
  reserveStock,
  convertReservationsToStockDeduction,
  releaseReservations,
  cleanupExpiredReservations,
  getAvailableStock,
  RESERVATION_EXPIRY_MINUTES
};
