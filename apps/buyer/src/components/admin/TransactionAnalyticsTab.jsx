import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Package, RotateCcw } from 'lucide-react';
import transactionAnalyticsService from '../../services/transactionAnalyticsService';

/**
 * Transaction Analytics Tab for Admin Dashboard
 * Displays comprehensive transaction and order metrics
 */
const TransactionAnalyticsTab = ({ timeRange = 'month' }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransactionMetrics();
  }, [timeRange]);

  const fetchTransactionMetrics = async () => {
    try {
      setLoading(true);
      setError('');

      const [overview, revenue, payment, products, categories, returns, status, vendors, dayOfWeek, failures] = await Promise.all([
        transactionAnalyticsService.getTransactionOverviewMetrics({ timeRange }),
        transactionAnalyticsService.getRevenueTrend(timeRange),
        transactionAnalyticsService.getPaymentMethodAnalysis(timeRange),
        transactionAnalyticsService.getTopProductsByRevenue(10, timeRange),
        transactionAnalyticsService.getCategoryPerformance(timeRange),
        transactionAnalyticsService.getReturnRefundMetrics(timeRange),
        transactionAnalyticsService.getOrderStatusDistribution(timeRange),
        transactionAnalyticsService.getVendorOrderPerformance(10, timeRange),
        transactionAnalyticsService.getOrdersByDayOfWeek(timeRange),
        transactionAnalyticsService.getPaymentFailureAnalysis(timeRange)
      ]);

      setData({
        overview,
        revenue,
        payment,
        products,
        categories,
        returns,
        status,
        vendors,
        dayOfWeek,
        failures
      });
    } catch (err) {
      console.error('Error fetching transaction metrics:', err);
      setError('Failed to load transaction analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Orders"
          value={data.overview?.totalOrders}
          icon={<Package className="h-6 w-6" />}
          color="blue"
        />
        <KPICard
          title="Total Revenue"
          value={`₦${(data.overview?.totalRevenue / 1000000).toFixed(1)}M`}
          icon={<DollarSign className="h-6 w-6" />}
          color="emerald"
        />
        <KPICard
          title="Avg Order Value"
          value={`₦${data.overview?.avgOrderValue?.toLocaleString()}`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="purple"
        />
        <KPICard
          title="Success Rate"
          value={`${data.overview?.successRate}%`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
        <KPICard
          title="Refund Rate"
          value={`${data.overview?.refundRate}%`}
          icon={<RotateCcw className="h-6 w-6" />}
          color="amber"
        />
      </div>

      {/* Metrics Toggle */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {['overview', 'revenue', 'payment', 'products', 'returns', 'performance'].map(metric => (
          <button
            key={metric}
            onClick={() => setSelectedMetric(metric)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              selectedMetric === metric
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {metric.charAt(0).toUpperCase() + metric.slice(1)}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {selectedMetric === 'overview' && <OverviewSection data={data} />}
        {selectedMetric === 'revenue' && <RevenueSection data={data} />}
        {selectedMetric === 'payment' && <PaymentSection data={data} />}
        {selectedMetric === 'products' && <ProductsSection data={data} />}
        {selectedMetric === 'returns' && <ReturnsSection data={data} />}
        {selectedMetric === 'performance' && <PerformanceSection data={data} />}
      </div>
    </div>
  );
};

/**
 * KPI Card Component
 */
const KPICard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600'
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-xs font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

/**
 * Overview Section
 */
const OverviewSection = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Order Status"
          stats={[
            { label: 'Completed', value: data.overview?.completedOrders, color: 'bg-green-500' },
            { label: 'Pending', value: data.overview?.pendingOrders, color: 'bg-amber-500' },
            { label: 'Shipped', value: data.overview?.shippedOrders, color: 'bg-blue-500' },
            { label: 'Delivered', value: data.overview?.deliveredOrders, color: 'bg-emerald-500' }
          ]}
        />
        <StatsCard
          title="Revenue Breakdown"
          stats={[
            { label: 'Gross Revenue', value: `₦${(data.overview?.totalRevenue / 1000000).toFixed(1)}M`, color: 'bg-emerald-500' },
            { label: 'Refunded', value: `₦${(data.overview?.totalRefunded / 1000).toFixed(0)}K`, color: 'bg-red-500' },
            { label: 'Net Revenue', value: `₦${(data.overview?.netRevenue / 1000000).toFixed(1)}M`, color: 'bg-green-500' }
          ]}
        />
        <StatsCard
          title="Order Metrics"
          stats={[
            { label: 'Total Orders', value: data.overview?.totalOrders, color: 'bg-blue-500' },
            { label: 'Avg Order Value', value: `₦${data.overview?.avgOrderValue?.toLocaleString()}`, color: 'bg-purple-500' },
            { label: 'Conversion Rate', value: `${data.overview?.conversionRate}%`, color: 'bg-emerald-500' }
          ]}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
        {data.status && data.status.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.status.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-medium">{item.status}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{item.count}</p>
                <p className="text-xs text-gray-500 mt-1">{item.percentage}%</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-10">No data available</p>
        )}
      </div>
    </div>
  );
};

/**
 * Revenue Section
 */
const RevenueSection = ({ data }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
        {data.revenue && data.revenue.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.revenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Revenue" dot={{ fill: '#10B981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10">No data available</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-50 rounded-lg p-6 border border-emerald-200">
          <p className="text-sm text-emerald-700 font-medium mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-emerald-900">₦{(data.overview?.totalRevenue / 1000000).toFixed(1)}M</p>
          <p className="text-sm text-emerald-600 mt-2">Net: ₦{(data.overview?.netRevenue / 1000000).toFixed(1)}M</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <p className="text-sm text-blue-700 font-medium mb-2">Daily Average</p>
          <p className="text-3xl font-bold text-blue-900">
            ₦{data.revenue && data.revenue.length > 0 ? Math.round(data.overview?.totalRevenue / data.revenue.length).toLocaleString() : 0}
          </p>
          <p className="text-sm text-blue-600 mt-2">{data.overview?.totalOrders} orders</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue Breakdown</h3>
        {data.revenue && data.revenue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Orders</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {data.revenue.slice(-7).map((day, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{day.date}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold">₦{day.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{day.orders}</td>
                    <td className="px-4 py-3 text-right text-gray-600">₦{day.avgOrder.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-10">No data available</p>
        )}
      </div>
    </div>
  );
};

/**
 * Payment Section
 */
const PaymentSection = ({ data }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Payment Method Analysis</h3>

      {data.payment && data.payment.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Payment Method</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Successful Orders</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Avg Order</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">Failure Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.payment.map((method, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{method.method}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{method.count}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold">₦{method.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600">₦{method.avgOrder.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        parseFloat(method.failureRate) > 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {method.failureRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.failures && (
            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-3">Payment Failures</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-orange-700">Failed Orders</p>
                  <p className="text-2xl font-bold text-orange-900">{data.failures.totalFailedOrders}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-700">Failure Rate</p>
                  <p className="text-2xl font-bold text-orange-900">{data.failures.failureRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-orange-700">Lost Revenue</p>
                  <p className="text-2xl font-bold text-orange-900">₦{(data.failures.totalFailedAmount / 1000).toFixed(0)}K</p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-center py-10">No payment data available</p>
      )}
    </div>
  );
};

/**
 * Products Section
 */
const ProductsSection = ({ data }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Revenue</h3>
      {data.products && data.products.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Product Name</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Units Sold</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Revenue</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Avg Price</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map(product => (
                <tr key={product.productId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                      {product.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{product.productName}</p>
                      <p className="text-xs text-gray-500">{product.category}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{product.unitsSold}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-gray-900">₦{product.revenue.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">₦{product.avgUnitPrice.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-10">No product data available</p>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
        {data.categories && data.categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.categories}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label
                  >
                    {data.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₦${(value / 1000).toFixed(0)}K`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.slice(0, 5).map((cat, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{cat.category}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-semibold">₦{cat.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{cat.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-10">No category data available</p>
        )}
      </div>
    </div>
  );
};

/**
 * Returns Section
 */
const ReturnsSection = ({ data }) => {
  if (!data.returns) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
          <p className="text-sm text-amber-700 font-medium mb-2">Total Refunds</p>
          <p className="text-3xl font-bold text-amber-900">{data.returns.completedRefunds}</p>
          <p className="text-sm text-amber-600 mt-2">₦{(data.returns.totalRefunded / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-red-50 rounded-lg p-6 border border-red-200">
          <p className="text-sm text-red-700 font-medium mb-2">Total Returns</p>
          <p className="text-3xl font-bold text-red-900">{data.returns.returnCount}</p>
          <p className="text-sm text-red-600 mt-2">{data.returns.returnRate}% return rate</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <p className="text-sm text-blue-700 font-medium mb-2">Pending Refunds</p>
          <p className="text-3xl font-bold text-blue-900">{data.returns.pendingRefunds}</p>
          <p className="text-sm text-blue-600 mt-2">₦{(data.returns.pendingRefundAmount / 1000).toFixed(0)}K</p>
        </div>
      </div>

      <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
        <h4 className="font-semibold text-yellow-900 mb-2">Financial Impact</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-yellow-700">Completed Revenue</p>
            <p className="text-2xl font-bold text-yellow-900">₦{(data.returns.completedRevenue / 1000000).toFixed(1)}M</p>
          </div>
          <div>
            <p className="text-sm text-yellow-700">Net Revenue (After Refunds)</p>
            <p className="text-2xl font-bold text-yellow-900">₦{(data.returns.netRevenue / 1000000).toFixed(1)}M</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Performance Section
 */
const PerformanceSection = ({ data }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Day of Week</h3>
        {data.dayOfWeek && data.dayOfWeek.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.dayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend />
              <Bar dataKey="orders" fill="#3B82F6" name="Orders" />
              <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10">No data available</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendors by Orders</h3>
        {data.vendors && data.vendors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Rank</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Vendor</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Orders</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Revenue</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.vendors.map(vendor => (
                  <tr key={vendor.vendorId} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                        {vendor.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{vendor.vendorName}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{vendor.orders}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold">₦{vendor.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        parseFloat(vendor.completionRate) > 90 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {vendor.completionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-10">No vendor data available</p>
        )}
      </div>
    </div>
  );
};

/**
 * Stats Card Component
 */
const StatsCard = ({ title, stats }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-4">{title}</h4>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
              <p className="text-gray-700 text-sm">{stat.label}</p>
            </div>
            <p className="font-bold text-gray-900 text-sm">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default TransactionAnalyticsTab;
