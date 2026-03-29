/**
 * Vendor Analytics Service (REST-backed)
 * Delegates vendor analytics computations to backend endpoints under `/api/analytics`.
 */

const api = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Vendor analytics API ${path} failed: ${res.status} ${res.statusText} ${text}`);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  },
};

export const vendorAnalyticsService = {
  async getVendorOverviewMetrics(filters = {}) {
    try {
      const qs = new URLSearchParams(filters).toString();
      const res = await api.request(`/api/analytics/vendors/overview?${qs}`);
      return res || null;
    } catch (err) {
      console.error('Error fetching vendor overview metrics (REST):', err);
      return null;
    }
  },

  async getTopVendorsByRevenue(limit = 10, timeRange = 'month') {
    try {
      const res = await api.request(`/api/analytics/vendors/top?limit=${limit}&timeRange=${encodeURIComponent(timeRange)}`);
      return res || [];
    } catch (err) {
      console.error('Error fetching top vendors (REST):', err);
      return [];
    }
  },

  async getVendorGrowthTrend(timeRange = 'month') {
    try {
      const res = await api.request(`/api/analytics/vendors/growth?timeRange=${encodeURIComponent(timeRange)}`);
      return res || [];
    } catch (err) {
      console.error('Error fetching vendor growth trend (REST):', err);
      return [];
    }
  },

  async getVendorHealthIndicators() {
    try {
      const res = await api.request('/api/analytics/vendors/health');
      return res || null;
    } catch (err) {
      console.error('Error fetching vendor health indicators (REST):', err);
      return null;
    }
  },

  async getVendorsByCategory(timeRange = 'month') {
    try {
      const res = await api.request(`/api/analytics/vendors/by-category?timeRange=${encodeURIComponent(timeRange)}`);
      return res || [];
    } catch (err) {
      console.error('Error fetching vendors by category (REST):', err);
      return [];
    }
  },

  async getVendorOnboardingFunnel() {
    try {
      const res = await api.request('/api/analytics/vendors/onboarding-funnel');
      return res || null;
    } catch (err) {
      console.error('Error fetching vendor onboarding funnel (REST):', err);
      return null;
    }
  },

  async getVendorDetail(vendorId) {
    try {
      const res = await api.request(`/api/analytics/vendors/${encodeURIComponent(vendorId)}`);
      return res || null;
    } catch (err) {
      console.error('Error fetching vendor detail (REST):', err);
      return null;
    }
  },

  async getVendorOrderStats(vendorId, startDate) {
    try {
      const qs = new URLSearchParams({ startDate }).toString();
      const res = await api.request(`/api/analytics/vendors/${encodeURIComponent(vendorId)}/orders?${qs}`);
      return res || { orderCount: 0, revenue: 0 };
    } catch (err) {
      console.error('Error fetching vendor order stats (REST):', err);
      return { orderCount: 0, revenue: 0 };
    }
  },
      );

      const snapshot = await getDocs(q);
      let orderCount = 0;
      let totalRevenue = 0;

      snapshot.docs.forEach(doc => {
        const orderData = doc.data();
        orderCount++;
        totalRevenue += orderData.totalAmount || 0;
      });

      return {
        orderCount,
        revenue: totalRevenue,
        averageOrderValue: orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0
      };
    } catch (error) {
      // If orders collection doesn't exist yet, return 0
      return { orderCount: 0, revenue: 0, averageOrderValue: 0 };
    }
  },

  /**
   * Get start date based on time range
   * @private
   */
  getStartDate(timeRange) {
    const date = new Date();
    switch (timeRange) {
      case 'day':
        date.setDate(date.getDate() - 1);
        break;
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      default:
        date.setMonth(date.getMonth() - 1);
    }
    date.setHours(0, 0, 0, 0);
    return date;
  },

  /**
   * Get days in time range
   * @private
   */
  getDaysInRange(timeRange) {
    switch (timeRange) {
      case 'day':
        return 1;
      case 'week':
        return 7;
      case 'month':
        return 30;
      default:
        return 30;
    }
  },

  /**
   * Calculate platform health score based on vendor metrics
   * @private
   */
  calculatePlatformHealthScore(healthData) {
    const totalVendors = healthData.totalVendors;
    if (totalVendors === 0) return 100;

    // Scoring factors (out of 100)
    const responsiveScore = (healthData.responsiveVendors / totalVendors) * 40;
    const ratingScore = (healthData.highRatedVendors / totalVendors) * 30;
    const activityScore = (healthData.activeListers / totalVendors) * 30;

    const score = responsiveScore + ratingScore + activityScore;
    return Math.min(100, Math.max(0, Math.round(score)));
  }
};

export default vendorAnalyticsService;
