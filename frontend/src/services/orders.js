import { api } from './api';

export const orderService = {
  mapFrontendStatus(status) {
    const mapping = {
      'ready_for_shipment': 'shipped',
      'in_transit': 'shipped',
      'out_for_delivery': 'shipped',
      'completed': 'delivered'
    };
    return mapping[status] || status;
  },
  async create(order) {
    const res = await api.request('/api/orders', { method: 'POST', body: JSON.stringify(order), headers: { 'Content-Type': 'application/json' } });
    return res || null;
  },
  async getById(id) {
    const res = await api.request(`/api/orders/${encodeURIComponent(id)}`);
    return res || null;
  },
  async updateStatus(id, status, additionalData = {}) {
    const mappedStatus = this.mapFrontendStatus(status);
    const payload = { status: mappedStatus, ...additionalData };
    if (additionalData.trackingNumber || additionalData.carrier) {
      payload.trackingNumber = additionalData.trackingNumber || additionalData.carrier;
    }
    const res = await api.request(`/api/orders/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    return res || null;
  },
  async markShipped(id, { carrier, trackingNumber, eta }) {
    return this.updateStatus(id, 'shipped', { carrier, trackingNumber, eta, shippedAt: new Date() });
  },
  async getByUser(userId, type = 'buyer') {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}/orders?type=${encodeURIComponent(type)}`);
    return res.items || [];
  },
  async getByVendor(vendorId) {
    const res = await api.request(`/api/users/${encodeURIComponent(vendorId)}/orders?type=vendor`);
    return res.items || res?.data?.items || [];
  },
  async getByTrackingId(trackingId) {
    const res = await api.request(`/api/orders/track/${encodeURIComponent(trackingId)}`);
    return res?.order || res?.data?.order || null;
  }
};
