// REST-backed replacement for previous Firebase service.
// Routes data and auth operations to the Render backend under `/api/*`.

import { config } from '../config/env';

const api = {
  async request(path, options = {}) {
    // Force use Render backend in production
    const baseUrl = import.meta.env.PROD 
      ? 'https://ojawaecommerce.onrender.com'
      : (config.app.apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
    
    const fullPath = path.startsWith('http') ? path : `${baseUrl}${path}`;
    
    console.log(`🔗 API Request: ${fullPath}`);
    
    try {
      const res = await fetch(fullPath, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error ${res.status} for ${fullPath}:`, errorText);
        throw new Error(`API ${path} failed: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      console.log(`✅ API Success: ${fullPath}`, data);
      return data;
    } catch (error) {
      console.error(`❌ API Error: ${fullPath}`, error);
      throw error;
    }
  },
};

export const authService = {
  async signin(email, password) {
    const res = await api.request('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }), headers: { 'Content-Type': 'application/json' } });
    return res;
  },
  async signup(email, password, profile = {}) {
    const res = await api.request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, ...profile }), headers: { 'Content-Type': 'application/json' } });
    return res;
  },
  async signout() {
    await api.request('/api/auth/signout', { method: 'POST' });
    return true;
  },
  async sendPasswordReset(email) {
    await api.request('/api/auth/password-reset', { method: 'POST', body: JSON.stringify({ email }), headers: { 'Content-Type': 'application/json' } });
    return true;
  },
  async getProfile(userId) {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}`);
    return res || null;
  }
};

export const productService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const res = await api.request(`/api/products?${params}`);
    return res.data?.products || [];
  },
  async getById(id) {
    const res = await api.request(`/api/products/${encodeURIComponent(id)}`);
    return res.data || null;
  }
};

export const orderService = {
  async create(order) {
    const res = await api.request('/api/orders', { method: 'POST', body: JSON.stringify(order), headers: { 'Content-Type': 'application/json' } });
    return res || null;
  },
  async getById(id) {
    const res = await api.request(`/api/orders/${encodeURIComponent(id)}`);
    return res || null;
  },
  async getByUser(userId, type = 'buyer') {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}/orders?type=${encodeURIComponent(type)}`);
    return res.items || [];
  }
};

export const walletService = {
  async createWallet(userId, userType) {
    const res = await api.request('/api/wallets', { method: 'POST', body: JSON.stringify({ userId, userType }), headers: { 'Content-Type': 'application/json' } });
    return res || null;
  },
  async getUserWallet(userId) {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}/wallet`);
    return res || null;
  }
};

export const userService = {
  async get(userId) {
    return await authService.getProfile(userId);
  },
  async update(userId, updates) {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' }
    });
    return res || null;
  }
};

export const uploadService = {
  async uploadLogo(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/uploads/logo', { method: 'POST', credentials: 'include', body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`upload failed: ${res.status} ${res.statusText} ${text}`);
    }
    return res.json();
  }
};

export const notificationsService = {
  async getByUser(userId, { limit } = {}) {
    const params = new URLSearchParams({ ...(limit ? { limit } : {}) }).toString();
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}/notifications?${params}`);
    return res.items || [];
  },
  async markAsRead(notificationId) {
    await api.request(`/api/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'POST' });
    return true;
  },
  async markAllAsRead(userId) {
    await api.request(`/api/users/${encodeURIComponent(userId)}/notifications/mark-all-read`, { method: 'POST' });
    return true;
  },
  async create(data) {
    const res = await api.request('/api/notifications', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
    return res || null;
  },
  async delete(notificationId) {
    await api.request(`/api/notifications/${encodeURIComponent(notificationId)}`, { method: 'DELETE' });
    return true;
  },
  listenToUserNotifications(userId, callback, { interval = 3000, limit } = {}) {
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      try {
        const items = await notificationsService.getByUser(userId, { limit });
        callback(items || []);
      } catch (e) {
        console.error('notifications polling error', e);
      }
    };
    // initial poll
    poll();
    const id = setInterval(poll, interval);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }
};

export const wishlistService = {
  _key(userId) {
    return `__wishlist__${userId}`;
  },
  _read(userId) {
    try {
      const raw = localStorage.getItem(this._key(userId));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },
  _write(userId, items) {
    try {
      localStorage.setItem(this._key(userId), JSON.stringify(items));
    } catch (e) { /* ignore */ }
  },
  async isInWishlist(userId, productId) {
    if (!userId || !productId) return false;
    const items = this._read(userId);
    return items.some(i => i.productId === productId || i.id === productId);
  },
  async addToWishlist(userId, productId, payload = {}) {
    if (!userId || !productId) return false;
    const items = this._read(userId);
    if (items.some(i => i.productId === productId || i.id === productId)) return true;
    const entry = { id: productId, productId, ...payload, addedAt: new Date().toISOString() };
    items.push(entry);
    this._write(userId, items);
    return true;
  },
  async removeFromWishlist(userId, productId) {
    if (!userId || !productId) return false;
    const items = this._read(userId).filter(i => i.productId !== productId && i.id !== productId);
    this._write(userId, items);
    return true;
  },
  async getWishlist(userId) {
    if (!userId) return [];
    return this._read(userId);
  }
};

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
    // Use FormData for file upload
    const form = new FormData();
    form.append('file', file);
    form.append('senderId', userId);
    const res = await fetch(`/api/messaging/conversations/${encodeURIComponent(conversationId)}/files`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`file upload failed: ${res.status} ${res.statusText} ${text}`);
    }
    return res.json();
  },
  listenToMessages(conversationId, callback, { interval = 2000, limit } = {}) {
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      try {
        const params = new URLSearchParams({ ...(limit ? { limit } : {}) }).toString();
        const res = await api.request(`/api/messaging/conversations/${encodeURIComponent(conversationId)}/messages?${params}`);
        callback(res.items || []);
      } catch (e) {
        console.error('messages polling error', e);
      }
    };
    poll();
    const id = setInterval(poll, interval);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  },
  listenToUserConversations(userId, callback, { interval = 3000, limit } = {}) {
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      try {
        const items = await messagingService.getUserConversations(userId, { limit });
        callback(items || []);
      } catch (e) {
        console.error('conversations polling error', e);
      }
    };
    poll();
    const id = setInterval(poll, interval);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }
};

export default {
  auth: authService,
  product: productService,
  order: orderService,
  wallet: walletService,
  user: userService,
  upload: uploadService,
  notifications: notificationsService,
  messaging: messagingService,
  wishlist: wishlistService
};
