import { api, config } from './api';
import { smartPoll } from '../utils/smartPoll';

export const messagingService = {
  async getUserConversations(userId, { limit } = {}) {
    const params = new URLSearchParams({ ...(limit ? { limit } : {}) }).toString();
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}/conversations?${params}`);
    return res.items || [];
  },
  async getOrCreateConversation(userId, otherUserId, orderId = null) {
    const res = await api.request('/api/messaging/conversations', { method: 'POST', body: JSON.stringify({ participants: [userId, otherUserId], orderId }), headers: { 'Content-Type': 'application/json' } });
    return res || null;
  },
  async createConversation(payload) {
    const res = await api.request('/api/messaging/conversations', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
    return res || null;
  },
  async sendMessage({ conversationId, senderId, content, type = 'text', timestamp = new Date() }) {
    const res = await api.request(`/api/messaging/conversations/${encodeURIComponent(conversationId)}/messages`, { method: 'POST', body: JSON.stringify({ senderId, content, type, timestamp: (new Date(timestamp)).toISOString() }), headers: { 'Content-Type': 'application/json' } });
    return res || null;
  },
  async markAsRead(conversationId, userId) {
    await api.request(`/api/messaging/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'POST', body: JSON.stringify({ userId }), headers: { 'Content-Type': 'application/json' } });
    return true;
  },
  async sendTypingIndicator(conversationId, userId, isTyping = true) {
    try {
      await api.request(`/api/messaging/conversations/${encodeURIComponent(conversationId)}/typing`, { method: 'POST', body: JSON.stringify({ userId, isTyping }), headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.warn('typing indicator failed', e);
    }
    return true;
  },
  async sendFileMessage(conversationId, file, userId) {
    const form = new FormData();
    form.append('file', file);
    form.append('senderId', userId);
    const baseUrl = config?.app?.apiBaseUrl || window.location.origin;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null;
    const res = await fetch(`${baseUrl}/api/messaging/conversations/${encodeURIComponent(conversationId)}/files`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`file upload failed: ${res.status} ${res.statusText} ${text}`);
    }
    return res.json();
  },
  listenToMessages(conversationId, callback, { interval = 10000, limit } = {}) {
    return smartPoll(
      async () => {
        const params = new URLSearchParams({ ...(limit ? { limit } : {}) }).toString();
        const res = await api.request(`/api/messaging/conversations/${encodeURIComponent(conversationId)}/messages?${params}`);
        callback(res.items || []);
      },
      { interval, maxInterval: 30000 }
    );
  },
  listenToUserConversations(userId, callback, { interval = 3000, limit } = {}) {
    return smartPoll(
      async () => {
        const items = await messagingService.getUserConversations(userId, { limit });
        callback(items || []);
      },
      { interval, maxInterval: 15000 }
    );
  }
};
