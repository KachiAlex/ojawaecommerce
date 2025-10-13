import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const VendorAnalyticsDashboard = ({ vendorId, orders = [], products = [] }) => {
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, 1y
  const [analytics, setAnalytics] = useState({
    revenue: { total: 0, trend: 0, chart: [] },
    orders: { total: 0, completed: 0, pending: 0, cancelled: 0 },
    products: { total: 0, outOfStock: 0, lowStock: 0 },
    topProducts: [],
    revenueByCategory: {},
    ordersByStatus: {},
    dailyRevenue: []
  });

  useEffect(() => {
    if (orders.length > 0 || products.length > 0) {
      calculateAnalytics();
    }
  }, [orders, products, timeRange]);

  const calculateAnalytics = () => {
    const now = new Date();
    const timeRangeMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };
    const rangeMs = timeRangeMs[timeRange];
    const startDate = new Date(now - rangeMs);

    // Filter orders within the selected time range
    const filteredOrders = orders.filter(order => {
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      return orderDate >= startDate;
    });

    // Calculate revenue metrics
    const totalRevenue = filteredOrders
      .filter(o => o.status === 'completed' || o.status === 'delivered' || o.status === 'confirmed')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Calculate revenue trend (comparing to previous period)
    const midDate = new Date(now - rangeMs / 2);
    const recentRevenue = filteredOrders
      .filter(o => {
        const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        return orderDate >= midDate && (o.status === 'completed' || o.status === 'delivered' || o.status === 'confirmed');
      })
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const olderRevenue = filteredOrders
      .filter(o => {
        const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        return orderDate < midDate && (o.status === 'completed' || o.status === 'delivered' || o.status === 'confirmed');
      })
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const revenueTrend = olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue * 100) : 0;

    // Calculate orders by status
    const ordersByStatus = {
      pending: filteredOrders.filter(o => o.status === 'pending').length,
      processing: filteredOrders.filter(o => o.status === 'processing' || o.status === 'escrow_funded').length,
      shipped: filteredOrders.filter(o => o.status === 'shipped' || o.status === 'ready_for_shipment').length,
      completed: filteredOrders.filter(o => o.status === 'completed' || o.status === 'delivered' || o.status === 'confirmed').length,
      cancelled: filteredOrders.filter(o => o.status === 'cancelled').length
    };

    // Calculate daily revenue
    const dailyRevenueMap = {};
    filteredOrders.forEach(order => {
      if (order.status === 'completed' || order.status === 'delivered' || order.status === 'confirmed') {
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        const dateKey = orderDate.toISOString().split('T')[0];
        dailyRevenueMap[dateKey] = (dailyRevenueMap[dateKey] || 0) + (order.totalAmount || 0);
      }
    });

    const dailyRevenue = Object.entries(dailyRevenueMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    // Calculate top products by revenue
    const productRevenueMap = {};
    filteredOrders.forEach(order => {
      if (order.status === 'completed' || order.status === 'delivered' || order.status === 'confirmed') {
        (order.items || []).forEach(item => {
          const key = item.productId || item.name;
          if (!productRevenueMap[key]) {
            productRevenueMap[key] = { name: item.name, revenue: 0, quantity: 0 };
          }
          productRevenueMap[key].revenue += (item.price || 0) * (item.quantity || 0);
          productRevenueMap[key].quantity += item.quantity || 0;
        });
      }
    });

    const topProducts = Object.values(productRevenueMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate revenue by category
    const revenueByCategory = {};
    filteredOrders.forEach(order => {
      if (order.status === 'completed' || order.status === 'delivered' || order.status === 'confirmed') {
        (order.items || []).forEach(item => {
          const category = item.category || 'Uncategorized';
          revenueByCategory[category] = (revenueByCategory[category] || 0) + (item.price || 0) * (item.quantity || 0);
        });
      }
    });

    // Calculate product stock status
    const totalProducts = products.length;
    const outOfStock = products.filter(p => (p.stock || p.stockQuantity || 0) === 0).length;
    const lowStock = products.filter(p => {
      const stock = p.stock || p.stockQuantity || 0;
      return stock > 0 && stock <= 5;
    }).length;

    setAnalytics({
      revenue: { 
        total: totalRevenue, 
        trend: revenueTrend,
        chart: dailyRevenue
      },
      orders: {
        total: filteredOrders.length,
        completed: ordersByStatus.completed,
        pending: ordersByStatus.pending + ordersByStatus.processing,
        cancelled: ordersByStatus.cancelled
      },
      products: {
        total: totalProducts,
        outOfStock,
        lowStock
      },
      topProducts,
      revenueByCategory,
      ordersByStatus,
      dailyRevenue
    });
  };

  const formatCurrency = (amount) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Chart data
  const revenueChartData = {
    labels: analytics.dailyRevenue.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Revenue',
        data: analytics.dailyRevenue.map(d => d.amount),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const orderStatusChartData = {
    labels: ['Completed', 'Pending/Processing', 'Cancelled'],
    datasets: [
      {
        data: [
          analytics.orders.completed,
          analytics.orders.pending,
          analytics.orders.cancelled
        ],
        backgroundColor: [
          'rgb(16, 185, 129)',
          'rgb(59, 130, 246)',
          'rgb(239, 68, 68)'
        ]
      }
    ]
  };

  const categoryRevenueChartData = {
    labels: Object.keys(analytics.revenueByCategory),
    datasets: [
      {
        label: 'Revenue by Category',
        data: Object.values(analytics.revenueByCategory),
        backgroundColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(249, 115, 22)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)'
        ]
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {['7d', '30d', '90d', '1y'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '1y' ? '1 Year' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(analytics.revenue.total)}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className={`flex items-center mt-2 text-sm ${analytics.revenue.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <svg className={`w-4 h-4 mr-1 ${analytics.revenue.trend < 0 ? 'transform rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {Math.abs(analytics.revenue.trend).toFixed(1)}% from previous period
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.orders.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {analytics.orders.completed} completed • {analytics.orders.pending} pending
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.products.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm">
            <span className="text-red-600">{analytics.products.outOfStock} out of stock</span>
            {analytics.products.lowStock > 0 && (
              <span className="text-yellow-600 ml-2">• {analytics.products.lowStock} low stock</span>
            )}
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analytics.orders.total > 0 
                  ? `${((analytics.orders.completed / analytics.orders.total) * 100).toFixed(1)}%`
                  : '0%'
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {analytics.orders.completed} of {analytics.orders.total} orders
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          {analytics.dailyRevenue.length > 0 ? (
            <Line 
              data={revenueChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => formatCurrency(context.parsed.y)
                    }
                  }
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (value) => formatCurrency(value)
                    }
                  }
                }
              }} 
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No revenue data for this period
            </div>
          )}
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
          {analytics.orders.total > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <Doughnut 
                data={orderStatusChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          const percentage = ((value / analytics.orders.total) * 100).toFixed(1);
                          return `${label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No orders for this period
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Revenue</h3>
          {analytics.topProducts.length > 0 ? (
            <div className="space-y-3">
              {analytics.topProducts.slice(0, 5).map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.quantity} sold
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-500">
              No product sales data
            </div>
          )}
        </div>

        {/* Revenue by Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
          {Object.keys(analytics.revenueByCategory).length > 0 ? (
            <Bar 
              data={categoryRevenueChartData}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => formatCurrency(context.parsed.y)
                    }
                  }
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (value) => formatCurrency(value)
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No category data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsDashboard;

