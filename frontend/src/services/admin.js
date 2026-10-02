import { api } from './api';

export const adminService = {
  async getAllUsers({ pageSize, cursor, page, limit, role, status, search } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    if (pageSize && !limit) params.set('limit', pageSize);
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    const res = await api.request(`/api/admin/users?${params.toString()}`);
    const data = res?.data || res;
    return {
      items: data?.users || data?.items || [],
      pagination: data?.pagination,
      total: data?.pagination?.totalItems || data?.users?.length || 0
    };
  },
  async deleteUser(userId) {
    const res = await api.request(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
    return res?.data || res;
  },
  async verifyKyc(userId) {
    const res = await api.request(`/api/admin/users/${encodeURIComponent(userId)}/verify-kyc`, {
      method: 'PUT'
    });
    return res?.data || res;
  },
  async rejectKyc(userId, reason) {
    const res = await api.request(`/api/admin/users/${encodeURIComponent(userId)}/reject-kyc`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res?.data || res;
  },
  async getAllOrders({ pageSize, page, limit, status } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    if (pageSize && !limit) params.set('limit', pageSize);
    if (status) params.set('status', status);
    const res = await api.request(`/api/admin/orders?${params.toString()}`);
    const data = res?.data || res;
    return {
      items: data?.orders || data?.items || [],
      pagination: data?.pagination,
      total: data?.pagination?.totalItems || data?.orders?.length || 0
    };
  },
  async getAllDisputes({ pageSize, page, limit } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    if (pageSize && !limit) params.set('limit', pageSize);
    try {
      const res = await api.request(`/api/admin/orders?${params.toString()}`);
      const data = res?.data || res;
      const orders = data?.orders || data?.items || [];
      const disputes = orders.filter(o => o.status === 'cancelled' || (o.refundStatus && o.refundStatus !== 'none') || o.disputeStatus);
      return { items: disputes, total: disputes.length };
    } catch (e) {
      console.warn('adminService.getAllDisputes error:', e);
      return { items: [], total: 0 };
    }
  },
  async getAllProducts({ pageSize, page, limit, status, featured, category } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    if (pageSize && !limit) params.set('limit', pageSize);
    if (status) params.set('status', status);
    if (featured !== undefined) params.set('featured', featured);
    if (category) params.set('category', category);
    const res = await api.request(`/api/admin/products?${params.toString()}`);
    const data = res?.data || res;
    return {
      items: data?.products || data?.items || [],
      pagination: data?.pagination,
      total: data?.pagination?.totalItems || data?.products?.length || 0
    };
  },
  async getCommissionSettings() {
    try {
      const res = await api.request('/api/admin/analytics/overview');
      const data = res?.data || res;
      return {
        platformCommission: 5.0,
        minimumCommission: 50,
        maximumCommission: 5000,
        ...data?.overview,
        ...data
      };
    } catch (e) {
      console.warn('adminService.getCommissionSettings error:', e);
      return { platformCommission: 5.0, minimumCommission: 50, maximumCommission: 5000 };
    }
  },
  async updateCommissionSettings(settings) {
    return { success: true, settings };
  },
  async getCommissionHistory() {
    return [];
  },
  async setProductFeatured(productId, isFeatured) {
    const res = await api.request(`/api/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      body: JSON.stringify({ featured: isFeatured }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res;
  },
  async getFeaturedProducts() {
    const res = await api.request('/api/products/featured/list?limit=50');
    const data = res?.data || res;
    return data?.products || data?.items || [];
  },
  async getAnalyticsOverview() {
    const res = await api.request('/api/admin/analytics/overview');
    return res?.data || res;
  },
  async updateUserStatus(userId, status, reason) {
    const res = await api.request(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res;
  },
  async approveProduct(productId) {
    const res = await api.request(`/api/admin/products/${encodeURIComponent(productId)}/approve`, {
      method: 'PUT'
    });
    return res;
  },
  async rejectProduct(productId, reason) {
    const res = await api.request(`/api/admin/products/${encodeURIComponent(productId)}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res;
  }
};
