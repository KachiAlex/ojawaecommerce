/**
 * Real-time Analytics Service
 * 
 * Provides Firestore listeners for real-time analytics updates
 * across all dashboard sections. Implements efficient listener management
 * with automatic cleanup and subscription handling.
 * 
 * Usage:
 *   const { subscribe, unsubscribe } = realtimeAnalyticsService;
 *   
 *   // Subscribe to vendor metrics
 *   const unsubVendor = subscribe('vendor', (data) => {
 *     setVendorMetrics(data);
 *   });
 *   
 *   // Cleanup
 *   unsubVendor();
 */

import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

class RealtimeAnalyticsService {
  constructor() {
    this.listeners = new Map(); // Store active listeners for cleanup
    this.subscriptions = new Map(); // Store subscription callbacks
    this.cache = new Map(); // Local cache for quick access
    this.cacheTimestamps = new Map(); // Track cache freshness
  }

  /**
   * Subscribe to real-time vendor analytics
   * @param {Function} callback - Called with updated vendor metrics
   * @returns {Function} Unsubscribe function
   */
  subscribeToVendorMetrics(callback) {
    const listenerKey = `vendor_metrics_${Date.now()}`;
    // Polling-based fallback for vendor metrics
    const intervalMs = 10000
    const timer = setInterval(async () => {
      try {
        const resp = await axios.get(`${API_BASE}/api/analytics/vendor/overview`)
        const updates = resp?.data || { overview: {}, vendorsList: [], livestream: false }
        callback(updates)
        this.cache.set('vendorMetrics', updates)
        this.cacheTimestamps.set('vendorMetrics', Date.now())
      } catch (error) {
        // Non-fatal polling error — backend may not implement vendor endpoint yet
        // Log at debug level to help CI while avoiding noisy errors
         
        console.debug('Realtime vendor metrics poll failed:', error?.message || error);
      }
    }, intervalMs)

    this.listeners.set(listenerKey, () => clearInterval(timer))
    return () => {
      clearInterval(timer)
      this.listeners.delete(listenerKey)
    }
  }

  /**
   * Subscribe to real-time buyer analytics
   * @param {Function} callback - Called with updated buyer metrics
   * @returns {Function} Unsubscribe function
   */
  subscribeToBuyerMetrics(callback) {
    const listenerKey = `buyer_metrics_${Date.now()}`;
    const intervalMs = 10000
    const timer = setInterval(async () => {
      try {
        const resp = await axios.post(`${API_BASE}/api/analytics/buyer/overview`)
        const updates = resp?.data || { overview: {}, buyersList: [], livestream: false }
        callback(updates)
        this.cache.set('buyerMetrics', updates)
        this.cacheTimestamps.set('buyerMetrics', Date.now())
      } catch (error) {
        console.debug('Realtime buyer metrics poll failed:', error?.message || error);
      }
    }, intervalMs)

    this.listeners.set(listenerKey, () => clearInterval(timer))
    return () => { clearInterval(timer); this.listeners.delete(listenerKey) }
  }

  /**
   * Subscribe to real-time transaction analytics
   * @param {Function} callback - Called with updated transaction metrics
   * @returns {Function} Unsubscribe function
   */
  subscribeToTransactionMetrics(callback) {
    const listenerKey = `transaction_metrics_${Date.now()}`;
    const intervalMs = 10000
    const timer = setInterval(async () => {
      try {
        const resp = await axios.post(`${API_BASE}/api/analytics/transactions/overview`)
        const updates = resp?.data || { overview: {}, livestream: false }
        callback(updates)
        this.cache.set('transactionMetrics', updates)
        this.cacheTimestamps.set('transactionMetrics', Date.now())
      } catch (error) {
        console.debug('Realtime transaction metrics poll failed:', error?.message || error);
      }
    }, intervalMs)

    this.listeners.set(listenerKey, () => clearInterval(timer))
    return () => { clearInterval(timer); this.listeners.delete(listenerKey) }
  }

  /**
   * Subscribe to real-time platform health metrics
   * @param {Function} callback - Called with updated health metrics
   * @returns {Function} Unsubscribe function
   */
  subscribeToHealthMetrics(callback) {
    const listenerKey = `health_metrics_${Date.now()}`;
    const intervalMs = 10000
    const timer = setInterval(async () => {
      try {
        const resp = await axios.post(`${API_BASE}/api/analytics/platform/overview`)
        const updates = resp?.data || { currentHealth: 0, recentMetrics: [], livestream: false }
        callback(updates)
        this.cache.set('healthMetrics', updates)
        this.cacheTimestamps.set('healthMetrics', Date.now())
      } catch (error) {
        console.debug('Realtime health metrics poll failed:', error?.message || error);
      }
    }, intervalMs)

    this.listeners.set(listenerKey, () => clearInterval(timer))
    return () => { clearInterval(timer); this.listeners.delete(listenerKey) }
  }

  /**
   * Subscribe to real-time error tracking
   * @param {Function} callback - Called with new errors
   * @returns {Function} Unsubscribe function
   */
  subscribeToErrors(callback) {
    const listenerKey = `errors_${Date.now()}`;
    const intervalMs = 10000
    const timer = setInterval(async () => {
      try {
        const resp = await axios.get(`${API_BASE}/api/analytics/errors`)
        const updates = resp?.data || { totalErrors: 0, errorList: [], severityCount: {}, livestream: false }
        callback(updates)
        this.cache.set('errors', updates)
        this.cacheTimestamps.set('errors', Date.now())
      } catch (error) {
        console.debug('Realtime errors poll failed:', error?.message || error);
      }
    }, intervalMs)

    this.listeners.set(listenerKey, () => clearInterval(timer))
    return () => { clearInterval(timer); this.listeners.delete(listenerKey) }
  }

  /**
   * Subscribe to real-time API performance
   * @param {Function} callback - Called with updated API metrics
   * @returns {Function} Unsubscribe function
   */
  subscribeToAPIPerformance(callback) {
    const listenerKey = `api_performance_${Date.now()}`;

    const intervalMs = 10000
    const timer = setInterval(async () => {
      try {
        const resp = await axios.get(`${API_BASE}/api/analytics/api-performance`)
        const updates = resp?.data || { endpoints: [], totalCalls: 0, totalErrors: 0 }
        callback(updates)
        this.cache.set('apiPerformance', updates)
        this.cacheTimestamps.set('apiPerformance', Date.now())
      } catch (error) {
        console.debug('Realtime API performance poll failed:', error?.message || error);
      }
    }, intervalMs)

    this.listeners.set(listenerKey, () => clearInterval(timer))
    return () => { clearInterval(timer); this.listeners.delete(listenerKey) }
  }

  /**
   * Subscribe to real-time user activity
   * @param {Function} callback - Called with activity updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToUserActivity(callback) {
    const listenerKey = `user_activity_${Date.now()}`;
    const intervalMs = 10000
    const timer = setInterval(async () => {
      try {
        const resp = await axios.get(`${API_BASE}/api/analytics/user-activity`)
        const updates = resp?.data || { recentActivity: [], eventTypes: {}, activeUserCount: 0 }
        callback(updates)
        this.cache.set('userActivity', updates)
        this.cacheTimestamps.set('userActivity', Date.now())
      } catch (error) {
        console.debug('Realtime user activity poll failed:', error?.message || error);
      }
    }, intervalMs)

    this.listeners.set(listenerKey, () => clearInterval(timer))
    return () => { clearInterval(timer); this.listeners.delete(listenerKey) }
  }

  /**
   * Get cached data if available and fresh
   * @param {string} key - Cache key
   * @param {number} maxAge - Maximum cache age in ms (default 5 minutes)
   * @returns {any|null} Cached data or null if expired
   */
  getCachedData(key, maxAge = 300000) {
    const timestamp = this.cacheTimestamps.get(key);
    if (timestamp && Date.now() - timestamp < maxAge) {
      return this.cache.get(key);
    }
    return null;
  }

  /**
   * Clear all listeners and cleanup
   */
  unsubscribeAll() {
    this.listeners.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
    this.listeners.clear();
    this.subscriptions.clear();
  }

  /**
   * Get number of active listeners
   * @returns {number} Count of active listeners
   */
  getListenerCount() {
    return this.listeners.size;
  }

  /**
   * Get all cached data
   * @returns {Object} All cached data with timestamps
   */
  getAllCachedData() {
    const result = {};
    this.cache.forEach((value, key) => {
      result[key] = {
        data: value,
        timestamp: this.cacheTimestamps.get(key),
        age: Date.now() - this.cacheTimestamps.get(key)
      };
    });
    return result;
  }
}

// Export singleton instance
export const realtimeAnalyticsService = new RealtimeAnalyticsService();

export default realtimeAnalyticsService;
