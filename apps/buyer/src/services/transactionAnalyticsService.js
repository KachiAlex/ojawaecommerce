import { collection, query, where, orderBy, limit, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Transaction Analytics Service
 * Provides comprehensive order and transaction metrics
 */

const transactionAnalyticsService = {
  /**
   * Get transaction overview metrics
   * @param {Object} filters - Filter options (timeRange, status, etc.)
   * @returns {Object} Overview metrics
   */
  async getTransactionOverviewMetrics(filters = {}) {
    try {
      const { timeRange = 'month' } = filters;
      const startDate = this.getStartDate(timeRange);
      const endDate = new Date();

      // Get all orders in time range
      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate)
        )
      );

      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate metrics
      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const shippedOrders = orders.filter(o => o.status === 'shipped').length;
      const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
      const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
      const failedOrders = orders.filter(o => o.status === 'failed').length;

      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get refunds
      const refundsSnapshot = await getDocs(
        query(
          collection(db, 'refunds'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          where('status', '==', 'completed')
        )
      );
      const refunds = refundsSnapshot.docs.map(doc => doc.data());
      const totalRefunded = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
      const refundCount = refunds.length;
      const netRevenue = totalRevenue - totalRefunded;

      return {
        totalOrders,
        completedOrders,
        pendingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        failedOrders,
        totalRevenue,
        netRevenue,
        totalRefunded,
        avgOrderValue: Math.round(avgOrderValue),
        refundCount,
        refundRate: totalOrders > 0 ? ((refundCount / totalOrders) * 100).toFixed(1) : 0,
        conversionRate: totalOrders > 0 ? ((completedOrders + deliveredOrders) / totalOrders * 100).toFixed(1) : 0,
        successRate: totalOrders > 0 ? (((totalOrders - failedOrders) / totalOrders) * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('Error getting transaction overview metrics:', error);
      return null;
    }
  },

  /**
   * Get revenue trend over time
   * @param {String} timeRange - day, week, month
   * @returns {Array} Daily revenue data
   */
  async getRevenueTrend(timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);
      const daysCount = this.getDaysInRange(startDate);

      // Get all completed orders in range
      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('status', 'in', ['completed', 'delivered', 'shipped'])
        )
      );

      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Group by date
      const dailyData = {};
      for (let i = 0; i < daysCount; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyData[dateStr] = {
          date: dateStr,
          revenue: 0,
          orders: 0,
          avgOrder: 0
        };
      }

      orders.forEach(order => {
        const date = new Date(order.createdAt).toISOString().split('T')[0];
        if (dailyData[date]) {
          dailyData[date].revenue += order.totalAmount || 0;
          dailyData[date].orders++;
        }
      });

      // Calculate averages
      return Object.values(dailyData).map(day => ({
        date: day.date,
        revenue: day.revenue,
        orders: day.orders,
        avgOrder: day.orders > 0 ? Math.round(day.revenue / day.orders) : 0
      }));
    } catch (error) {
      console.error('Error getting revenue trend:', error);
      return [];
    }
  },

  /**
   * Get payment method analysis
   * @param {String} timeRange - day, week, month
   * @returns {Array} Payment method breakdown
   */
  async getPaymentMethodAnalysis(timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);

      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('status', 'in', ['completed', 'delivered', 'shipped'])
        )
      );

      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Group by payment method
      const paymentMethods = {};
      orders.forEach(order => {
        const method = order.paymentMethod || 'unknown';
        if (!paymentMethods[method]) {
          paymentMethods[method] = {
            method,
            count: 0,
            revenue: 0,
            avgOrder: 0,
            failureRate: 0
          };
        }
        paymentMethods[method].count++;
        paymentMethods[method].revenue += order.totalAmount || 0;
      });

      // Get payment failures
      const failureSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('status', '==', 'failed')
        )
      );

      const failures = failureSnapshot.docs.map(doc => doc.data());
      const failedByMethod = {};
      failures.forEach(order => {
        const method = order.paymentMethod || 'unknown';
        failedByMethod[method] = (failedByMethod[method] || 0) + 1;
      });

      // Calculate final metrics
      return Object.values(paymentMethods)
        .map(pm => {
          const failed = failedByMethod[pm.method] || 0;
          const total = pm.count + failed;
          return {
            method: this.formatPaymentMethod(pm.method),
            count: pm.count,
            revenue: pm.revenue,
            avgOrder: pm.count > 0 ? Math.round(pm.revenue / pm.count) : 0,
            failureRate: total > 0 ? ((failed / total) * 100).toFixed(1) : 0,
            successCount: pm.count,
            totalAttempts: total
          };
        })
        .sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('Error getting payment method analysis:', error);
      return [];
    }
  },

  /**
   * Get top performing products
   * @param {Number} limit - Max products to return
   * @param {String} timeRange - day, week, month
   * @returns {Array} Top products by revenue
   */
  async getTopProductsByRevenue(limit = 10, timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);

      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('status', 'in', ['completed', 'delivered'])
        )
      );

      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Aggregate product data
      const productData = {};
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (!productData[item.productId]) {
              productData[item.productId] = {
                productId: item.productId,
                productName: item.productName,
                category: item.category,
                unitsSold: 0,
                revenue: 0,
                returns: 0
              };
            }
            productData[item.productId].unitsSold += item.quantity || 1;
            productData[item.productId].revenue += (item.price * (item.quantity || 1)) || 0;
          });
        }
      });

      // Get return data for these products
      const refundsSnapshot = await getDocs(
        query(
          collection(db, 'refunds'),
          where('createdAt', '>=', startDate),
          where('status', 'in', ['completed', 'processed'])
        )
      );

      refundsSnapshot.docs.forEach(doc => {
        const refund = doc.data();
        if (refund.productId && productData[refund.productId]) {
          productData[refund.productId].returns++;
        }
      });

      // Sort and limit
      return Object.values(productData)
        .map((prod, index) => ({
          rank: index + 1,
          ...prod,
          profitMargin: prod.revenue > 0 ? ((prod.revenue * 0.15) / prod.revenue * 100).toFixed(1) : 0, // Estimated 15% margin
          returnRate: prod.unitsSold > 0 ? ((prod.returns / (prod.unitsSold * 0.1)) * 100).toFixed(1) : 0, // Rough estimate
          avgUnitPrice: prod.unitsSold > 0 ? Math.round(prod.revenue / prod.unitsSold) : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top products:', error);
      return [];
    }
  },

  /**
   * Get category performance
   * @param {String} timeRange - day, week, month
   * @returns {Array} Category breakdown
   */
  async getCategoryPerformance(timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);

      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('status', 'in', ['completed', 'delivered'])
        )
      );

      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Aggregate by category
      const categories = {};
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const cat = item.category || 'Uncategorized';
            if (!categories[cat]) {
              categories[cat] = {
                category: cat,
                orders: 0,
                units: 0,
                revenue: 0
              };
            }
            categories[cat].revenue += (item.price * (item.quantity || 1)) || 0;
            categories[cat].units += item.quantity || 1;
          });
        }
      });

      // Count unique orders per category
      const ordersByCategory = {};
      orders.forEach(order => {
        const cats = new Set();
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const cat = item.category || 'Uncategorized';
            cats.add(cat);
          });
        }
        cats.forEach(cat => {
          ordersByCategory[cat] = (ordersByCategory[cat] || 0) + 1;
        });
      });

      return Object.values(categories)
        .map(cat => ({
          ...cat,
          orders: ordersByCategory[cat.category] || 0,
          avgOrderValue: ordersByCategory[cat.category] ? Math.round(cat.revenue / ordersByCategory[cat.category]) : 0,
          avgUnitsPerOrder: ordersByCategory[cat.category] ? (cat.units / ordersByCategory[cat.category]).toFixed(1) : 0
        }))
        .sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('Error getting category performance:', error);
      return [];
    }
  },

  /**
   * Get return and refund metrics
   * @param {String} timeRange - day, week, month
   * @returns {Object} Refund data
   */
  async getReturnRefundMetrics(timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);

      // Get all orders
      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate)
        )
      );
      const totalOrders = ordersSnapshot.size;

      // Get completed orders
      const completedSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('status', 'in', ['completed', 'delivered', 'shipped'])
        )
      );
      const completedRevenue = completedSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);

      // Get refunds
      const refundsSnapshot = await getDocs(
        query(
          collection(db, 'refunds'),
          where('createdAt', '>=', startDate)
        )
      );

      const refunds = refundsSnapshot.docs.map(doc => doc.data());
      const completedRefunds = refunds.filter(r => r.status === 'completed');
      const pendingRefunds = refunds.filter(r => r.status === 'pending');
      const rejectedRefunds = refunds.filter(r => r.status === 'rejected');

      const totalRefunded = completedRefunds.reduce((sum, r) => sum + (r.amount || 0), 0);
      const pendingRefundAmount = pendingRefunds.reduce((sum, r) => sum + (r.amount || 0), 0);

      // Get returns (orders with return status)
      const returnsSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('status', '==', 'returned')
        )
      );
      const returns = returnsSnapshot.docs.map(doc => doc.data());
      const totalReturned = returns.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      return {
        totalOrders,
        refundCount: refunds.length,
        completedRefunds: completedRefunds.length,
        pendingRefunds: pendingRefunds.length,
        rejectedRefunds: rejectedRefunds.length,
        returnCount: returns.length,
        totalRefunded,
        pendingRefundAmount,
        totalReturned,
        completedRevenue,
        netRevenue: completedRevenue - totalRefunded,
        refundRate: totalOrders > 0 ? ((refunds.length / totalOrders) * 100).toFixed(1) : 0,
        returnRate: totalOrders > 0 ? ((returns.length / totalOrders) * 100).toFixed(1) : 0,
        refundPercentageOfRevenue: completedRevenue > 0 ? ((totalRefunded / completedRevenue) * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('Error getting return/refund metrics:', error);
      return null;
    }
  },

  /**
   * Get order status distribution
   * @param {String} timeRange - day, week, month
   * @returns {Array} Status breakdown
   */
  async getOrderStatusDistribution(timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);

      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate)
        )
      );

      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Count by status
      const statuses = {};
      orders.forEach(order => {
        const status = order.status || 'unknown';
        statuses[status] = (statuses[status] || 0) + 1;
      });

      const total = orders.length;

      return Object.entries(statuses)
        .map(([status, count]) => ({
          status: this.formatOrderStatus(status),
          count,
          percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0,
          value: status // Raw value for data
        }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error getting order status distribution:', error);
      return [];
    }
  },

  /**
   * Get vendor performance by orders
   * @param {Number} limit - Max vendors to return
   * @param {String} timeRange - day, week, month
   * @returns {Array} Vendor performance
   */
  async getVendorOrderPerformance(limit = 10, timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);

      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate)
        )
      );

      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Group by vendor
      const vendorData = {};
      orders.forEach(order => {
        if (order.vendorId) {
          if (!vendorData[order.vendorId]) {
            vendorData[order.vendorId] = {
              vendorId: order.vendorId,
              orders: 0,
              revenue: 0,
              completed: 0,
              cancelled: 0,
              avgRating: 0
            };
          }
          vendorData[order.vendorId].orders++;
          vendorData[order.vendorId].revenue += order.totalAmount || 0;
          
          if (order.status === 'completed' || order.status === 'delivered') {
            vendorData[order.vendorId].completed++;
          }
          if (order.status === 'cancelled') {
            vendorData[order.vendorId].cancelled++;
          }
        }
      });

      // Fetch vendor details
      const vendorsWithDetails = await Promise.all(
        Object.values(vendorData).map(async (vendor, index) => {
          const vendorDoc = await getDoc(doc(db, 'users', vendor.vendorId));
          const vendorInfo = vendorDoc.data() || {};
          return {
            rank: index + 1,
            vendorId: vendor.vendorId,
            vendorName: vendorInfo.businessName || vendorInfo.displayName || 'Unknown',
            orders: vendor.orders,
            revenue: vendor.revenue,
            completionRate: vendor.orders > 0 ? ((vendor.completed / vendor.orders) * 100).toFixed(1) : 0,
            cancellationRate: vendor.orders > 0 ? ((vendor.cancelled / vendor.orders) * 100).toFixed(1) : 0,
            avgOrderValue: vendor.orders > 0 ? Math.round(vendor.revenue / vendor.orders) : 0,
            rating: vendorInfo.avgRating || 0
          };
        })
      );

      return vendorsWithDetails
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting vendor order performance:', error);
      return [];
    }
  },

  /**
   * Get payment failure analysis
   * @param {String} timeRange - day, week, month
   * @returns {Object} Failure data
   */
  async getPaymentFailureAnalysis(timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);

      // Get failed orders
      const failedSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('status', '==', 'failed')
        )
      );

      const failedOrders = failedSnapshot.docs.map(doc => doc.data());

      // Group by failure reason
      const failureReasons = {};
      failedOrders.forEach(order => {
        const reason = order.failureReason || 'unknown';
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      });

      const totalFailedAmount = failedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalAttempts = failedOrders.length;

      // Get total attempts (failed + successful)
      const allSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate)
        )
      );
      const totalAllAttempts = allSnapshot.size;

      return {
        totalFailedOrders: totalAttempts,
        totalFailedAmount,
        failureRate: totalAllAttempts > 0 ? ((totalAttempts / totalAllAttempts) * 100).toFixed(2) : 0,
        failureReasons: Object.entries(failureReasons)
          .map(([reason, count]) => ({
            reason,
            count,
            percentage: totalAttempts > 0 ? ((count / totalAttempts) * 100).toFixed(1) : 0
          }))
          .sort((a, b) => b.count - a.count),
        topFailureReason: Object.entries(failureReasons).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'
      };
    } catch (error) {
      console.error('Error getting payment failure analysis:', error);
      return null;
    }
  },

  /**
   * Get average order metrics by day of week
   * @param {String} timeRange - day, week, month
   * @returns {Array} Day-wise metrics
   */
  async getOrdersByDayOfWeek(timeRange = 'month') {
    try {
      const startDate = this.getStartDate(timeRange);

      const ordersSnapshot = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', startDate),
          where('status', 'in', ['completed', 'delivered'])
        )
      );

      const orders = ordersSnapshot.docs.map(doc => doc.data());

      // Group by day of week
      const dayData = {
        'Monday': { revenue: 0, orders: 0 },
        'Tuesday': { revenue: 0, orders: 0 },
        'Wednesday': { revenue: 0, orders: 0 },
        'Thursday': { revenue: 0, orders: 0 },
        'Friday': { revenue: 0, orders: 0 },
        'Saturday': { revenue: 0, orders: 0 },
        'Sunday': { revenue: 0, orders: 0 }
      };

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      orders.forEach(order => {
        const date = new Date(order.createdAt);
        const dayName = dayNames[date.getDay()];
        dayData[dayName].revenue += order.totalAmount || 0;
        dayData[dayName].orders++;
      });

      return Object.entries(dayData)
        .map(([day, data]) => ({
          day,
          orders: data.orders,
          revenue: data.revenue,
          avgOrder: data.orders > 0 ? Math.round(data.revenue / data.orders) : 0
        }))
        .sort((a, b) => {
          const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        });
    } catch (error) {
      console.error('Error getting orders by day of week:', error);
      return [];
    }
  },

  /**
   * Get transaction detail by order ID
   * @param {String} orderId - Order ID
   * @returns {Object} Order detail
   */
  async getTransactionDetail(orderId) {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) return null;

      const order = orderDoc.data();

      // Get buyer info
      const buyerDoc = await getDoc(doc(db, 'users', order.buyerId));
      const buyer = buyerDoc.data() || {};

      // Get vendor info
      const vendorDoc = await getDoc(doc(db, 'users', order.vendorId));
      const vendor = vendorDoc.data() || {};

      // Get refund if exists
      const refundsSnapshot = await getDocs(
        query(collection(db, 'refunds'), where('orderId', '==', orderId))
      );
      const refund = refundsSnapshot.docs[0]?.data() || null;

      return {
        orderId,
        buyerName: buyer.displayName || buyer.email,
        buyerEmail: buyer.email,
        vendorName: vendor.businessName || vendor.displayName,
        vendorEmail: vendor.email,
        orderDate: order.createdAt,
        status: order.status,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        itemCount: order.items?.length || 0,
        shippingAddress: order.shippingAddress,
        items: order.items || [],
        refund: refund ? {
          amount: refund.amount,
          status: refund.status,
          reason: refund.reason
        } : null
      };
    } catch (error) {
      console.error('Error getting transaction detail:', error);
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

  formatPaymentMethod(method) {
    const methods = {
      'card': 'Credit/Debit Card',
      'bank_transfer': 'Bank Transfer',
      'mobile_money': 'Mobile Money',
      'wallet': 'Digital Wallet',
      'crypto': 'Cryptocurrency',
      'paypal': 'PayPal'
    };
    return methods[method] || method;
  },

  formatOrderStatus(status) {
    const statuses = {
      'pending': 'Pending',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'failed': 'Failed',
      'returned': 'Returned',
      'refunded': 'Refunded'
    };
    return statuses[status] || status;
  }
};

export default transactionAnalyticsService;
