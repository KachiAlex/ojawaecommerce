import { api } from './api';
import { authService } from './auth';

export const userService = {
  async get(userId) {
    return await authService.getProfile(userId);
  },
  async getById(userId) {
    return await authService.getProfile(userId);
  },
  async getVendorProfile(vendorId) {
    try {
      const res = await api.request(`/api/users/${encodeURIComponent(vendorId)}`);
      const user = res?.user || res;
      const vendorData = user?.vendorProfile || user?.profile?.vendorProfile || user?.vendor || null;
      return {
        ...user,
        businessName: vendorData?.businessName || vendorData?.storeName || user?.storeName ||
          [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown',
        storeName: vendorData?.storeName || user?.storeName || vendorData?.businessName || 'Unknown',
        ...vendorData
      };
    } catch (e) {
      console.warn('getVendorProfile error:', e);
      return null;
    }
  },
  async update(userId, updates) {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' }
    });
    return res || null;
  },
  async getPurchasedVendors(userId) {
    try {
      const orders = await api.request(`/api/users/${encodeURIComponent(userId)}/orders?type=buyer&limit=100`);
      const orderList = orders?.items || orders?.data?.orders || [];
      const vendorIds = [...new Set(orderList.map(o => o.vendorId || o.vendor?.id).filter(Boolean))];
      if (vendorIds.length === 0) return [];
      const vendors = await Promise.all(vendorIds.map(async (vid) => {
        try {
          const data = await authService.getProfile(vid);
          return data;
        } catch { return null; }
      }));
      return vendors.filter(Boolean);
    } catch (e) {
      console.warn('getPurchasedVendors error:', e);
      return [];
    }
  }
};
