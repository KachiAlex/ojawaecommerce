import { collection, query, where, orderBy, limit, getDocs, getDoc, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

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

      // Get all buyers
      const buyersSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('userType', '==', 'buyer'),
          where('isVerified', '==', true)
        )
      );

      const buyers = buyersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get orders for metrics
      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate)
        )
      );

      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Calculate metrics
      const totalBuyers = buyers.length;
      const activeBuyers = buyers.filter(b => b.lastLoginDate && new Date(b.lastLoginDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
      const newBuyers = buyers.filter(b => b.createdAt && new Date(b.createdAt) > startDate).length;

      const buyerIds = new Set(buyers.map(b => b.id));
      const buyerOrders = orders.filter(o => buyerIds.has(o.buyerId));
      const totalOrderValue = buyerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const avgOrderValue = buyerOrders.length > 0 ? totalOrderValue / buyerOrders.length : 0;

      // Calculate repeat buyers
      const buyerOrderCounts = {};
      buyerOrders.forEach(order => {
        buyerOrderCounts[order.buyerId] = (buyerOrderCounts[order.buyerId] || 0) + 1;
      });
      const repeatBuyers = Object.values(buyerOrderCounts).filter(count => count > 1).length;

      // Calculate abandoned carts
      const cartsSnapshot = await getDocs(
        query(
          collection(db, 'carts'),
          where('status', '==', 'abandoned'),
          where('updatedAt', '>=', startDate)
        )
      );
      const abandonedCarts = cartsSnapshot.size;
      const abandonedCartValue = cartsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalValue || 0), 0);

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
      const startDate = this.getStartDate(timeRange);

      // Get all orders in time range
      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('status', 'in', ['completed', 'shipped', 'delivered'])
        )
      );

      // Aggregate by buyer
      const buyerSpending = {};
      const orders = ordersSnapshot.docs.map(doc => doc.data());

      for (const order of orders) {
        if (!buyerSpending[order.buyerId]) {
          buyerSpending[order.buyerId] = {
            buyerId: order.buyerId,
            totalSpent: 0,
            orderCount: 0,
            lastPurchaseDate: null
          };
        }
        buyerSpending[order.buyerId].totalSpent += order.totalAmount || 0;
        buyerSpending[order.buyerId].orderCount += 1;
        if (!buyerSpending[order.buyerId].lastPurchaseDate || order.createdAt > buyerSpending[order.buyerId].lastPurchaseDate) {
          buyerSpending[order.buyerId].lastPurchaseDate = order.createdAt;
        }
      }

      // Sort and get top
      let topBuyers = Object.values(buyerSpending)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, limit);

      // Fetch buyer details
      topBuyers = await Promise.all(
        topBuyers.map(async (buyer, index) => {
          const buyerDoc = await getDoc(doc(db, 'users', buyer.buyerId));
          const buyerData = buyerDoc.data() || {};
          return {
            rank: index + 1,
            id: buyer.buyerId,
            name: buyerData.displayName || buyerData.email || 'Unknown',
            email: buyerData.email,
            totalSpent: buyer.totalSpent,
            orderCount: buyer.orderCount,
            avgOrderValue: (buyer.totalSpent / buyer.orderCount).toFixed(0),
            lastPurchaseDate: buyer.lastPurchaseDate,
            joinDate: buyerData.createdAt,
            accountAge: this.getDaysInRange(buyerData.createdAt)
          };
        })
      );

      return topBuyers;
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
      const startDate = this.getStartDate(timeRange);
      const daysCount = this.getDaysInRange(startDate);

      // Get all new buyers in range
      const buyersSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('userType', '==', 'buyer'),
          where('createdAt', '>=', startDate)
        )
      );

      const buyers = buyersSnapshot.docs.map(doc => doc.data());

      // Group by date
      const dailyData = {};
      for (let i = 0; i < daysCount; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyData[dateStr] = 0;
      }

      buyers.forEach(buyer => {
        const date = new Date(buyer.createdAt).toISOString().split('T')[0];
        if (dailyData[date] !== undefined) {
          dailyData[date]++;
        }
      });

      return Object.entries(dailyData).map(([date, count]) => ({
        date,
        newBuyers: count
      }));
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
      // Get analytics events for engagement
      const eventsSnapshot = await getDocs(
        query(
          collection(db, 'analytics_events'),
          where('category', '==', 'buyer')
        )
      );

      const events = eventsSnapshot.docs.map(doc => doc.data());

      const engagementMetrics = {
        totalSearches: events.filter(e => e.eventType === 'product_searched').length,
        totalBrowses: events.filter(e => e.eventType === 'product_viewed').length,
        wishlistAdds: events.filter(e => e.eventType === 'wishlist_added').length,
        cartAdds: events.filter(e => e.eventType === 'cart_added').length,
        purchases: events.filter(e => e.eventType === 'purchase_completed').length
      };

      engagementMetrics.conversionRate = engagementMetrics.purchases > 0 
        ? Math.round((engagementMetrics.purchases / engagementMetrics.browses) * 100 * 100) / 100
        : 0;

      engagementMetrics.aov = 0; // Will calculate from orders
      engagementMetrics.wishlistConversion = engagementMetrics.wishlistAdds > 0
        ? Math.round((engagementMetrics.purchases / engagementMetrics.wishlistAdds) * 100 * 100) / 100
        : 0;

      return engagementMetrics;
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
      const startDate = this.getStartDate(timeRange);

      // Get all orders
      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate)
        )
      );

      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Count orders per buyer
      const buyerOrders = {};
      orders.forEach(order => {
        buyerOrders[order.buyerId] = (buyerOrders[order.buyerId] || 0) + 1;
      });

      const buyerCounts = Object.values(buyerOrders);
      const totalBuyers = buyerCounts.length;
      const oneTimeBuyers = buyerCounts.filter(count => count === 1).length;
      const repeatBuyers = buyerCounts.filter(count => count > 1).length;
      const loyalBuyers = buyerCounts.filter(count => count >= 5).length;

      const avgOrdersPerBuyer = totalBuyers > 0 ? (orders.length / totalBuyers).toFixed(2) : 0;
      const repeatBuyerRate = totalBuyers > 0 ? ((repeatBuyers / totalBuyers) * 100).toFixed(1) : 0;
      const loyalBuyerRate = totalBuyers > 0 ? ((loyalBuyers / totalBuyers) * 100).toFixed(1) : 0;

      return {
        totalBuyers,
        oneTimeBuyers,
        repeatBuyers,
        loyalBuyers,
        avgOrdersPerBuyer,
        repeatBuyerRate,
        loyalBuyerRate,
        totalOrders: orders.length
      };
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
      // Get all buyers
      const buyersSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('userType', '==', 'buyer')
        )
      );

      // Group by signup month
      const cohorts = {};
      buyersSnapshot.docs.forEach(doc => {
        const buyer = doc.data();
        const signupDate = new Date(buyer.createdAt);
        const cohortKey = `${signupDate.getFullYear()}-${String(signupDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!cohorts[cohortKey]) {
          cohorts[cohortKey] = {
            month: cohortKey,
            signups: 0,
            purchasers: 0,
            avgSpent: 0,
            retention30: 0,
            retention60: 0,
            retention90: 0
          };
        }
        cohorts[cohortKey].signups++;
      });

      // Get orders and calculate repeat purchase rates
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Track purchase behavior per buyer
      const buyerPurchases = {};
      orders.forEach(order => {
        if (!buyerPurchases[order.buyerId]) {
          buyerPurchases[order.buyerId] = {
            purchases: 0,
            lastPurchase: null,
            totalSpent: 0
          };
        }
        buyerPurchases[order.buyerId].purchases++;
        buyerPurchases[order.buyerId].totalSpent += order.totalAmount || 0;
        if (!buyerPurchases[order.buyerId].lastPurchase || order.createdAt > buyerPurchases[order.buyerId].lastPurchase) {
          buyerPurchases[order.buyerId].lastPurchase = order.createdAt;
        }
      });

      // Match buyers to cohorts and calculate retention
      buyersSnapshot.docs.forEach(doc => {
        const buyer = doc.data();
        const signupDate = new Date(buyer.createdAt);
        const cohortKey = `${signupDate.getFullYear()}-${String(signupDate.getMonth() + 1).padStart(2, '0')}`;
        
        const purchases = buyerPurchases[doc.id];
        if (purchases && purchases.purchases > 0) {
          cohorts[cohortKey].purchasers++;
          cohorts[cohortKey].avgSpent += purchases.totalSpent;

          // Calculate retention
          const daysSinceSignup = Math.floor((Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceSignup >= 30 && purchases.lastPurchase) {
            const lastPurchaseDate = new Date(purchases.lastPurchase);
            if (lastPurchaseDate > new Date(signupDate.getTime() + 30 * 24 * 60 * 60 * 1000)) {
              cohorts[cohortKey].retention30++;
            }
          }
          if (daysSinceSignup >= 60 && purchases.lastPurchase) {
            const lastPurchaseDate = new Date(purchases.lastPurchase);
            if (lastPurchaseDate > new Date(signupDate.getTime() + 60 * 24 * 60 * 60 * 1000)) {
              cohorts[cohortKey].retention60++;
            }
          }
          if (daysSinceSignup >= 90 && purchases.lastPurchase) {
            const lastPurchaseDate = new Date(purchases.lastPurchase);
            if (lastPurchaseDate > new Date(signupDate.getTime() + 90 * 24 * 60 * 60 * 1000)) {
              cohorts[cohortKey].retention90++;
            }
          }
        }
      });

      // Calculate percentages and averages
      return Object.values(cohorts)
        .map(cohort => ({
          ...cohort,
          conversionRate: cohort.signups > 0 ? ((cohort.purchasers / cohort.signups) * 100).toFixed(1) : 0,
          avgSpent: cohort.purchasers > 0 ? Math.round(cohort.avgSpent / cohort.purchasers) : 0,
          retention30: cohort.purchasers > 0 ? ((cohort.retention30 / cohort.purchasers) * 100).toFixed(1) : 0,
          retention60: cohort.purchasers > 0 ? ((cohort.retention60 / cohort.purchasers) * 100).toFixed(1) : 0,
          retention90: cohort.purchasers > 0 ? ((cohort.retention90 / cohort.purchasers) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => new Date(b.month) - new Date(a.month));
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
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get completed orders
      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', thirtyDaysAgo)
        )
      );

      const completedOrders = ordersSnapshot.docs.map(doc => doc.data());
      const totalOrders = completedOrders.length;
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      // Get abandoned carts
      const cartsSnapshot = await getDocs(
        query(
          collection(db, 'carts'),
          where('status', '==', 'abandoned'),
          where('updatedAt', '>=', thirtyDaysAgo)
        )
      );

      const abandonedCarts = cartsSnapshot.docs.map(doc => doc.data());
      const abandonedCount = abandonedCarts.length;
      const abandonedValue = abandonedCarts.reduce((sum, cart) => sum + (cart.totalValue || 0), 0);

      // Potential recovery
      const potentialRecoveryValue = abandonedValue;
      const potentialRecoveryOrders = abandonedCount;

      return {
        totalOrders,
        totalRevenue,
        abandonedCount,
        abandonedValue,
        abandonmentRate: totalOrders > 0 ? ((abandonedCount / (totalOrders + abandonedCount)) * 100).toFixed(1) : 0,
        potentialRecoveryValue,
        potentialRecoveryOrders,
        avgCartValue: abandonedCount > 0 ? Math.round(abandonedValue / abandonedCount) : 0
      };
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
      // Get all buyers and their orders
      const buyersSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('userType', '==', 'buyer')
        )
      );

      const buyerIds = new Set();
      const buyers = [];

      buyersSnapshot.docs.forEach(doc => {
        buyers.push({ id: doc.id, ...doc.data() });
        buyerIds.add(doc.id);
      });

      // Get all orders for these buyers
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const buyerOrders = {};

      ordersSnapshot.docs.forEach(doc => {
        const order = doc.data();
        if (buyerIds.has(order.buyerId)) {
          if (!buyerOrders[order.buyerId]) {
            buyerOrders[order.buyerId] = [];
          }
          buyerOrders[order.buyerId].push(order);
        }
      });

      // Calculate CLV for each buyer
      const clvData = buyers.map(buyer => {
        const orders = buyerOrders[buyer.id] || [];
        const totalSpending = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const orderCount = orders.length;
        const accountAgeMonths = Math.floor((Date.now() - new Date(buyer.createdAt)) / (1000 * 60 * 60 * 24 * 30));
        const monthlyValue = accountAgeMonths > 0 ? totalSpending / accountAgeMonths : 0;
        const estimatedYearlyValue = monthlyValue * 12;

        return {
          buyerId: buyer.id,
          totalSpending,
          orderCount,
          accountAgeMonths,
          monthlyValue: Math.round(monthlyValue),
          estimatedYearlyValue: Math.round(estimatedYearlyValue),
          segment: this.getCustomerSegment(estimatedYearlyValue, orderCount)
        };
      });

      // Segment analysis
      const segments = {
        vip: clvData.filter(c => c.segment === 'VIP'),
        high: clvData.filter(c => c.segment === 'High Value'),
        medium: clvData.filter(c => c.segment === 'Medium Value'),
        low: clvData.filter(c => c.segment === 'Low Value')
      };

      return {
        segments,
        summary: {
          vipCount: segments.vip.length,
          highCount: segments.high.length,
          mediumCount: segments.medium.length,
          lowCount: segments.low.length,
          totalCLV: clvData.reduce((sum, c) => sum + c.totalSpending, 0),
          avgCLV: clvData.length > 0 ? Math.round(clvData.reduce((sum, c) => sum + c.totalSpending, 0) / clvData.length) : 0
        }
      };
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
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Get all buyers
      const buyersSnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('userType', '==', 'buyer')
        )
      );

      const buyers = buyersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get orders for retention analysis
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Group orders by buyer
      const buyerOrders = {};
      orders.forEach(order => {
        if (!buyerOrders[order.buyerId]) {
          buyerOrders[order.buyerId] = [];
        }
        buyerOrders[order.buyerId].push(order);
      });

      // Calculate retention metrics
      let returning30 = 0;
      let returning60 = 0;
      let returning90 = 0;
      let churnedBuyers = 0;

      buyers.forEach(buyer => {
        const lastLogin = buyer.lastLoginDate ? new Date(buyer.lastLoginDate) : null;
        
        if (lastLogin && lastLogin > thirtyDaysAgo) {
          returning30++;
        } else if (lastLogin && lastLogin < thirtyDaysAgo) {
          churnedBuyers++;
        }

        if (lastLogin && lastLogin > sixtyDaysAgo) {
          returning60++;
        }

        if (lastLogin && lastLogin > ninetyDaysAgo) {
          returning90++;
        }
      });

      const totalBuyers = buyers.length;

      return {
        totalBuyers,
        returning30,
        returning60,
        returning90,
        churnedBuyers,
        retention30: totalBuyers > 0 ? ((returning30 / totalBuyers) * 100).toFixed(1) : 0,
        retention60: totalBuyers > 0 ? ((returning60 / totalBuyers) * 100).toFixed(1) : 0,
        retention90: totalBuyers > 0 ? ((returning90 / totalBuyers) * 100).toFixed(1) : 0,
        churnRate: totalBuyers > 0 ? ((churnedBuyers / totalBuyers) * 100).toFixed(1) : 0
      };
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
      const buyerDoc = await getDoc(doc(db, 'users', buyerId));
      if (!buyerDoc.exists()) return null;

      const buyer = buyerDoc.data();

      // Get buyer's orders
      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('buyerId', '==', buyerId)
        )
      );

      const orders = ordersSnapshot.docs.map(doc => doc.data());
      const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      return {
        id: buyerId,
        name: buyer.displayName || buyer.email,
        email: buyer.email,
        phone: buyer.phone,
        joinDate: buyer.createdAt,
        accountAge: this.getDaysInRange(buyer.createdAt),
        totalOrders: orders.length,
        totalSpent,
        avgOrderValue: orders.length > 0 ? Math.round(totalSpent / orders.length) : 0,
        lastOrderDate: orders.length > 0 ? orders.sort((a, b) => b.createdAt - a.createdAt)[0].createdAt : null,
        lastLoginDate: buyer.lastLoginDate,
        loyaltyTier: this.getLoyaltyTier(orders.length, totalSpent),
        addresses: buyer.addresses || [],
        reviewCount: buyer.reviewCount || 0,
        avgRating: buyer.avgRating || 0
      };
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
