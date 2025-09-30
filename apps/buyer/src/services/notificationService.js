import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Notification types
export const NOTIFICATION_TYPES = {
  ORDER_PLACED: 'order_placed',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_RELEASED: 'payment_released',
  DISPUTE_CREATED: 'dispute_created',
  DISPUTE_RESOLVED: 'dispute_resolved',
  WALLET_FUNDED: 'wallet_funded',
  WALLET_LOW_BALANCE: 'wallet_low_balance',
  SYSTEM_UPDATE: 'system_update',
  PROMOTION: 'promotion'
};

// Notification service for managing user notifications
export const notificationService = {
  // Create a new notification
  async create(notificationData) {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...notificationData
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Get notifications for a specific user
  async getByUser(userId, options = {}) {
    try {
      const { limit = 50, orderBy: orderByField = 'createdAt', orderDirection = 'desc' } = options;
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection)
      );
      
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return limit ? notifications.slice(0, limit) : notifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  },

  // Listen to real-time notifications for a user
  listenToUserNotifications(userId, callback, options = {}) {
    try {
      const { limit = 50, orderBy: orderByField = 'createdAt', orderDirection = 'desc' } = options;
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection)
      );
      
      return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const limitedNotifications = limit ? notifications.slice(0, limit) : notifications;
        callback(limitedNotifications);
      });
    } catch (error) {
      console.error('Error setting up notifications listener:', error);
      throw error;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const batch = [];
      
      snapshot.docs.forEach(doc => {
        batch.push(updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      });
      
      await Promise.all(batch);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete notification
  async delete(notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Create notification for order events
  async createOrderNotification(orderData, eventType) {
    try {
      const notificationTypes = {
        'order_placed': {
          title: 'Order Placed Successfully',
          message: `Your order #${orderData.id} has been placed and payment is being processed.`,
          type: 'success',
          icon: '📦'
        },
        'payment_processed': {
          title: 'Payment Processed',
          message: `Payment for order #${orderData.id} has been processed. Funds are held in escrow.`,
          type: 'info',
          icon: '💰'
        },
        'order_shipped': {
          title: 'Order Shipped',
          message: `Your order #${orderData.id} has been shipped. Track your delivery.`,
          type: 'info',
          icon: '🚚'
        },
        'order_delivered': {
          title: 'Order Delivered',
          message: `Your order #${orderData.id} has been delivered. Please confirm receipt.`,
          type: 'success',
          icon: '✅'
        },
        'order_completed': {
          title: 'Order Completed',
          message: `Order #${orderData.id} has been completed. Thank you for your business!`,
          type: 'success',
          icon: '🎉'
        },
        'order_cancelled': {
          title: 'Order Cancelled',
          message: `Order #${orderData.id} has been cancelled. Refund will be processed.`,
          type: 'warning',
          icon: '❌'
        },
        'dispute_created': {
          title: 'Dispute Created',
          message: `A dispute has been created for order #${orderData.id}. We'll review and resolve it.`,
          type: 'warning',
          icon: '⚖️'
        },
        'dispute_resolved': {
          title: 'Dispute Resolved',
          message: `The dispute for order #${orderData.id} has been resolved.`,
          type: 'info',
          icon: '✅'
        }
      };

      const notificationConfig = notificationTypes[eventType];
      if (!notificationConfig) {
        throw new Error(`Unknown notification type: ${eventType}`);
      }

      return await this.create({
        userId: orderData.buyerId,
        title: notificationConfig.title,
        message: notificationConfig.message,
        type: notificationConfig.type,
        icon: notificationConfig.icon,
        orderId: orderData.id,
        orderStatus: orderData.status,
        read: false,
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error creating order notification:', error);
      throw error;
    }
  },

  // Create notification for vendor events
  async createVendorNotification(vendorId, eventType, orderData) {
    try {
      const notificationTypes = {
        'new_order': {
          title: 'New Order Received',
          message: `You have received a new order #${orderData.id} for ₦${orderData.totalAmount.toLocaleString()}.`,
          type: 'info',
          icon: '🛒'
        },
        'payment_released': {
          title: 'Payment Released',
          message: `Payment for order #${orderData.id} has been released to your wallet.`,
          type: 'success',
          icon: '💰'
        },
        'dispute_created': {
          title: 'Dispute Created',
          message: `A dispute has been created for order #${orderData.id}. Please respond.`,
          type: 'warning',
          icon: '⚖️'
        },
        'dispute_resolved': {
          title: 'Dispute Resolved',
          message: `The dispute for order #${orderData.id} has been resolved.`,
          type: 'info',
          icon: '✅'
        }
      };

      const notificationConfig = notificationTypes[eventType];
      if (!notificationConfig) {
        throw new Error(`Unknown notification type: ${eventType}`);
      }

      return await this.create({
        userId: vendorId,
        title: notificationConfig.title,
        message: notificationConfig.message,
        type: notificationConfig.type,
        icon: notificationConfig.icon,
        orderId: orderData.id,
        orderStatus: orderData.status,
        read: false,
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error creating vendor notification:', error);
      throw error;
    }
  },

  // Get notification statistics
  async getNotificationStats(userId) {
    try {
      const notifications = await this.getByUser(userId);
      
      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        byType: {},
        byPriority: {}
      };

      // Count by type
      notifications.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }
};

export default notificationService;