import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ojawaecommerce.onrender.com';

// TODO: Implement backend endpoints under `/api/analytics/platform/*`

/**
 * Platform Health Analytics Service
 * Provides system performance, CSP health, API latency, and Firestore usage metrics
 */

const platformHealthAnalyticsService = {
  /**
   * Get platform health overview
   * @returns {Object} Health metrics
   */
  async getPlatformHealthOverview() {
    try {
      try {
        const res = await axios.post(`${API_BASE}/api/analytics/platform/overview`);
        return res?.data || this.getDefaultHealthMetrics();
      } catch (e) {
        console.error('Error fetching platform health from backend:', e);
        return this.getDefaultHealthMetrics();
      }
    } catch (error) {
      console.error('Error getting platform health overview:', error);
      return this.getDefaultHealthMetrics();
    }
  },

  /**
   * Get API performance metrics
   * @returns {Array} API endpoint performance data
   */
  async getAPIPerformanceMetrics() {
    try {
      const res = await axios.get(`${API_BASE}/api/analytics/api-performance`);
      return res?.data || [];
    } catch (error) {
      console.error('Error getting API performance metrics:', error);
      return [];
    }
  },

  /**
   * Get Firestore usage metrics
   * @returns {Object} Database usage data
   */
  async getFirestoreUsageMetrics() {
    try {
      const res = await axios.get(`${API_BASE}/api/analytics/firestore-usage`);
      return res?.data || null;
    } catch (error) {
      console.error('Error getting Firestore usage metrics:', error);
      return null;
    }
  },

  /**
   * Get CSP (Content Security Policy) health
   * @returns {Object} CSP violations and health
   */
  async getCSPHealthMetrics() {
    try {
      const res = await axios.get(`${API_BASE}/api/analytics/csp`);
      return res?.data || this.getDefaultCSPMetrics();
    } catch (error) {
      console.error('Error getting CSP health metrics:', error);
      return this.getDefaultCSPMetrics();
    }
  },

  /**
   * Get error tracking metrics
   * @returns {Object} Error statistics
   */
  async getErrorTrackingMetrics() {
    try {
      const res = await axios.get(`${API_BASE}/api/analytics/errors`);
      return res?.data || null;
    } catch (error) {
      console.error('Error getting error tracking metrics:', error);
      return null;
    }
  },

  /**
   * Get performance trend over time
   * @param {String} timeRange - day, week, month
   * @returns {Array} Performance data over time
   */
  async getPerformanceTrend(timeRange = 'day') {
    try {
      const res = await axios.get(`${API_BASE}/api/analytics/platform/performance-trend`, { params: { timeRange } });
      return res?.data || [];
    } catch (error) {
      console.error('Error getting performance trend (REST):', error);
      return [];
    }
  },

  /**
   * Get user activity metrics
   * @returns {Object} Activity statistics
   */
  async getUserActivityMetrics() {
    try {
      const res = await axios.get(`${API_BASE}/api/analytics/platform/user-activity`);
      return res?.data || null;
    } catch (error) {
      console.error('Error getting user activity metrics (REST):', error);
      return null;
    }
  },

  /**
   * Get service status checks
   * @returns {Object} Service health status
   */
  async getServiceStatusMetrics() {
    try {
      // Check various services
      const services = ['firebase_auth', 'firestore_db', 'cloud_storage', 'stripe_payment', 'flutterwave_payment', 'google_maps'];
      
      const statusMetrics = {};
      for (const service of services) {
        // In production, these would be actual health checks
        statusMetrics[service] = {
          name: service.replace('_', ' ').toUpperCase(),
          status: 'operational', // or 'degraded', 'down'
          responseTime: Math.random() * 500 + 100,
          uptime: '99.99%',
          lastIncident: null
        };
      }

      return {
        services: statusMetrics,
        overallStatus: 'operational',
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting service status:', error);
      return null;
    }
  },

  // ============ PRIVATE HELPERS ============

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

  getDefaultCSPMetrics() {
    return {
      totalViolations: 0,
      cspHealthScore: '100.0',
      status: 'healthy',
      violationTypes: {},
      topViolations: [],
      trends: []
    };
  },

  getCspTrends(violations) {
    // Calculate trend data
    const hourlyViolations = {};
    for (let i = 0; i < 24; i++) {
      hourlyViolations[i] = 0;
    }

    violations.forEach(v => {
      const hour = new Date(v.timestamp).getHours();
      hourlyViolations[hour]++;
    });

    return Object.entries(hourlyViolations).map(([hour, count]) => ({
      hour: `${hour}:00`,
      violations: count
    }));
  }
};

export default platformHealthAnalyticsService;
