import { collection, addDoc, getDocs, query, where, orderBy, limit as fsLimit, serverTimestamp, getAggregateFromServer, sum, count, average, DocumentReference } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Comprehensive Admin Analytics Service
 * Tracks all platform events and provides insights to admins
 */

const ANALYTICS_COLLECTIONS = {
  EVENTS: 'analytics_events',
  USER_SESSIONS: 'user_sessions',
  ERROR_LOGS: 'error_logs',
  PERFORMANCE_METRICS: 'performance_metrics',
  CONVERSION_FUNNEL: 'conversion_funnel'
};

export const adminAnalyticsService = {
  /**
   * Log a platform event
   * @param {Object} eventData - Event details
   */
  async logEvent(eventData) {
    try {
      const eventPayload = {
        eventType: eventData.eventType, // e.g., 'user_registered', 'order_placed', 'product_viewed'
        category: eventData.category, // e.g., 'user', 'order', 'product', 'payment', 'vendor'
        userId: eventData.userId || null,
        vendorId: eventData.vendorId || null,
        orderId: eventData.orderId || null,
        productId: eventData.productId || null,
        metadata: eventData.metadata || {},
        severity: eventData.severity || 'info', // info, warning, error, critical
        timestamp: serverTimestamp(),
        userAgent: navigator?.userAgent || 'unknown',
        ipAddress: eventData.ipAddress || null,
        sessionId: this.getSessionId()
      };

      await addDoc(collection(db, ANALYTICS_COLLECTIONS.EVENTS), eventPayload);
      return true;
    } catch (error) {
      console.error('Error logging event:', error);
      return false;
    }
  },

  /**
   * Start a user session tracking
   * @param {string} userId
   * @param {string} userRole
   */
  async startSession(userId, userRole) {
    try {
      const sessionId = this.generateSessionId();
      sessionStorage.setItem('analyticsSessionId', sessionId);

      const sessionData = {
        sessionId,
        userId,
        userRole,
        startTime: serverTimestamp(),
        endTime: null,
        actions: [],
        pageViews: [],
        errorCount: 0,
        isActive: true
      };

      const docRef = await addDoc(collection(db, ANALYTICS_COLLECTIONS.USER_SESSIONS), sessionData);
      sessionStorage.setItem('analyticsSessionDocId', docRef.id);
      
      return sessionId;
    } catch (error) {
      console.error('Error starting session:', error);
      return null;
    }
  },

  /**
   * End a user session
   * @param {string} userId
   */
  async endSession(userId) {
    try {
      const sessionDocId = sessionStorage.getItem('analyticsSessionDocId');
      if (!sessionDocId) return;

      const sessionRef = await db.collection(ANALYTICS_COLLECTIONS.USER_SESSIONS).doc(sessionDocId).get();
      if (sessionRef.exists) {
        await sessionRef.ref.update({
          endTime: serverTimestamp(),
          isActive: false
        });
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  },

  /**
   * Log a custom action
   * @param {Object} actionData
   */
  async logAction(actionData) {
    try {
      const action = {
        actionType: actionData.actionType, // e.g., 'button_click', 'form_submit', 'page_view'
        actionName: actionData.actionName,
        ...(actionData.userId && { userId: actionData.userId }),
        timestamp: serverTimestamp(),
        metadata: actionData.metadata || {},
        sessionId: this.getSessionId(),
        pagePath: window?.location?.pathname || 'unknown',
        pageTitle: document?.title || 'unknown'
      };

      await addDoc(collection(db, ANALYTICS_COLLECTIONS.EVENTS), action);
      return true;
    } catch (error) {
      console.error('Error logging action:', error);
      return false;
    }
  },

  /**
   * Log an error
   * @param {Object} errorData
   */
  async logError(errorData) {
    try {
      const errorPayload = {
        errorType: errorData.errorType || 'unknown',
        errorMessage: errorData.message || 'Unknown error',
        errorStack: errorData.stack || '',
        userId: errorData.userId || null,
        timestamp: serverTimestamp(),
        metadata: errorData.metadata || {},
        severity: 'error',
        sessionId: this.getSessionId(),
        pagePath: window?.location?.pathname || 'unknown',
        userAgent: navigator?.userAgent || 'unknown'
      };

      await addDoc(collection(db, ANALYTICS_COLLECTIONS.ERROR_LOGS), errorPayload);
      return true;
    } catch (error) {
      console.error('Error logging error:', error);
      return false;
    }
  },

  /**
   * Log performance metrics
   * @param {Object} metricsData
   */
  async logPerformanceMetrics(metricsData) {
    try {
      const metrics = {
        pageLoadTime: metricsData.pageLoadTime || 0,
        firstContentfulPaint: metricsData.firstContentfulPaint || 0,
        largestContentfulPaint: metricsData.largestContentfulPaint || 0,
        cumulativeLayoutShift: metricsData.cumulativeLayoutShift || 0,
        timeToInteractive: metricsData.timeToInteractive || 0,
        userId: metricsData.userId || null,
        pagePath: window?.location?.pathname || 'unknown',
        timestamp: serverTimestamp(),
        sessionId: this.getSessionId(),
        metadata: metricsData.metadata || {}
      };

      await addDoc(collection(db, ANALYTICS_COLLECTIONS.PERFORMANCE_METRICS), metrics);
      return true;
    } catch (error) {
      console.error('Error logging performance metrics:', error);
      return false;
    }
  },

  /**
   * Track conversion funnel
   * @param {string} userId
   * @param {string} funnelType - 'checkout', 'registration', 'listing'
   * @param {string} stage - 'view', 'start', 'progress', 'complete', 'abandon'
   * @param {Object} metadata
   */
  async trackConversionFunnel(userId, funnelType, stage, metadata = {}) {
    try {
      const funnelData = {
        userId,
        funnelType,
        stage,
        timestamp: serverTimestamp(),
        metadata,
        sessionId: this.getSessionId(),
        pagePath: window?.location?.pathname || 'unknown'
      };

      await addDoc(collection(db, ANALYTICS_COLLECTIONS.CONVERSION_FUNNEL), funnelData);
      return true;
    } catch (error) {
      console.error('Error tracking conversion funnel:', error);
      return false;
    }
  },

  /**
   * Get analytics dashboard data
   * @param {Object} filters
   */
  async getDashboardMetrics(filters = {}) {
    try {
      const timeRange = filters.timeRange || 'week'; // 'day', 'week', 'month'
      const startDate = this.getStartDate(timeRange);

      const [
        totalEvents,
        eventsByCategory,
        errorStats,
        performanceMetrics,
        conversionMetrics,
        userEngagement
      ] = await Promise.all([
        this.getTotalEvents(startDate),
        this.getEventsByCategory(startDate),
        this.getErrorStats(startDate),
        this.getPerformanceMetrics(startDate),
        this.getConversionMetrics(startDate),
        this.getUserEngagement(startDate)
      ]);

      return {
        totalEvents,
        eventsByCategory,
        errorStats,
        performanceMetrics,
        conversionMetrics,
        userEngagement,
        timeRange,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return null;
    }
  },

  /**
   * Get total events count
   */
  async getTotalEvents(startDate) {
    try {
      const q = query(
        collection(db, ANALYTICS_COLLECTIONS.EVENTS),
        where('timestamp', '>=', startDate)
      );
      const snapshot = await getAggregateFromServer(q, {
        count: count()
      });
      return snapshot.data().count || 0;
    } catch (error) {
      console.error('Error getting total events:', error);
      return 0;
    }
  },

  /**
   * Get events breakdown by category
   */
  async getEventsByCategory(startDate) {
    try {
      const q = query(
        collection(db, ANALYTICS_COLLECTIONS.EVENTS),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc'),
        fsLimit(1000)
      );
      const snapshot = await getDocs(q);
      const categoryMap = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const category = data.category || 'unknown';
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      });

      return categoryMap;
    } catch (error) {
      console.error('Error getting events by category:', error);
      return {};
    }
  },

  /**
   * Get error statistics
   */
  async getErrorStats(startDate) {
    try {
      const q = query(
        collection(db, ANALYTICS_COLLECTIONS.ERROR_LOGS),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc'),
        fsLimit(500)
      );
      const snapshot = await getDocs(q);
      
      const stats = {
        totalErrors: snapshot.size,
        errorTypes: {},
        topErrors: []
      };

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const errorType = data.errorType || 'unknown';
        stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + 1;
      });

      // Get top 10 errors
      stats.topErrors = snapshot.docs
        .slice(0, 10)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

      return stats;
    } catch (error) {
      console.error('Error getting error stats:', error);
      return { totalErrors: 0, errorTypes: {}, topErrors: [] };
    }
  },

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(startDate) {
    try {
      const q = query(
        collection(db, ANALYTICS_COLLECTIONS.PERFORMANCE_METRICS),
        where('timestamp', '>=', startDate),
        fsLimit(500)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return {
          avgPageLoadTime: 0,
          avgFCP: 0,
          avgLCP: 0,
          avgCLS: 0,
          totalSamples: 0
        };
      }

      let totalPageLoad = 0, totalFCP = 0, totalLCP = 0, totalCLS = 0;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalPageLoad += data.pageLoadTime || 0;
        totalFCP += data.firstContentfulPaint || 0;
        totalLCP += data.largestContentfulPaint || 0;
        totalCLS += data.cumulativeLayoutShift || 0;
      });

      const count = snapshot.size;
      return {
        avgPageLoadTime: (totalPageLoad / count).toFixed(2),
        avgFCP: (totalFCP / count).toFixed(2),
        avgLCP: (totalLCP / count).toFixed(2),
        avgCLS: (totalCLS / count).toFixed(2),
        totalSamples: count
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {
        avgPageLoadTime: 0,
        avgFCP: 0,
        avgLCP: 0,
        avgCLS: 0,
        totalSamples: 0
      };
    }
  },

  /**
   * Get conversion metrics
   */
  async getConversionMetrics(startDate) {
    try {
      const q = query(
        collection(db, ANALYTICS_COLLECTIONS.CONVERSION_FUNNEL),
        where('timestamp', '>=', startDate),
        fsLimit(1000)
      );
      const snapshot = await getDocs(q);

      const funnels = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const funnelType = data.funnelType || 'unknown';
        
        if (!funnels[funnelType]) {
          funnels[funnelType] = {
            view: 0,
            start: 0,
            progress: 0,
            complete: 0,
            abandon: 0
          };
        }
        
        funnels[funnelType][data.stage] = (funnels[funnelType][data.stage] || 0) + 1;
      });

      // Calculate conversion rates
      const conversionRates = {};
      Object.keys(funnels).forEach(funnelType => {
        const funnel = funnels[funnelType];
        const total = funnel.view || 1;
        conversionRates[funnelType] = {
          ...funnel,
          conversionRate: ((funnel.complete / total) * 100).toFixed(2) + '%'
        };
      });

      return conversionRates;
    } catch (error) {
      console.error('Error getting conversion metrics:', error);
      return {};
    }
  },

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(startDate) {
    try {
      const q = query(
        collection(db, ANALYTICS_COLLECTIONS.USER_SESSIONS),
        where('startTime', '>=', startDate),
        fsLimit(1000)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return {
          activeSessions: 0,
          averageSessionDuration: 0,
          totalSessions: 0,
          uniqueUsers: new Set().size
        };
      }

      let totalDuration = 0;
      const uniqueUsers = new Set();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        uniqueUsers.add(data.userId);
        
        if (data.endTime && data.startTime) {
          const duration = (data.endTime.toDate() - data.startTime.toDate()) / 1000; // in seconds
          totalDuration += duration;
        }
      });

      return {
        activeSessions: snapshot.docs.filter(doc => doc.data().isActive).length,
        averageSessionDuration: (totalDuration / snapshot.size).toFixed(2) + 's',
        totalSessions: snapshot.size,
        uniqueUsers: uniqueUsers.size
      };
    } catch (error) {
      console.error('Error getting user engagement:', error);
      return {
        activeSessions: 0,
        averageSessionDuration: 0,
        totalSessions: 0,
        uniqueUsers: 0
      };
    }
  },

  /**
   * Export analytics data
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   */
  async exportAnalytics(format = 'json', filters = {}) {
    try {
      const timeRange = filters.timeRange || 'week';
      const startDate = this.getStartDate(timeRange);

      const q = query(
        collection(db, ANALYTICS_COLLECTIONS.EVENTS),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc'),
        fsLimit(5000)
      );
      
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
      }));

      if (format === 'csv') {
        return this.convertToCSV(events);
      } else {
        return JSON.stringify(events, null, 2);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      return null;
    }
  },

  /**
   * Helper: Get session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('analyticsSessionId');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('analyticsSessionId', sessionId);
    }
    return sessionId;
  },

  /**
   * Helper: Generate session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Helper: Get start date based on time range
   */
  getStartDate(timeRange) {
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    return startDate;
  },

  /**
   * Helper: Convert events to CSV
   */
  convertToCSV(events) {
    const headers = ['ID', 'Event Type', 'Category', 'User ID', 'Timestamp', 'Severity'];
    const csvContent = [
      headers.join(','),
      ...events.map(event => [
        event.id,
        event.eventType || '',
        event.category || '',
        event.userId || '',
        event.timestamp || '',
        event.severity || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
  }
};

export default adminAnalyticsService;
