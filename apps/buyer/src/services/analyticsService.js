// Analytics Tracking Service (REST-backed)
// All events routed to /api/analytics/* endpoints

// Note: Firebase is disabled, using REST API only
// Helper function for timestamp
const serverTimestamp = () => new Date();

class AnalyticsService {
  // Helper method to get auth token
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  // Helper method to get headers with auth
  getAuthHeaders() {
    const token = this.getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Track store visit
  async trackStoreVisit(vendorId, visitorData = {}) {
    try {
      const visitData = {
        vendorId,
        type: 'store_visit',
        ...visitorData,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        url: window.location.href
      };
      const res = await fetch('/api/analytics/track', {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(visitData)
      });
      if (!res.ok) throw new Error(`Track failed: ${res.status}`);
      const data = await res.json();
      return data.id || 'tracked';
    } catch (error) {
      console.error('Error tracking store visit:', error);
    }
  }

  // Track product view
  async trackProductView(productId, vendorId, viewerData = {}) {
    try {
      // Firebase disabled - analytics tracking disabled
      console.log('Product view tracking disabled (Firebase removed)');
      return null;
    } catch (error) {
      console.error('Error tracking product view:', error);
    }
  }

  // Track product interaction
  async trackProductInteraction(productId, vendorId, interactionType, data = {}) {
    try {
      // Firebase disabled - analytics tracking disabled
      console.log('Product interaction tracking disabled (Firebase removed)');
      return null;
    } catch (error) {
      console.error('Error tracking product interaction:', error);
    }
  }

  // Track order analytics
  async trackOrderAnalytics(orderId, vendorId, orderData) {
    try {
      // Firebase disabled - analytics tracking disabled
      console.log('Order analytics tracking disabled (Firebase removed)');
      return null;
    } catch (error) {
      console.error('Error tracking order analytics:', error);
    }
  }

  // Track search analytics
  async trackSearch(vendorId, searchQuery, resultsCount, filters = {}) {
    try {
      // Firebase disabled - analytics tracking disabled
      console.log('Search tracking disabled (Firebase removed)');
      return null;
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  // Increment product views
  async incrementProductViews(productId) {
    try {
      const { doc, updateDoc, increment } = await import('firebase/firestore');
      const productRef = doc(db, 'products', productId);
      
      await updateDoc(productRef, {
        views: increment(1),
        lastViewedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error incrementing product views:', error);
    }
  }

  // Get vendor analytics
  async getVendorAnalytics(vendorId, dateRange = '30d') {
    try {
      const days = this.getDateRangeDays(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const q = query(
        collection(db, 'analytics'),
        where('vendorId', '==', vendorId),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const analytics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return this.processAnalyticsData(analytics);
    } catch (error) {
      console.error('Error fetching vendor analytics:', error);
      return this.getDefaultAnalytics();
    }
  }

  // Get product analytics
  async getProductAnalytics(productId, dateRange = '30d') {
    try {
      const days = this.getDateRangeDays(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const q = query(
        collection(db, 'analytics'),
        where('productId', '==', productId),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const analytics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return this.processProductAnalytics(analytics);
    } catch (error) {
      console.error('Error fetching product analytics:', error);
      return this.getDefaultProductAnalytics();
    }
  }

  // Process analytics data
  processAnalyticsData(analytics) {
    const processed = {
      totalVisits: 0,
      totalProductViews: 0,
      totalInteractions: 0,
      totalSearches: 0,
      topProducts: [],
      dailyStats: {},
      interactionTypes: {},
      searchQueries: [],
      deviceTypes: {},
      referrers: {}
    };

    analytics.forEach(item => {
      const date = item.timestamp?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
      
      if (!processed.dailyStats[date]) {
        processed.dailyStats[date] = {
          visits: 0,
          productViews: 0,
          interactions: 0,
          searches: 0
        };
      }

      switch (item.type) {
        case 'store_visit':
          processed.totalVisits++;
          processed.dailyStats[date].visits++;
          break;
        case 'product_view':
          processed.totalProductViews++;
          processed.dailyStats[date].productViews++;
          break;
        case 'product_interaction':
          processed.totalInteractions++;
          processed.dailyStats[date].interactions++;
          processed.interactionTypes[item.interactionType] = (processed.interactionTypes[item.interactionType] || 0) + 1;
          break;
        case 'search':
          processed.totalSearches++;
          processed.dailyStats[date].searches++;
          processed.searchQueries.push({
            query: item.searchQuery,
            resultsCount: item.resultsCount,
            timestamp: item.timestamp
          });
          break;
      }

      // Track device types
      if (item.userAgent) {
        const deviceType = this.getDeviceType(item.userAgent);
        processed.deviceTypes[deviceType] = (processed.deviceTypes[deviceType] || 0) + 1;
      }

      // Track referrers
      if (item.referrer) {
        const domain = this.getDomainFromUrl(item.referrer);
        processed.referrers[domain] = (processed.referrers[domain] || 0) + 1;
      }
    });

    return processed;
  }

  // Process product analytics
  processProductAnalytics(analytics) {
    const processed = {
      totalViews: 0,
      totalInteractions: 0,
      interactionTypes: {},
      dailyViews: {},
      topInteractions: []
    };

    analytics.forEach(item => {
      const date = item.timestamp?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
      
      if (!processed.dailyViews[date]) {
        processed.dailyViews[date] = 0;
      }

      if (item.type === 'product_view') {
        processed.totalViews++;
        processed.dailyViews[date]++;
      } else if (item.type === 'product_interaction') {
        processed.totalInteractions++;
        processed.interactionTypes[item.interactionType] = (processed.interactionTypes[item.interactionType] || 0) + 1;
      }
    });

    // Sort interactions by count
    processed.topInteractions = Object.entries(processed.interactionTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return processed;
  }

  // Get date range days
  getDateRangeDays(dateRange) {
    const ranges = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    return ranges[dateRange] || 30;
  }

  // Get device type from user agent
  getDeviceType(userAgent) {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'mobile';
    } else if (/Tablet|iPad/.test(userAgent)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  // Get domain from URL
  getDomainFromUrl(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'direct';
    }
  }

  // Get default analytics
  getDefaultAnalytics() {
    return {
      totalVisits: 0,
      totalProductViews: 0,
      totalInteractions: 0,
      totalSearches: 0,
      topProducts: [],
      dailyStats: {},
      interactionTypes: {},
      searchQueries: [],
      deviceTypes: {},
      referrers: {}
    };
  }

  // Get default product analytics
  getDefaultProductAnalytics() {
    return {
      totalViews: 0,
      totalInteractions: 0,
      interactionTypes: {},
      dailyViews: {},
      topInteractions: []
    };
  }

  // Track page view
  async trackPageView(page, vendorId, data = {}) {
    try {
      // Firebase disabled - analytics tracking disabled
      console.log('Page view tracking disabled (Firebase removed)');
      return null;
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }

  // Track conversion
  async trackConversion(vendorId, conversionType, value, data = {}) {
    try {
      // Firebase disabled - analytics tracking disabled
      console.log('Conversion tracking disabled (Firebase removed)');
      return null;
    } catch (error) {
      console.error('Error tracking conversion:', error);
    }
  }
}

export default new AnalyticsService();
