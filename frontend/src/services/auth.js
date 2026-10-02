import { api } from './api';

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
