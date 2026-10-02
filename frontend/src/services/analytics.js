import { api } from './api';

export const analyticsService = {
  async getBuyerStats(userId) {
    try {
      const orders = await api.request(`/api/users/${encodeURIComponent(userId)}/orders?type=buyer&limit=100`);
      const orderList = orders?.items || orders?.data?.orders || [];
      const totalSpent = orderList.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);
      const pending = orderList.filter(o => o.status === 'pending' || o.orderStatus === 'pending').length;
      const completed = orderList.filter(o => o.status === 'completed' || o.status === 'delivered' || o.orderStatus === 'delivered').length;
      return { totalOrders: orderList.length, totalSpent, pending, completed };
    } catch (e) {
      console.warn('getBuyerStats error:', e);
      return { totalOrders: 0, totalSpent: 0, pending: 0, completed: 0 };
    }
  },
  async getVendorStats(vendorId) {
    try {
      const res = await api.request(`/api/analytics/vendor/${encodeURIComponent(vendorId)}`);
      return res?.data || res || {};
    } catch (e) {
      console.warn('getVendorStats error:', e);
      return {};
    }
  },
  async getUserAnalytics(userId, timeRange = '30d') {
    try {
      const res = await api.request(`/api/analytics/vendor/${encodeURIComponent(userId)}?days=${timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30}`);
      return res?.data || res || {};
    } catch (e) {
      console.warn('getUserAnalytics error:', e);
      return {};
    }
  }
};
