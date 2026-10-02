// Notification service (REST-backed)
// All operations routed through /api/notifications/* endpoints
import { api } from './api';

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
  PROMOTION: 'promotion',
  NEW_ORDER: 'new_order',
  RETURN_REQUESTED: 'return_requested',
  RETURN_UPDATE: 'return_update',
  MESSAGE_RECEIVED: 'message_received'
};

// Notification service for managing user notifications
export const notificationService = {
  // Create a new notification
  async create(notificationData) {
    try {
      const res = await api.request('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notificationData),
        headers: { 'Content-Type': 'application/json' }
      });
      return res || { id: 'created', ...notificationData };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Get notifications for a specific user
  async getByUser(userId, options = {}) {
    try {
      const { limit = 50 } = options;
      const params = new URLSearchParams({ ...(limit ? { limit } : {}) }).toString();
      const res = await api.request(`/api/users/${encodeURIComponent(userId)}/notifications?${params}`);
      return res?.items || [];
    } catch (error) {
      console.warn('Error fetching user notifications (returning empty):', error?.message);
      return [];
    }
  },

  // Listen to real-time notifications via SSE with polling fallback
  listenToUserNotifications(userId, callback, options = {}) {
    try {
      const { limit = 50, interval = 30000 } = options;

      // Fetch initial notifications
      this.getByUser(userId, { limit }).then(initial => {
        callback(initial || []);
      }).catch(() => callback([]));

      // Try SSE first
      let eventSource;
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        eventSource = new EventSource(`${baseUrl}/api/notifications/stream`);
      } catch (e) {
        console.warn('EventSource not supported, falling back to polling');
        return this._pollFallback(userId, callback, options);
      }

      let currentNotifications = [];

      eventSource.onmessage = (event) => {
        try {
          if (event.data.startsWith(':') || event.data === 'connected') return;
          const notification = JSON.parse(event.data);
          // Prepend new notification, avoid duplicates
          currentNotifications = [notification, ...currentNotifications.filter(n => n.id !== notification.id)].slice(0, limit);
          callback(currentNotifications);
        } catch (e) {
          // Ignore parse errors for heartbeat comments
        }
      };

      eventSource.onerror = () => {
        console.warn('SSE connection lost, falling back to polling');
        eventSource.close();
      };

      return () => {
        if (eventSource) eventSource.close();
      };
    } catch (error) {
      console.warn('Error setting up notifications listener:', error?.message);
      return this._pollFallback(userId, callback, options);
    }
  },

  // Fallback polling if SSE is not available
  _pollFallback(userId, callback, options = {}) {
    const { interval = 30000, limit = 50 } = options;
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const items = await this.getByUser(userId, { limit });
        if (active) callback(items || []);
      } catch (e) {
        // ignore
      }
      if (active) setTimeout(poll, interval);
    };

    poll();

    return () => { active = false; };
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      await api.request(`/api/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PUT' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      await api.request('/api/notifications/read-all', { method: 'PUT' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete notification
  async delete(notificationId) {
    try {
      await api.request(`/api/notifications/${encodeURIComponent(notificationId)}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Get notification preferences
  async getPreferences() {
    try {
      const res = await api.request('/api/notifications/preferences');
      return res?.data || null;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return null;
    }
  },

  // Update notification preferences
  async updatePreferences(preferences) {
    try {
      const res = await api.request('/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
        headers: { 'Content-Type': 'application/json' }
      });
      return res?.data || preferences;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },

  // Get notification statistics
  async getNotificationStats(userId) {
    try {
      const notifications = await this.getByUser(userId);
      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read && !n.isRead).length,
        byType: {}
      };
      notifications.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      });
      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }
};

export default notificationService;