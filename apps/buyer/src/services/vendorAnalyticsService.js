import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit as fsLimit, 
  getDocs,
  getAggregateFromServer,
  count,
  sum,
  average,
  serverTimestamp,
  addDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Vendor Analytics Service
 * Provides comprehensive vendor metrics and performance data for admin dashboard
 */

const ANALYTICS_COLLECTIONS = {
  EVENTS: 'analytics_events',
  VENDOR_METRICS: 'analytics_vendor_metrics',
  VENDORS: 'vendors'
};

export const vendorAnalyticsService = {
  /**
   * Get vendor overview metrics for dashboard
   * @param {Object} filters - { timeRange: 'day|week|month', status: 'all|active|suspended' }
   */
  async getVendorOverviewMetrics(filters = {}) {
    try {
      const timeRange = filters.timeRange || 'month';
      const status = filters.status || 'all';
      const startDate = this.getStartDate(timeRange);

      // Get all vendors with their basic stats
      const vendorsCollection = collection(db, 'users');
      let q = query(
        vendorsCollection,
        where('isVendor', '==', true),
        orderBy('vendorProfile.onboardedAt', 'desc'),
        fsLimit(1000)
      );

      const vendorsSnapshot = await getDocs(q);
      const vendors = [];

      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorData = vendorDoc.data();
        const vendorId = vendorDoc.id;

        // Skip if filtering by status and doesn't match
        const vendorStatus = vendorData.suspended ? 'suspended' : 
                            (vendorData.vendorProfile?.verificationStatus === 'approved' ? 'approved' : 'pending');
        
        if (status !== 'all' && vendorStatus !== status) continue;

        // Get vendor orders count and revenue
        const orderStats = await this.getVendorOrderStats(vendorId, startDate);
        
        vendors.push({
          id: vendorId,
          name: vendorData.vendorProfile?.storeName || vendorData.vendorProfile?.businessName,
          businessName: vendorData.vendorProfile?.businessName,
          email: vendorData.email,
          status: vendorStatus,
          rating: vendorData.vendorProfile?.rating || 0,
          ratingCount: vendorData.vendorProfile?.ratingCount || 0,
          productsCount: vendorData.vendorProfile?.productsCount || 0,
          ordersCount: orderStats.orderCount,
          revenue: orderStats.revenue,
          createdAt: vendorData.vendorProfile?.onboardedAt || vendorData.createdAt,
          phone: vendorData.vendorProfile?.businessPhone,
          category: vendorData.vendorProfile?.businessType
        });
      }

      // Sort by revenue descending
      vendors.sort((a, b) => b.revenue - a.revenue);

      return {
        totalVendors: vendors.length,
        activeVendors: vendors.filter(v => v.status === 'approved').length,
        pendingVendors: vendors.filter(v => v.status === 'pending').length,
        suspendedVendors: vendors.filter(v => v.status === 'suspended').length,
        totalVendorRevenue: vendors.reduce((sum, v) => sum + v.revenue, 0),
        averageRevenuePerVendor: vendors.length > 0 ? vendors.reduce((sum, v) => sum + v.revenue, 0) / vendors.length : 0,
        averageRating: vendors.length > 0 ? vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length : 0,
        vendors: vendors,
        timeRange,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting vendor overview metrics:', error);
      return null;
    }
  },

  /**
   * Get top vendors by revenue for leaderboard
   */
  async getTopVendorsByRevenue(limit = 10, timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);
      const metrics = await this.getVendorOverviewMetrics({ timeRange });
      
      if (!metrics) return [];

      return metrics.vendors
        .filter(v => v.status === 'approved')
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit)
        .map((vendor, index) => ({
          ...vendor,
          rank: index + 1
        }));
    } catch (error) {
      console.error('Error getting top vendors:', error);
      return [];
    }
  },

  /**
   * Get vendor growth trend data
   */
  async getVendorGrowthTrend(timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);
      const days = this.getDaysInRange(timeRange);

      // Get vendor registration events
      const q = query(
        collection(db, ANALYTICS_COLLECTIONS.EVENTS),
        where('eventType', '==', 'vendor_registered'),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      const trendData = {};

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        trendData[dateStr] = 0;
      }

      // Count registrations per day
      snapshot.docs.forEach(doc => {
        const timestamp = doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp);
        const dateStr = timestamp.toISOString().split('T')[0];
        if (trendData[dateStr] !== undefined) {
          trendData[dateStr]++;
        }
      });

      // Convert to array format for charting
      return Object.entries(trendData)
        .map(([date, count]) => ({
          date,
          newVendors: count,
          timestamp: new Date(date).getTime()
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error getting vendor growth trend:', error);
      return [];
    }
  },

  /**
   * Get vendor health indicators
   */
  async getVendorHealthIndicators() {
    try {
      const vendorsCollection = collection(db, 'users');
      const q = query(
        vendorsCollection,
        where('isVendor', '==', true),
        fsLimit(1000)
      );

      const snapshot = await getDocs(q);
      const healthData = {
        responsiveVendors: 0,      // Response rate > 80%
        lowResponseVendors: 0,     // Response rate < 50%
        highRatedVendors: 0,       // Rating >= 4.5
        lowRatedVendors: 0,        // Rating < 3.0
        activeListers: 0,          // Updated products in last 7 days
        inactiveVendors: 0,        // No updates in 30 days
        totalVendors: snapshot.size
      };

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      snapshot.docs.forEach(vendorDoc => {
        const vendorData = vendorDoc.data();
        const rating = vendorData.vendorProfile?.rating || 0;
        const responseRate = vendorData.vendorProfile?.responseRate || 0;
        const lastUpdate = vendorData.vendorProfile?.lastUpdatedAt?.toDate?.() || new Date(0);

        if (responseRate > 0.8) healthData.responsiveVendors++;
        if (responseRate < 0.5 && responseRate > 0) healthData.lowResponseVendors++;
        if (rating >= 4.5) healthData.highRatedVendors++;
        if (rating < 3.0 && rating > 0) healthData.lowRatedVendors++;
        if (lastUpdate > sevenDaysAgo) healthData.activeListers++;
        if (lastUpdate < thirtyDaysAgo) healthData.inactiveVendors++;
      });

      return {
        ...healthData,
        healthScore: this.calculatePlatformHealthScore(healthData),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting vendor health indicators:', error);
      return null;
    }
  },

  /**
   * Get vendors by category
   */
  async getVendorsByCategory(timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);
      const vendorsCollection = collection(db, 'users');
      
      const q = query(
        vendorsCollection,
        where('isVendor', '==', true),
        fsLimit(1000)
      );

      const snapshot = await getDocs(q);
      const categoryData = {};

      for (const vendorDoc of snapshot.docs) {
        const vendorData = vendorDoc.data();
        const category = vendorData.vendorProfile?.businessType || 'Other';
        const vendorId = vendorDoc.id;

        if (!categoryData[category]) {
          categoryData[category] = {
            count: 0,
            revenue: 0,
            orders: 0,
            avgRating: 0
          };
        }

        const orderStats = await this.getVendorOrderStats(vendorId, startDate);
        categoryData[category].count++;
        categoryData[category].revenue += orderStats.revenue;
        categoryData[category].orders += orderStats.orderCount;
        categoryData[category].avgRating += (vendorData.vendorProfile?.rating || 0);
      }

      // Calculate averages
      Object.keys(categoryData).forEach(category => {
        const count = categoryData[category].count;
        categoryData[category].avgRating = categoryData[category].avgRating / count;
      });

      return Object.entries(categoryData)
        .map(([category, data]) => ({
          category,
          ...data
        }))
        .sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('Error getting vendors by category:', error);
      return [];
    }
  },

  /**
   * Get vendor onboarding funnel
   */
  async getVendorOnboardingFunnel() {
    try {
      const events = collection(db, ANALYTICS_COLLECTIONS.EVENTS);
      
      // Count each stage
      const [registered, approved, firstProduct, firstSale] = await Promise.all([
        getDocs(query(
          events,
          where('eventType', '==', 'vendor_registered')
        )).then(snap => snap.size),
        getDocs(query(
          events,
          where('eventType', '==', 'vendor_approved')
        )).then(snap => snap.size),
        getDocs(query(
          events,
          where('eventType', '==', 'vendor_first_product_listed')
        )).then(snap => snap.size),
        getDocs(query(
          events,
          where('eventType', '==', 'vendor_first_sale')
        )).then(snap => snap.size)
      ]);

      return {
        stages: [
          {
            name: 'Registered',
            count: registered,
            percentage: 100
          },
          {
            name: 'Approved',
            count: approved,
            percentage: registered > 0 ? (approved / registered * 100).toFixed(1) : 0
          },
          {
            name: 'Listed Product',
            count: firstProduct,
            percentage: registered > 0 ? (firstProduct / registered * 100).toFixed(1) : 0
          },
          {
            name: 'First Sale',
            count: firstSale,
            percentage: registered > 0 ? (firstSale / registered * 100).toFixed(1) : 0
          }
        ],
        totalRegistered: registered,
        conversionRate: registered > 0 ? ((firstSale / registered) * 100).toFixed(1) : 0,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting vendor onboarding funnel:', error);
      return null;
    }
  },

  /**
   * Get vendor detail profile
   */
  async getVendorDetail(vendorId) {
    try {
      const vendorRef = doc(db, 'users', vendorId);
      const vendorSnapshot = await getDoc(vendorRef);

      if (!vendorSnapshot.exists()) {
        return null;
      }

      const vendorData = vendorSnapshot.data();
      const startDate = this.getStartDate('month');
      const orderStats = await this.getVendorOrderStats(vendorId, startDate);

      return {
        id: vendorId,
        name: vendorData.vendorProfile?.storeName,
        businessName: vendorData.vendorProfile?.businessName,
        email: vendorData.email,
        phone: vendorData.vendorProfile?.businessPhone,
        address: vendorData.vendorProfile?.businessAddress,
        businessType: vendorData.vendorProfile?.businessType,
        rating: vendorData.vendorProfile?.rating || 0,
        ratingCount: vendorData.vendorProfile?.ratingCount || 0,
        status: vendorData.suspended ? 'suspended' : 
                (vendorData.vendorProfile?.verificationStatus === 'approved' ? 'approved' : 'pending'),
        productsCount: vendorData.vendorProfile?.productsCount || 0,
        storeDescription: vendorData.vendorProfile?.storeDescription,
        responseTime: vendorData.vendorProfile?.responseTime || 'N/A',
        joinDate: vendorData.vendorProfile?.onboardedAt || vendorData.createdAt,
        ...orderStats,
        nin: vendorData.vendorProfile?.nin ? 
          `***-***-${vendorData.vendorProfile.nin.slice(-4)}` : 'N/A'
      };
    } catch (error) {
      console.error('Error getting vendor detail:', error);
      return null;
    }
  },

  /**
   * Get vendor order statistics
   * @private
   */
  async getVendorOrderStats(vendorId, startDate) {
    try {
      const ordersCollection = collection(db, 'orders');
      const q = query(
        ordersCollection,
        where('vendorId', '==', vendorId),
        where('createdAt', '>=', startDate)
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
