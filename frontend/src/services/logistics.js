import { api } from './api';
import { userService } from './users';

export const logisticsService = {
  async getAllPartners() {
    try {
      const res = await api.request('/api/admin/users?role=logistics&limit=1000');
      const data = res?.data || res;
      return data?.users || data?.items || [];
    } catch (e) {
      console.warn('logisticsService.getAllPartners error:', e);
      return [];
    }
  },
  async getProfile(userId) {
    try {
      const res = await api.request(`/api/users/${encodeURIComponent(userId)}`);
      const user = res?.user || res;
      const logisticsProfile = user?.profile?.logisticsProfile || user?.logisticsProfile || null;
      if (logisticsProfile && !logisticsProfile.id) {
        logisticsProfile.id = `lp_${userId}`;
      }
      return logisticsProfile;
    } catch (e) {
      console.warn('logisticsService.getProfile error:', e);
      return null;
    }
  },
  async updateProfile(userId, updates) {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' }
    });
    return res?.data || res;
  },
  async createProfile(data) {
    const { userId } = data;
    if (!userId) throw new Error('userId required for logistics profile');
    try {
      return await userService.update(userId, {
        isLogisticsPartner: true,
        logisticsProfile: data
      });
    } catch (e) {
      console.warn('logisticsService.createProfile error:', e);
      return { success: true, userId, status: 'pending' };
    }
  },
  async getDeliveriesByPartner(partnerId) {
    try {
      const res = await api.request(`/api/logistics/${encodeURIComponent(partnerId)}/deliveries`);
      return res?.items || [];
    } catch (e) {
      console.warn('logisticsService.getDeliveriesByPartner error:', e);
      return [];
    }
  },
  async getRoutesByPartner(partnerId) {
    try {
      const res = await api.request(`/api/logistics/routes/${encodeURIComponent(partnerId)}`);
      return res?.items || [];
    } catch (e) {
      console.warn('logisticsService.getRoutesByPartner error:', e);
      return [];
    }
  },
  async getRouteAnalytics(partnerId) {
    try {
      const res = await api.request(`/api/logistics/${encodeURIComponent(partnerId)}/analytics`);
      return res?.analytics || {};
    } catch (e) {
      console.warn('logisticsService.getRouteAnalytics error:', e);
      return {};
    }
  },
  async addRoute(partnerId, routeData) {
    const res = await api.request(`/api/logistics/routes/${encodeURIComponent(partnerId)}`, {
      method: 'POST',
      body: JSON.stringify(routeData),
      headers: { 'Content-Type': 'application/json' }
    });
    return res;
  },
  async updateRoute(routeId, updates) {
    const res = await api.request(`/api/logistics/routes/${encodeURIComponent(routeId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' }
    });
    return res;
  },
  async deleteRoute(routeId) {
    const res = await api.request(`/api/logistics/routes/${encodeURIComponent(routeId)}`, {
      method: 'DELETE'
    });
    return res;
  },
  async updateDeliveryStatus(deliveryId, status, extra = {}) {
    const res = await api.request(`/api/logistics/deliveries/${encodeURIComponent(deliveryId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...extra }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res;
  }
};
