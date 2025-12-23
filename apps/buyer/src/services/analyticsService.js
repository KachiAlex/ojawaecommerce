// Analytics Tracking Service
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit as fsLimit } from 'firebase/firestore';
import { db } from '../firebase/config';

class AnalyticsService {
  // Track store visit
  async trackStoreVisit(vendorId, visitorData = {}) {
    try {
      const visitData = {
        vendorId,
        type: 'store_visit',
        timestamp: serverTimestamp(),
        ...visitorData,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        url: window.location.href
      };

      const docRef = await addDoc(collection(db, 'analytics'), visitData);
      return docRef.id;
    } catch (error) {
      console.error('Error tracking store visit:', error);
    }
  }

  // Track product view
  async trackProductView(productId, vendorId, viewerData = {}) {
    try {
      const viewData = {
        productId,
        vendorId,
        type: 'product_view',
        timestamp: serverTimestamp(),
        ...viewerData,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        url: window.location.href
      };

      const docRef = await addDoc(collection(db, 'analytics'), viewData);
      
      // Update product view count (optional - don't fail if permission denied)
      try {
      await this.incrementProductViews(productId);
      } catch (incrementError) {
        // Silently ignore view count increment errors (permission issues)
        // The analytics event is already tracked, which is the main goal
        console.debug('Could not increment product view count:', incrementError);
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error tracking product view:', error);
    }
  }

  // Track product interaction
  async trackProductInteraction(productId, vendorId, interactionType, data = {}) {
    try {
      const interactionData = {
        productId,
        vendorId,
        type: 'product_interaction',
        interactionType, // 'add_to_cart', 'favorite', 'share', 'image_click', etc.
        timestamp: serverTimestamp(),
        ...data,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const docRef = await addDoc(collection(db, 'analytics'), interactionData);
      return docRef.id;
    } catch (error) {
      console.error('Error tracking product interaction:', error);
    }
  }

  // Track order analytics
  async trackOrderAnalytics(orderId, vendorId, orderData) {
    try {
      const analyticsData = {
        orderId,
        vendorId,
        type: 'order_analytics',
        timestamp: serverTimestamp(),
        ...orderData
      };

      const docRef = await addDoc(collection(db, 'analytics'), analyticsData);
      return docRef.id;
    } catch (error) {
      console.error('Error tracking order analytics:', error);
    }
  }

  // Track search analytics
  async trackSearch(vendorId, searchQuery, resultsCount, filters = {}) {
    try {
      const searchData = {
        vendorId,
        type: 'search',
        searchQuery,
        resultsCount,
        filters,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const docRef = await addDoc(collection(db, 'analytics'), searchData);
      return docRef.id;
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
      const pageData = {
        page,
        vendorId,
        type: 'page_view',
        timestamp: serverTimestamp(),
        ...data,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const docRef = await addDoc(collection(db, 'analytics'), pageData);
      return docRef.id;
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }

  // Track conversion
  async trackConversion(vendorId, conversionType, value, data = {}) {
    try {
      const conversionData = {
        vendorId,
        type: 'conversion',
        conversionType, // 'purchase', 'signup', 'contact', etc.
        value,
        timestamp: serverTimestamp(),
        ...data
      };

      const docRef = await addDoc(collection(db, 'analytics'), conversionData);
      return docRef.id;
    } catch (error) {
      console.error('Error tracking conversion:', error);
    }
  }
}

export default new AnalyticsService();
