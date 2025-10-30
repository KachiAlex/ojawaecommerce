import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import emailService from '../services/emailService';

const VendorAnalyticsDashboard = () => {
  const { currentUser, userProfile } = useAuth();
  const [analytics, setAnalytics] = useState({
    overview: {},
    products: [],
    orders: [],
    visitors: [],
    revenue: {}
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const dateRanges = {
    '7d': { days: 7, label: 'Last 7 days' },
    '30d': { days: 30, label: 'Last 30 days' },
    '90d': { days: 90, label: 'Last 90 days' },
    '1y': { days: 365, label: 'Last year' }
  };

  useEffect(() => {
    loadAnalytics();
  }, [currentUser, dateRange]);

  const loadAnalytics = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const days = dateRanges[dateRange].days;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Load all analytics data in parallel
      const [
        products,
        orders,
        visitors,
        revenue
      ] = await Promise.all([
        loadProductAnalytics(startDate),
        loadOrderAnalytics(startDate),
        loadVisitorAnalytics(startDate),
        loadRevenueAnalytics(startDate)
      ]);

      setAnalytics({
        overview: calculateOverviewMetrics(products, orders, visitors, revenue),
        products,
        orders,
        visitors,
        revenue
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductAnalytics = async (startDate) => {
    try {
      const products = await firebaseService.products.getByVendor(currentUser.uid);
      return products.map(product => ({
        ...product,
        views: product.views || 0,
        orders: product.orders || 0,
        revenue: product.revenue || 0,
        conversionRate: product.views > 0 ? ((product.orders || 0) / product.views * 100) : 0
      }));
    } catch (error) {
      console.error('Error loading product analytics:', error);
      return [];
    }
  };

  const loadOrderAnalytics = async (startDate) => {
    try {
      const orders = await firebaseService.orders.getByVendor(currentUser.uid);
      return orders.filter(order => {
        const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt);
      return orderDate >= startDate;
    });
    } catch (error) {
      console.error('Error loading order analytics:', error);
      return [];
    }
  };

  const loadVisitorAnalytics = async (startDate) => {
    try {
      // This would typically come from analytics service
      // For now, we'll simulate visitor data
      return generateMockVisitorData(startDate);
    } catch (error) {
      console.error('Error loading visitor analytics:', error);
      return [];
    }
  };

  const loadRevenueAnalytics = async (startDate) => {
    try {
      const orders = await firebaseService.orders.getByVendor(currentUser.uid);
      const completedOrders = orders.filter(order => 
        order.status === 'completed' || order.status === 'delivered'
      );

      const totalRevenue = completedOrders.reduce((sum, order) => 
        sum + (order.totalAmount || 0), 0
      );

      const dailyRevenue = generateDailyRevenueData(completedOrders, startDate);

      return {
        total: totalRevenue,
        daily: dailyRevenue,
        orders: completedOrders.length
      };
    } catch (error) {
      console.error('Error loading revenue analytics:', error);
      return { total: 0, daily: [], orders: 0 };
    }
  };

  const calculateOverviewMetrics = (products, orders, visitors, revenue) => {
    const totalViews = products.reduce((sum, product) => sum + (product.views || 0), 0);
    const totalOrders = orders.length;
    const totalRevenue = revenue.total;
    const conversionRate = totalViews > 0 ? (totalOrders / totalViews * 100) : 0;
    const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

    return {
      totalProducts: products.length,
      totalViews,
      totalOrders,
      totalRevenue,
      conversionRate,
      averageOrderValue,
      uniqueVisitors: visitors.length
    };
  };

  const generateMockVisitorData = (startDate) => {
    const visitors = [];
    const days = Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      visitors.push({
        date: date.toISOString().split('T')[0],
        visitors: Math.floor(Math.random() * 50) + 10,
        pageViews: Math.floor(Math.random() * 100) + 20,
        bounceRate: Math.random() * 0.5 + 0.2
      });
    }
    
    return visitors;
  };

  const generateDailyRevenueData = (orders, startDate) => {
    const dailyRevenue = {};
    const days = Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24));
    
    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dailyRevenue[date.toISOString().split('T')[0]] = 0;
    }
    
    // Add revenue from orders
    orders.forEach(order => {
      const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt);
      const dateKey = orderDate.toISOString().split('T')[0];
      if (dailyRevenue.hasOwnProperty(dateKey)) {
        dailyRevenue[dateKey] += order.totalAmount || 0;
      }
    });
    
    return Object.entries(dailyRevenue).map(([date, amount]) => ({
      date,
      amount
    }));
  };

  const topProducts = useMemo(() => {
    return analytics.products
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);
  }, [analytics.products]);

  const recentOrders = useMemo(() => {
    return analytics.orders
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [analytics.orders]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-NG').format(num);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Track your store performance and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(dateRanges).map(([key, range]) => (
              <option key={key} value={key}>{range.label}</option>
            ))}
          </select>
            <button
            onClick={() => emailService.sendAnalyticsReport(
              currentUser.email,
              userProfile?.businessName || 'Vendor',
              {
                period: dateRanges[dateRange].label,
                metrics: analytics.overview,
                insights: generateInsights(analytics.overview)
              }
            )}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📧 Email Report
            </button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.overview.totalViews)}</p>
          </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.overview.totalOrders)}</p>
          </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.conversionRate.toFixed(1)}%</p>
          </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.overview.totalRevenue)}</p>
          </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-64 flex items-end space-x-2">
            {analytics.revenue.daily.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="bg-blue-500 rounded-t"
                  style={{
                    height: `${Math.max((day.amount / Math.max(...analytics.revenue.daily.map(d => d.amount))) * 200, 4)}px`,
                    width: '100%'
                  }}
                ></div>
                <span className="text-xs text-gray-500 mt-2">
                  {new Date(day.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                </span>
            </div>
            ))}
            </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
            <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{formatNumber(product.views)} views</p>
                  </div>
                  </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{product.orders || 0} orders</p>
                  <p className="text-xs text-gray-500">{product.conversionRate.toFixed(1)}% conversion</p>
                  </div>
                </div>
              ))}
            </div>
            </div>
        </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.id.slice(-8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.buyerName || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(order.totalAmount || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.createdAt?.toDate?.()?.toLocaleDateString('en-NG') || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper function to generate insights
const generateInsights = (metrics) => {
  const insights = [];
  
  if (metrics.conversionRate > 5) {
    insights.push('Great conversion rate! Your products are resonating well with customers.');
  } else if (metrics.conversionRate < 2) {
    insights.push('Consider optimizing your product descriptions and images to improve conversion.');
  }
  
  if (metrics.averageOrderValue > 10000) {
    insights.push('High average order value indicates strong customer engagement.');
  }
  
  if (metrics.totalViews > 1000) {
    insights.push('Excellent product visibility! Keep up the great work.');
  }
  
  return insights;
};

export default VendorAnalyticsDashboard;