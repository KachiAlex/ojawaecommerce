import { api } from './api';

export const supportTicketsService = {
  async getByUser(userId) {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}/support-tickets`);
    return res?.items || res?.data?.tickets || res?.data || [];
  },
  async create(userId, { subject, description, category, priority, orderId }) {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}/support-tickets`, {
      method: 'POST',
      body: JSON.stringify({ subject, description, category, priority, orderId }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res?.data || res;
  }
};
