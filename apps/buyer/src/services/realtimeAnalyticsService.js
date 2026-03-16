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

import { 
  db, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
  Timestamp
} from '../config/firebase';

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
    
    // Real-time listener for vendor overview
    const unsubVendor = onSnapshot(
      query(
        collection(db, 'vendors'),
        limit(100)
      ),
      (snapshot) => {
        try {
          const vendors = [];
          let totalSales = 0;
          let totalProducts = 0;
          let avgRating = 0;
          const ratingSum = [];

          snapshot.forEach(doc => {
            const data = doc.data();
            vendors.push({
              id: doc.id,
              ...data
            });
            totalSales += data.sales_count || 0;
            totalProducts += data.product_count || 0;
            if (data.rating) ratingSum.push(data.rating);
          });

          avgRating = ratingSum.length > 0 
            ? ratingSum.reduce((a, b) => a + b, 0) / ratingSum.length 
            : 0;

          const updates = {
            overview: {
              totalVendors: snapshot.size,
              totalSales,
              totalProducts,
              avgRating: avgRating.toFixed(2),
              timestamp: new Date()
            },
            vendorsList: vendors,
            livestream: true
          };

          callback(updates);
          this.cache.set('vendorMetrics', updates);
          this.cacheTimestamps.set('vendorMetrics', Date.now());
        } catch (error) {
          console.error('Error processing vendor metrics:', error);
        }
      },
      (error) => console.error('Vendor metrics listener error:', error)
    );

    this.listeners.set(listenerKey, unsubVendor);
    return () => {
      unsubVendor();
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Subscribe to real-time buyer analytics
   * @param {Function} callback - Called with updated buyer metrics
   * @returns {Function} Unsubscribe function
   */
  subscribeToBuyerMetrics(callback) {
    const listenerKey = `buyer_metrics_${Date.now()}`;

    const unsubBuyers = onSnapshot(
      query(
        collection(db, 'users'),
        where('user_type', '==', 'buyer'),
        limit(100)
      ),
      (snapshot) => {
        try {
          const buyers = [];
          let totalSpent = 0;
          let totalOrders = 0;
          const valueDistribution = { vip: 0, high: 0, medium: 0, low: 0 };

          snapshot.forEach(doc => {
            const data = doc.data();
            buyers.push({
              id: doc.id,
              ...data
            });
            totalSpent += data.total_spent || 0;
            totalOrders += data.order_count || 0;

            // Segment by value
            const spent = data.total_spent || 0;
            if (spent > 5000) valueDistribution.vip++;
            else if (spent > 2000) valueDistribution.high++;
            else if (spent > 500) valueDistribution.medium++;
            else valueDistribution.low++;
          });

          const updates = {
            overview: {
              totalBuyers: snapshot.size,
              totalSpent,
              avgOrderValue: totalOrders > 0 ? (totalSpent / totalOrders).toFixed(2) : 0,
              totalOrders,
              ...valueDistribution,
              timestamp: new Date()
            },
            buyersList: buyers,
            livestream: true
          };

          callback(updates);
          this.cache.set('buyerMetrics', updates);
          this.cacheTimestamps.set('buyerMetrics', Date.now());
        } catch (error) {
          console.error('Error processing buyer metrics:', error);
        }
      },
      (error) => console.error('Buyer metrics listener error:', error)
    );

    this.listeners.set(listenerKey, unsubBuyers);
    return () => {
      unsubBuyers();
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Subscribe to real-time transaction analytics
   * @param {Function} callback - Called with updated transaction metrics
   * @returns {Function} Unsubscribe function
   */
  subscribeToTransactionMetrics(callback) {
    const listenerKey = `transaction_metrics_${Date.now()}`;

    const unsubTransactions = onSnapshot(
      query(
        collection(db, 'orders'),
        orderBy('created_at', 'desc'),
        limit(500)
      ),
      (snapshot) => {
        try {
          let totalRevenue = 0;
          let totalOrders = 0;
          let completedOrders = 0;
          let cancelledOrders = 0;
          const paymentMethods = {};
          const orderStatus = {};

          snapshot.forEach(doc => {
            const data = doc.data();
            totalRevenue += data.total_amount || 0;
            totalOrders++;

            // Track status
            const status = data.status || 'pending';
            orderStatus[status] = (orderStatus[status] || 0) + 1;
            if (status === 'completed') completedOrders++;
            if (status === 'cancelled') cancelledOrders++;

            // Track payment methods
            const method = data.payment_method || 'unknown';
            paymentMethods[method] = (paymentMethods[method] || 0) + 1;
          });

          const updates = {
            overview: {
              totalRevenue: totalRevenue.toFixed(2),
              totalOrders,
              completedOrders,
              cancelledOrders,
              completionRate: ((completedOrders / totalOrders) * 100).toFixed(2),
              avgOrderValue: (totalRevenue / totalOrders).toFixed(2),
              timestamp: new Date()
            },
            orderStatus,
            paymentMethods,
            livestream: true
          };

          callback(updates);
          this.cache.set('transactionMetrics', updates);
          this.cacheTimestamps.set('transactionMetrics', Date.now());
        } catch (error) {
          console.error('Error processing transaction metrics:', error);
        }
      },
      (error) => console.error('Transaction metrics listener error:', error)
    );

    this.listeners.set(listenerKey, unsubTransactions);
    return () => {
      unsubTransactions();
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Subscribe to real-time platform health metrics
   * @param {Function} callback - Called with updated health metrics
   * @returns {Function} Unsubscribe function
   */
  subscribeToHealthMetrics(callback) {
    const listenerKey = `health_metrics_${Date.now()}`;

    const unsubHealth = onSnapshot(
      query(
        collection(db, 'analytics_system_health'),
        orderBy('timestamp', 'desc'),
        limit(100)
      ),
      (snapshot) => {
        try {
          const metrics = [];
          let currentHealth = 0;
          let avgCPU = 0;
          let avgMemory = 0;
          let avgResponseTime = 0;
          let avgErrorRate = 0;

          snapshot.forEach(doc => {
            const data = doc.data();
            metrics.push(data);
          });

          // Calculate averages
          if (metrics.length > 0) {
            avgCPU = metrics.reduce((sum, m) => sum + (m.cpu_usage || 0), 0) / metrics.length;
            avgMemory = metrics.reduce((sum, m) => sum + (m.memory_usage || 0), 0) / metrics.length;
            avgResponseTime = metrics.reduce((sum, m) => sum + (m.response_time || 0), 0) / metrics.length;
            avgErrorRate = metrics.reduce((sum, m) => sum + (m.error_rate || 0), 0) / metrics.length;
            currentHealth = metrics[0]?.health_score || 0;
          }

          const updates = {
            currentHealth: Math.round(currentHealth),
            cpu: Math.round(avgCPU),
            memory: Math.round(avgMemory),
            responseTime: Math.round(avgResponseTime),
            errorRate: avgErrorRate.toFixed(2),
            status: currentHealth > 80 ? 'healthy' : currentHealth > 50 ? 'warning' : 'critical',
            recentMetrics: metrics.slice(0, 24), // Last 24 data points
            timestamp: new Date(),
            livestream: true
          };

          callback(updates);
          this.cache.set('healthMetrics', updates);
          this.cacheTimestamps.set('healthMetrics', Date.now());
        } catch (error) {
          console.error('Error processing health metrics:', error);
        }
      },
      (error) => console.error('Health metrics listener error:', error)
    );

    this.listeners.set(listenerKey, unsubHealth);
    return () => {
      unsubHealth();
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Subscribe to real-time error tracking
   * @param {Function} callback - Called with new errors
   * @returns {Function} Unsubscribe function
   */
  subscribeToErrors(callback) {
    const listenerKey = `errors_${Date.now()}`;

    const unsubErrors = onSnapshot(
      query(
        collection(db, 'error_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      ),
      (snapshot) => {
        try {
          const errors = [];
          const severityCount = { critical: 0, high: 0, medium: 0, low: 0 };

          snapshot.forEach(doc => {
            const data = doc.data();
            errors.push({
              id: doc.id,
              ...data
            });
            const severity = data.severity || 'medium';
            severityCount[severity]++;
          });

          const updates = {
            totalErrors: snapshot.size,
            errorList: errors,
            severityCount,
            timestamp: new Date(),
            livestream: true
          };

          callback(updates);
          this.cache.set('errors', updates);
          this.cacheTimestamps.set('errors', Date.now());
        } catch (error) {
          console.error('Error processing error logs:', error);
        }
      },
      (error) => console.error('Error logs listener error:', error)
    );

    this.listeners.set(listenerKey, unsubErrors);
    return () => {
      unsubErrors();
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Subscribe to real-time API performance
   * @param {Function} callback - Called with updated API metrics
   * @returns {Function} Unsubscribe function
   */
  subscribeToAPIPerformance(callback) {
    const listenerKey = `api_performance_${Date.now()}`;

    const unsubAPI = onSnapshot(
      query(
        collection(db, 'api_performance'),
        orderBy('timestamp', 'desc'),
        limit(1000)
      ),
      (snapshot) => {
        try {
          const endpoints = {};
          let totalCalls = 0;
          let totalErrors = 0;

          snapshot.forEach(doc => {
            const data = doc.data();
            const endpoint = data.endpoint || 'unknown';
            
            if (!endpoints[endpoint]) {
              endpoints[endpoint] = {
                endpoint,
                calls: 0,
                errors: 0,
                totalTime: 0,
                avgTime: 0,
                status: 'ok'
              };
            }

            endpoints[endpoint].calls++;
            totalCalls++;
            
            if (data.status_code >= 400) {
              endpoints[endpoint].errors++;
              totalErrors++;
            }
            
            endpoints[endpoint].totalTime += data.response_time || 0;
          });

          // Calculate averages
          Object.values(endpoints).forEach(ep => {
            ep.avgTime = Math.round(ep.totalTime / ep.calls);
            ep.errorRate = ((ep.errors / ep.calls) * 100).toFixed(2);
            ep.status = ep.errorRate > 10 ? 'warning' : ep.errorRate > 5 ? 'degraded' : 'ok';
          });

          const updates = {
            endpoints: Object.values(endpoints),
            totalCalls,
            totalErrors,
            errorRate: ((totalErrors / totalCalls) * 100).toFixed(2),
            timestamp: new Date(),
            livestream: true
          };

          callback(updates);
          this.cache.set('apiPerformance', updates);
          this.cacheTimestamps.set('apiPerformance', Date.now());
        } catch (error) {
          console.error('Error processing API performance:', error);
        }
      },
      (error) => console.error('API performance listener error:', error)
    );

    this.listeners.set(listenerKey, unsubAPI);
    return () => {
      unsubAPI();
      this.listeners.delete(listenerKey);
    };
  }

  /**
   * Subscribe to real-time user activity
   * @param {Function} callback - Called with activity updates
   * @returns {Function} Unsubscribe function
   */
  subscribeToUserActivity(callback) {
    const listenerKey = `user_activity_${Date.now()}`;

    const unsubActivity = onSnapshot(
      query(
        collection(db, 'user_activity'),
        orderBy('timestamp', 'desc'),
        limit(500)
      ),
      (snapshot) => {
        try {
          const activity = [];
          const eventTypes = {};
          const activeUsers = new Set();
          let totalEvents = 0;

          snapshot.forEach(doc => {
            const data = doc.data();
            activity.push({
              id: doc.id,
              ...data
            });

            const eventType = data.event_type || 'unknown';
            eventTypes[eventType] = (eventTypes[eventType] || 0) + 1;
            
            if (data.user_id) {
              activeUsers.add(data.user_id);
            }
            
            totalEvents++;
          });

          const updates = {
            recentActivity: activity.slice(0, 50),
            eventTypes,
            activeUserCount: activeUsers.size,
            totalEvents,
            timestamp: new Date(),
            livestream: true
          };

          callback(updates);
          this.cache.set('userActivity', updates);
          this.cacheTimestamps.set('userActivity', Date.now());
        } catch (error) {
          console.error('Error processing user activity:', error);
        }
      },
      (error) => console.error('User activity listener error:', error)
    );

    this.listeners.set(listenerKey, unsubActivity);
    return () => {
      unsubActivity();
      this.listeners.delete(listenerKey);
    };
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
