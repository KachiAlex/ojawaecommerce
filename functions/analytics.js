/**
 * Admin Events & Analytics Service
 * Logs and tracks platform events for analytics, auditing, and compliance
 */

const admin = require('firebase-admin');
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const EVENTS_COLLECTION = 'platform_events';
const AUDIT_LOG_COLLECTION = 'admin_audit_logs';

/**
 * Event types for tracking across the platform
 */
const EVENT_TYPES = {
  // Subscription events
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription.downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',

  // Payment events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // User/Vendor events
  VENDOR_REGISTERED: 'vendor.registered',
  VENDOR_APPROVED: 'vendor.approved',
  VENDOR_SUSPENDED: 'vendor.suspended',
  VENDOR_REACTIVATED: 'vendor.reactivated',

  // Admin actions
  ADMIN_ACTION: 'admin.action',
};

/**
 * Log an event to the platform events collection
 * @param {string} eventType - Type of event (from EVENT_TYPES)
 * @param {object} data - Event data
 * @param {string} userId - User who triggered the event
 * @returns {Promise}
 */
async function logEvent({ eventType, data = {}, userId = null, metadata = {} }) {
  if (!eventType || !Object.values(EVENT_TYPES).includes(eventType)) {
    throw new Error(`Invalid event type: ${eventType}`);
  }

  const eventDoc = {
    eventType,
    timestamp: FieldValue.serverTimestamp(),
    data,
    userId,
    metadata: {
      platform: 'ojawa-ecommerce',
      environment: process.env.NODE_ENV || 'development',
      ...metadata,
    },
  };

  try {
    const ref = await db.collection(EVENTS_COLLECTION).add(eventDoc);
    console.log(`✅ Event logged: ${eventType}`, {
      docId: ref.id,
      userId,
      timestamp: new Date().toISOString(),
    });
    return ref.id;
  } catch (error) {
    console.error(`❌ Failed to log event: ${eventType}`, {
      error: error.message,
      eventType,
      userId,
    });
    throw error;
  }
}

/**
 * Log an admin action for audit trail
 * @param {object} params - Action parameters
 * @returns {Promise}
 */
async function logAdminAction({ adminId, action, targetId, targetType, reason = '', changes = {} }) {
  if (!adminId || !action) {
    throw new Error('adminId and action are required');
  }

  const auditEntry = {
    adminId,
    action,
    targetId,
    targetType,
    reason,
    changes,
    timestamp: FieldValue.serverTimestamp(),
    ipAddress: null, // Set this from request context
    userAgent: null, // Set this from request context
  };

  try {
    const ref = await db.collection(AUDIT_LOG_COLLECTION).add(auditEntry);
    console.log(`✅ Admin action logged: ${action}`, {
      docId: ref.id,
      adminId,
      targetId,
    });
    return ref.id;
  } catch (error) {
    console.error(`❌ Failed to log admin action: ${action}`, {
      error: error.message,
      adminId,
    });
    throw error;
  }
}

/**
 * Query events by type and date range
 * @param {string} eventType - Type of event
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<array>}
 */
async function queryEventsByType(eventType, startDate, endDate) {
  try {
    const snapshot = await db
      .collection(EVENTS_COLLECTION)
      .where('eventType', '==', eventType)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .orderBy('timestamp', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Failed to query events: ${eventType}`, error.message);
    return [];
  }
}

/**
 * Get subscription revenue analytics for a date range
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<object>}
 */
async function getSubscriptionRevenue(startDate, endDate) {
  try {
    const events = await db
      .collection(EVENTS_COLLECTION)
      .where('eventType', 'in', [EVENT_TYPES.SUBSCRIPTION_CREATED, EVENT_TYPES.SUBSCRIPTION_RENEWED, EVENT_TYPES.SUBSCRIPTION_UPGRADED])
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    const revenue = {
      totalEvents: events.size,
      byPlan: { basic: 0, pro: 0, premium: 0 },
      byBillingCycle: { monthly: 0, annual: 0 },
      totalRevenue: 0,
      byType: {},
    };

    events.forEach(doc => {
      const event = doc.data();
      const plan = event.data?.plan || 'unknown';
      const price = event.data?.price || 0;
      const cycle = event.data?.billingCycle || 'monthly';
      const eventType = event.eventType;

      // Count by plan
      if (revenue.byPlan[plan] !== undefined) {
        revenue.byPlan[plan]++;
      }

      // Count by billing cycle
      if (revenue.byBillingCycle[cycle] !== undefined) {
        revenue.byBillingCycle[cycle]++;
      }

      // Count by event type
      revenue.byType[eventType] = (revenue.byType[eventType] || 0) + 1;

      // Aggregate revenue
      revenue.totalRevenue += price;
    });

    return revenue;
  } catch (error) {
    console.error('Failed to get subscription revenue:', error.message);
    return null;
  }
}

/**
 * Get payment success/failure rates
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<object>}
 */
async function getPaymentAnalytics(startDate, endDate) {
  try {
    const events = await db
      .collection(EVENTS_COLLECTION)
      .where('eventType', 'in', [EVENT_TYPES.PAYMENT_SUCCESS, EVENT_TYPES.PAYMENT_FAILED, EVENT_TYPES.PAYMENT_REFUNDED])
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    const stats = {
      totalPayments: 0,
      successful: 0,
      failed: 0,
      refunded: 0,
      successRate: 0,
      totalSuccessAmount: 0,
      totalRefundedAmount: 0,
    };

    events.forEach(doc => {
      const event = doc.data();
      const eventType = event.eventType;
      const amount = event.data?.amount || 0;

      stats.totalPayments++;

      if (eventType === EVENT_TYPES.PAYMENT_SUCCESS) {
        stats.successful++;
        stats.totalSuccessAmount += amount;
      } else if (eventType === EVENT_TYPES.PAYMENT_FAILED) {
        stats.failed++;
      } else if (eventType === EVENT_TYPES.PAYMENT_REFUNDED) {
        stats.refunded++;
        stats.totalRefundedAmount += amount;
      }
    });

    stats.successRate = stats.totalPayments > 0 ? ((stats.successful / stats.totalPayments) * 100).toFixed(2) : 0;

    return stats;
  } catch (error) {
    console.error('Failed to get payment analytics:', error.message);
    return null;
  }
}

/**
 * Get vendor registration & activation trends
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<object>}
 */
async function getVendorTrends(startDate, endDate) {
  try {
    const events = await db
      .collection(EVENTS_COLLECTION)
      .where('eventType', 'in', [EVENT_TYPES.VENDOR_REGISTERED, EVENT_TYPES.VENDOR_APPROVED, EVENT_TYPES.VENDOR_SUSPENDED])
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    const trends = {
      registered: 0,
      approved: 0,
      suspended: 0,
      activationRate: 0,
    };

    events.forEach(doc => {
      const event = doc.data();
      const eventType = event.eventType;

      if (eventType === EVENT_TYPES.VENDOR_REGISTERED) trends.registered++;
      else if (eventType === EVENT_TYPES.VENDOR_APPROVED) trends.approved++;
      else if (eventType === EVENT_TYPES.VENDOR_SUSPENDED) trends.suspended++;
    });

    trends.activationRate = trends.registered > 0 ? ((trends.approved / trends.registered) * 100).toFixed(2) : 0;

    return trends;
  } catch (error) {
    console.error('Failed to get vendor trends:', error.message);
    return null;
  }
}

/**
 * Get audit logs for a specific admin or target
 * @param {string} adminId - Optional: filter by admin
 * @param {string} targetId - Optional: filter by target
 * @param {number} limit - Max results
 * @returns {Promise<array>}
 */
async function getAuditLogs(adminId = null, targetId = null, limit = 100) {
  try {
    let query = db.collection(AUDIT_LOG_COLLECTION);

    if (adminId) {
      query = query.where('adminId', '==', adminId);
    }
    if (targetId) {
      query = query.where('targetId', '==', targetId);
    }

    const snapshot = await query
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Failed to get audit logs:', error.message);
    return [];
  }
}

/**
 * Export analytics module
 */
module.exports = {
  EVENT_TYPES,
  logEvent,
  logAdminAction,
  queryEventsByType,
  getSubscriptionRevenue,
  getPaymentAnalytics,
  getVendorTrends,
  getAuditLogs,
};
