import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const AdvancedAnalytics = ({ userType = 'buyer' }) => {
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('overview');

  useEffect(() => {
    if (currentUser) {
      fetchAnalytics();
    }
  }, [currentUser, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await firebaseService.analytics.getUserAnalytics(currentUser.uid, timeRange);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const timeRanges = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  const metrics = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'revenue', label: 'Revenue', icon: '💰' },
    { id: 'products', label: 'Products', icon: '🛍️' },
    { id: 'customers', label: 'Customers', icon: '👥' }
  ];

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{analytics?.orders?.total || 0}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">📦</span>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-sm text-green-600">+12%</span>
          <span className="text-sm text-gray-500 ml-1">vs last period</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">₦{analytics?.revenue?.total?.toLocaleString() || 0}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">💰</span>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-sm text-green-600">+8%</span>
          <span className="text-sm text-gray-500 ml-1">vs last period</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Active Products</p>
            <p className="text-2xl font-bold text-gray-900">{analytics?.products?.active || 0}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🛍️</span>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-sm text-green-600">+5%</span>
          <span className="text-sm text-gray-500 ml-1">vs last period</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Customer Satisfaction</p>
            <p className="text-2xl font-bold text-gray-900">{analytics?.satisfaction?.average || 0}%</p>
          </div>
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">⭐</span>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-sm text-green-600">+3%</span>
          <span className="text-sm text-gray-500 ml-1">vs last period</span>
        </div>
      </div>
    </div>
  );

  const renderOrdersAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Order Status Distribution</h3>
        <div className="space-y-3">
          {analytics?.orders?.byStatus?.map((status, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  status.status === 'completed' ? 'bg-green-500' :
                  status.status === 'pending' ? 'bg-yellow-500' :
                  status.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
                }`}></div>
                <span className="text-sm font-medium capitalize">{status.status}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{status.count}</span>
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      status.status === 'completed' ? 'bg-green-500' :
                      status.status === 'pending' ? 'bg-yellow-500' :
                      status.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${(status.count / analytics.orders.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Order Trends</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">Chart visualization would go here</p>
        </div>
      </div>
    </div>
  );

  const renderRevenueAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h4>
          <p className="text-2xl font-bold text-gray-900">₦{analytics?.revenue?.total?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Average Order Value</h4>
          <p className="text-2xl font-bold text-gray-900">₦{analytics?.revenue?.averageOrderValue?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Growth Rate</h4>
          <p className="text-2xl font-bold text-green-600">+{analytics?.revenue?.growthRate || 0}%</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Revenue Trends</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">Revenue chart visualization would go here</p>
        </div>
      </div>
    </div>
  );

  const renderProductsAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Top Performing Products</h3>
        <div className="space-y-3">
          {analytics?.products?.topPerforming?.map((product, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-sm">📦</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">{product.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{product.sales}</p>
                <p className="text-sm text-gray-600">sales</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCustomersAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Total Customers</h4>
          <p className="text-2xl font-bold text-gray-900">{analytics?.customers?.total || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600 mb-2">New Customers</h4>
          <p className="text-2xl font-bold text-gray-900">{analytics?.customers?.new || 0}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Customer Satisfaction</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">5 Stars</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <span className="text-sm text-gray-600">85%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">4 Stars</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '12%' }}></div>
              </div>
              <span className="text-sm text-gray-600">12%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">3 Stars</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '3%' }}></div>
              </div>
              <span className="text-sm text-gray-600">3%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Insights and performance metrics</p>
        </div>
        
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="flex space-x-1 mb-6 overflow-x-auto">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            onClick={() => setSelectedMetric(metric.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedMetric === metric.id
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{metric.icon}</span>
            <span className="text-sm font-medium">{metric.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {selectedMetric === 'overview' && renderOverview()}
      {selectedMetric === 'orders' && renderOrdersAnalytics()}
      {selectedMetric === 'revenue' && renderRevenueAnalytics()}
      {selectedMetric === 'products' && renderProductsAnalytics()}
      {selectedMetric === 'customers' && renderCustomersAnalytics()}
    </div>
  );
};

export default AdvancedAnalytics;
