import { api } from './api';

export const disputesService = {
  async getByVendorPaged({ vendorId, pageSize = 20 }) {
    try {
      const res = await api.request(`/api/orders?vendorId=${encodeURIComponent(vendorId)}&limit=${pageSize}`);
      const data = res?.data || res;
      const orders = data?.orders || data?.items || [];
      const disputes = orders.filter(o => o.status === 'cancelled' || o.refundStatus || o.disputeStatus);
      return { items: disputes, total: disputes.length };
    } catch (e) {
      console.warn('disputesService.getByVendorPaged error:', e);
      return { items: [], total: 0 };
    }
  },
  async getByVendor(vendorId) {
    const result = await this.getByVendorPaged({ vendorId, pageSize: 100 });
    return result.items;
  },
  async createWithWalletHold({ orderId, buyerId, vendorId, reason, description, amount }) {
    const res = await api.request('/api/orders/dispute', {
      method: 'POST',
      body: JSON.stringify({ orderId, buyerId, vendorId, reason, description, amount }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res?.data || res;
  },
  async resolveDispute(disputeId, resolution, refundAmount, paymentIntentId) {
    const res = await api.request(`/api/orders/${encodeURIComponent(disputeId)}/resolve-dispute`, {
      method: 'POST',
      body: JSON.stringify({ resolution, refundAmount, paymentIntentId }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res?.data || res;
  },
  async update(disputeId, updates) {
    const res = await api.request(`/api/orders/${encodeURIComponent(disputeId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' }
    });
    return res?.data || res;
  }
};
