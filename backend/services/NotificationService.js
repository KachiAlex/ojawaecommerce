const { Notification, User } = require('../models');
const { sendPushToUser } = require('./pushService');
const { sendEmail } = require('./emailService');

// Category mapping: notification type -> preference category
const TYPE_TO_CATEGORY = {
  order_placed: 'orders',
  order_confirmed: 'orders',
  order_shipped: 'orders',
  order_delivered: 'orders',
  order_cancelled: 'orders',
  order: 'orders',
  new_order: 'orders',
  order_update: 'orders',
  return_requested: 'orders',
  return_update: 'orders',
  payment: 'payments',
  payment_received: 'payments',
  payment_released: 'payments',
  payment_released: 'payments',
  wallet_funded: 'payments',
  wallet_low_balance: 'payments',
  dispute: 'disputes',
  dispute_created: 'disputes',
  dispute_resolved: 'disputes',
  message_received: 'messages',
  message: 'messages',
  system_update: 'system', // system updates always delivered
  promotion: 'marketing',
  general: 'system'
};

// SSE clients: userId -> Set<res>
const sseClients = new Map();

const addSSEClient = (userId, res) => {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);
};

const removeSSEClient = (userId, res) => {
  const clients = sseClients.get(userId);
  if (clients) {
    clients.delete(res);
    if (clients.size === 0) sseClients.delete(userId);
  }
};

const notifySSEClients = (userId, notification) => {
  const clients = sseClients.get(userId);
  if (!clients || clients.size === 0) return;

  const data = JSON.stringify(notification);
  for (const res of clients) {
    try {
      res.write(`data: ${data}\n\n`);
    } catch (e) {
      // Client disconnected
      removeSSEClient(userId, res);
    }
  }
};

/**
 * Unified notification creation:
 * 1. Creates DB record
 * 2. Checks user preferences
 * 3. Dispatches push + email based on preferences
 * 4. Notifies SSE clients
 */
const createNotification = async (params) => {
  const {
    userId,
    type,
    title,
    message,
    data = {},
    orderId = null,
    amount = null,
    productName = null,
    productId = null,
    skipPush = false,
    skipEmail = false
  } = params;

  if (!userId || !type || !title || !message) {
    console.warn('NotificationService: missing required fields', { userId, type, title });
    return null;
  }

  try {
    // 1. Create the DB record
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      amount,
      orderId,
      productName,
      productId,
      isRead: false
    });

    const plain = notification.toJSON();
    plain.read = plain.isRead;

    // 2. Notify SSE clients (real-time in-app)
    notifySSEClients(userId, plain);

    // 3. Fetch user for preferences + email
    const user = await User.findByPk(userId);
    if (!user) {
      console.warn(`NotificationService: user ${userId} not found`);
      return plain;
    }

    const prefs = user.notificationPreferences || {};
    const category = TYPE_TO_CATEGORY[type] || 'orders';

    // 4. Push notification
    if (!skipPush) {
      const pushPrefs = prefs.push || {};
      const pushEnabled = category === 'system' || (pushPrefs.enabled !== false && (pushPrefs[category] !== false));
      if (pushEnabled) {
        sendPushToUser(userId, {
          title,
          message,
          type,
          data: { ...data, orderId, url: data.url || '/' }
        }).catch(err => console.error('Push dispatch error:', err.message));
      }
    }

    // 5. Email notification
    if (!skipEmail) {
      const emailPrefs = prefs.email || {};
      const emailEnabled = category === 'system' || (emailPrefs.enabled !== false && (emailPrefs[category] !== false));
      if (emailEnabled && user.email) {
        sendEmail({
          to: user.email,
          type,
          data: {
            ...data,
            orderId,
            amount,
            userName: user.firstName || user.email?.split('@')[0],
            message
          }
        }).catch(err => console.error('Email dispatch error:', err.message));
      }
    }

    return plain;
  } catch (error) {
    console.error('NotificationService: createNotification failed:', error.message);
    return null;
  }
};

/**
 * Create notifications for multiple users (e.g., all vendors in an order)
 */
const createNotifications = async (notifications) => {
  const results = [];
  for (const params of notifications) {
    const result = await createNotification(params);
    results.push(result);
  }
  return results;
};

module.exports = {
  createNotification,
  createNotifications,
  addSSEClient,
  removeSSEClient,
  notifySSEClients
};
