import { api } from './api';
import { smartPoll } from '../utils/smartPoll';

export const notificationsService = {
  async getByUser(userId, { limit, unreadOnly } = {}) {
    const params = new URLSearchParams({
      ...(limit ? { limit } : {}),
      ...(unreadOnly ? { unreadOnly: 'true' } : {})
    }).toString();
    const res = await api.request(`/api/notifications?${params}`);
    return res?.data?.notifications || res?.items || [];
  },
  async getUnreadCount(userId) {
    const res = await api.request('/api/notifications/unread-count');
    return res?.data?.unreadCount || 0;
  },
  async markAsRead(notificationId) {
    await api.request(`/api/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PUT' });
    return true;
  },
  async markAllAsRead(userId) {
    await api.request('/api/notifications/read-all', { method: 'PUT' });
    return true;
  },
  async create(data) {
    const res = await api.request('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
    return res?.data || res || null;
  },
  async delete(notificationId) {
    await api.request(`/api/notifications/${encodeURIComponent(notificationId)}`, { method: 'DELETE' });
    return true;
  },
  async getPreferences() {
    const res = await api.request('/api/notifications/preferences');
    return res?.data || null;
  },
  async updatePreferences(preferences) {
    const res = await api.request('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
      headers: { 'Content-Type': 'application/json' }
    });
    return res?.data || preferences;
  },
  listenToUserNotifications(userId, callback, { interval = 30000, limit = 50 } = {}) {
    // Fetch initial notifications
    notificationsService.getByUser(userId, { limit }).then(items => {
      callback(items || []);
    }).catch(() => callback([]));

    // Try SSE for real-time updates
    let eventSource;
    let pollCleanup;
    try {
      const baseUrl = import.meta.env.PROD
        ? window.location.origin
        : (import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : ''));
      const token = localStorage.getItem('authToken') || '';
      eventSource = new EventSource(`${baseUrl}/api/notifications/stream?token=${encodeURIComponent(token)}`);

      let current = [];

      eventSource.onmessage = (event) => {
        try {
          if (event.data.startsWith(':') || event.data === 'connected') return;
          const notification = JSON.parse(event.data);
          current = [notification, ...current.filter(n => n.id !== notification.id)].slice(0, limit);
          callback(current);
        } catch (e) {
          // Ignore parse errors for heartbeat comments
        }
      };

      eventSource.onerror = () => {
        console.warn('SSE connection lost, falling back to polling');
        eventSource.close();
        // Fall back to polling
        pollCleanup = smartPoll(
          async () => {
            const items = await notificationsService.getByUser(userId, { limit });
            callback(items || []);
          },
          { interval, maxInterval: 30000 }
        );
      };

      return () => {
        if (eventSource) eventSource.close();
        if (pollCleanup) pollCleanup();
      };
    } catch (e) {
      console.warn('SSE not available, using polling');
      return smartPoll(
        async () => {
          const items = await notificationsService.getByUser(userId, { limit });
          callback(items || []);
        },
        { interval, maxInterval: 30000 }
      );
    }
  }
};
