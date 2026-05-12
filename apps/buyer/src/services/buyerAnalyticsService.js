import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ojawaecommerce.onrender.com';

// NOTE: This service was migrated from Firestore to REST endpoints on the Render backend.
// TODO: Implement the corresponding backend endpoints under `/api/analytics/buyer/*`.

/**
 * Buyer Analytics Service
 * Provides comprehensive buyer/customer metrics and analytics
 */

const buyerAnalyticsService = {
  /**
   * Get overview metrics for buyers
   * @param {Object} filters - Filter options (timeRange, status, etc.)
   * @returns {Object} Overview metrics
   */
  async getBuyerOverviewMetrics(filters = {}) {
    try {
      const { timeRange = 'month' } = filters;
      const startDate = this.getStartDate(timeRange);
      const endDate = new Date();

      const res = await axios.post(`${API_BASE}/api/analytics/buyer/overview`, { filters });
      const payload = res?.data || {};

      const buyers = payload.buyers || [];
      const orders = payload.orders || [];

      // Calculate metrics
      const totalBuyers = buyers.length;
      const activeBuyers = buyers.filter(b => b.lastLoginDate && new Date(b.lastLoginDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
      const newBuyers = buyers.filter(b => b.createdAt && new Date(b.createdAt) > startDate).length;

      const buyerIds = new Set(buyers.map(b => b.id));
      const buyerOrders = orders.filter(o => buyerIds.has(o.buyerId));
      const totalOrderValue = buyerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const avgOrderValue = buyerOrders.length > 0 ? totalOrderValue / buyerOrders.length : 0;

      // repeatBuyers computed by backend when possible
      const repeatBuyers = payload.repeatBuyers ?? (() => { const buyerOrderCounts = {}; buyerOrders.forEach(o=>{buyerOrderCounts[o.buyerId]=(buyerOrderCounts[o.buyerId]||0)+1}); return Object.values(buyerOrderCounts).filter(c=>c>1).length})()

      // Calculate abandoned carts
      const abandonedCarts = payload.abandonedCarts ?? 0;
      const abandonedCartValue = payload.abandonedCartValue ?? 0;

      return {
        totalBuyers,
        activeBuyers,
        newBuyers,
        repeatBuyers,
        inactiveBuyers: totalBuyers - activeBuyers,
        totalOrderValue,
        avgOrderValue: Math.round(avgOrderValue),
        totalOrders: buyerOrders.length,
        avgOrdersPerBuyer: totalBuyers > 0 ? (buyerOrders.length / totalBuyers).toFixed(2) : 0,
        totalRevenue: totalOrderValue,
        abandonedCarts,
        abandonedCartValue
      };
    } catch (error) {
      console.error('Error getting buyer overview metrics:', error);
      return null;
    }
  },

  /**
   * Get top buyers by total spending
   * @param {Number} limit - Max buyers to return
   * @param {String} timeRange - day, week, month
   * @returns {Array} Top buyers with spending
   */
  async getTopBuyersBySpending(limit = 10, timeRange = 'month') {
    try {
      const res = await axios.post(`${API_BASE}/api/analytics/buyer/top`, { limit, timeRange });
      return res?.data?.topBuyers || [];
    } catch (error) {
      console.error('Error getting top buyers:', error);
      return [];
    }
  },

  /**
   * Get buyer growth trends
   * @param {String} timeRange - day, week, month
   * @returns {Array} Daily new buyer data
   */
  async getBuyerGrowthTrend(timeRange = 'month') {
    try {
      const res = await axios.post(`${API_BASE}/api/analytics/buyer/growth`, { timeRange });
      return res?.data?.growth || [];
    } catch (error) {
      console.error('Error getting buyer growth trend:', error);
      return [];
    }
  },

  /**
   * Get buyer engagement metrics
   * @returns {Object} Engagement data
   */
  async getBuyerEngagementMetrics() {
    try {
      const res = await axios.post(`${API_BASE}/api/analytics/buyer/engagement`);
      return res?.data || null;
    } catch (error) {
      console.error('Error getting buyer engagement metrics:', error);
      return null;
    }
  },

  /**
   * Get repeat buyer analysis
   * @param {String} timeRange - day, week, month
   * @returns {Object} Repeat buyer data
   */
  async getRepeatBuyerAnalysis(timeRange = 'month') {
    try {
      const res = await axios.post(`${API_BASE}/api/analytics/buyer/repeat`, { timeRange });
      return res?.data || null;
    } catch (error) {
      console.error('Error getting repeat buyer analysis:', error);
      return null;
    }
  },

  /**
   * Get buyer cohort analysis (retention by signup month)
   * @returns {Array} Cohort data
   */
  async getBuyerCohortAnalysis() {
    try {
      const res = await axios.post(`${API_BASE}/api/analytics/buyer/cohort`);
      return res?.data?.cohorts || [];
    } catch (error) {
      console.error('Error getting buyer cohort analysis:', error);
      return [];
    }
  },

  /**
   * Get abandoned cart metrics
   * @returns {Object} Cart abandonment data
   */
  async getAbandonedCartMetrics() {
    try {
      const res = await axios.post(`${API_BASE}/api/analytics/buyer/abandoned`);
      return res?.data || null;
    } catch (error) {
      console.error('Error getting abandoned cart metrics:', error);
      return null;
    }
  },

  /**
   * Get customer lifetime value (CLV) segments
   * @returns {Array} Customer segments with CLV
   */
  async getCustomerLifetimeValue() {
    try {
      const res = await axios.post(`${API_BASE}/api/analytics/buyer/clv`);
      return res?.data || null;
    } catch (error) {
      console.error('Error getting customer lifetime value:', error);
      return null;
    }
  },

  /**
   * Get buyer retention metrics
   * @returns {Object} Retention data
   */
  async getBuyerRetentionMetrics() {
    try {
      const res = await axios.post(`${API_BASE}/api/analytics/buyer/retention`);
      return res?.data || null;
    } catch (error) {
      console.error('Error getting buyer retention metrics:', error);
      return null;
    }
  },

  /**
   * Get buyer detail by ID
   * @param {String} buyerId - Buyer user ID
   * @returns {Object} Buyer detail data
   */
  async getBuyerDetail(buyerId) {
    try {
      const res = await axios.get(`${API_BASE}/api/analytics/buyer/${buyerId}`);
      return res?.data || null;
    } catch (error) {
      console.error('Error getting buyer detail:', error);
      return null;
    }
  },

  // ============ PRIVATE HELPERS ============

  getStartDate(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  },

  getDaysInRange(startDate) {
    const start = new Date(startDate);
    const end = new Date();
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  getCustomerSegment(estimatedYearlyValue, orderCount) {
    if (estimatedYearlyValue >= 500000 && orderCount >= 10) {
      return 'VIP';
    } else if (estimatedYearlyValue >= 200000 && orderCount >= 5) {
      return 'High Value';
    } else if (estimatedYearlyValue >= 50000 || orderCount >= 2) {
      return 'Medium Value';
    }
    return 'Low Value';
  },

  getLoyaltyTier(orderCount, totalSpent) {
    if (orderCount >= 20 && totalSpent >= 1000000) {
      return 'Platinum';
    } else if (orderCount >= 10 && totalSpent >= 500000) {
      return 'Gold';
    } else if (orderCount >= 5 && totalSpent >= 200000) {
      return 'Silver';
    } else if (orderCount >= 2) {
      return 'Bronze';
    }
    return 'Standard';
  }
};

export default buyerAnalyticsService;
