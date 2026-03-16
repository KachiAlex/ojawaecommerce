import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Table, TableBody, TableCell, TableHead, TableRow } from 'recharts';
import { TrendingUp, TrendingDown, Users, ShoppingCart, Heart, AlertCircle } from 'lucide-react';
import buyerAnalyticsService from '../../services/buyerAnalyticsService';

/**
 * Buyer Analytics Tab for Admin Dashboard
 * Displays comprehensive buyer metrics and engagement
 */
const BuyerAnalyticsTab = ({ timeRange = 'month' }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBuyerMetrics();
  }, [timeRange]);

  const fetchBuyerMetrics = async () => {
    try {
      setLoading(true);
      setError('');

      const [overview, topBuyers, growthTrend, engagement, repeatAnalysis, cohorts, abandonment, clv, retention] = await Promise.all([
        buyerAnalyticsService.getBuyerOverviewMetrics({ timeRange }),
        buyerAnalyticsService.getTopBuyersBySpending(10, timeRange),
        buyerAnalyticsService.getBuyerGrowthTrend(timeRange),
        buyerAnalyticsService.getBuyerEngagementMetrics(),
        buyerAnalyticsService.getRepeatBuyerAnalysis(timeRange),
        buyerAnalyticsService.getBuyerCohortAnalysis(),
        buyerAnalyticsService.getAbandonedCartMetrics(),
        buyerAnalyticsService.getCustomerLifetimeValue(),
        buyerAnalyticsService.getBuyerRetentionMetrics()
      ]);

      setData({
        overview,
        topBuyers,
        growthTrend,
        engagement,
        repeatAnalysis,
        cohorts,
        abandonment,
        clv,
        retention
      });
    } catch (err) {
      console.error('Error fetching buyer metrics:', err);
      setError('Failed to load buyer analytics');
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
          title="Total Buyers"
          value={data.overview?.totalBuyers}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <KPICard
          title="Active Buyers"
          value={data.overview?.activeBuyers}
          icon={<Users className="h-6 w-6" />}
          color="green"
        />
        <KPICard
          title="Repeat Buyers"
          value={data.overview?.repeatBuyers}
          icon={<ShoppingCart className="h-6 w-6" />}
          color="purple"
        />
        <KPICard
          title="Avg Order Value"
          value={`₦${data.overview?.avgOrderValue?.toLocaleString()}`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="emerald"
        />
        <KPICard
          title="Cart Abandonment"
          value={`${data.abandonment?.abandonmentRate}%`}
          icon={<AlertCircle className="h-6 w-6" />}
          color="amber"
        />
      </div>

      {/* Metrics Toggle */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {['overview', 'growth', 'engagement', 'retention', 'clv', 'cohorts'].map(metric => (
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
        {selectedMetric === 'overview' && (
          <OverviewSection data={data} />
        )}
        {selectedMetric === 'growth' && (
          <GrowthSection data={data} />
        )}
        {selectedMetric === 'engagement' && (
          <EngagementSection data={data} />
        )}
        {selectedMetric === 'retention' && (
          <RetentionSection data={data} />
        )}
        {selectedMetric === 'clv' && (
          <CLVSection data={data} />
        )}
        {selectedMetric === 'cohorts' && (
          <CohortsSection data={data} />
        )}
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
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {value}
          </p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

/**
 * Overview Section - Top Buyers & Stats
 */
const OverviewSection = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Purchase Metrics"
          stats={[
            { label: 'Total Orders', value: data.overview?.totalOrders, color: 'bg-blue-500' },
            { label: 'New Buyers', value: data.overview?.newBuyers || 0, color: 'bg-green-500' },
            { label: 'Avg Orders/Buyer', value: data.overview?.avgOrdersPerBuyer, color: 'bg-purple-500' }
          ]}
        />
        <StatsCard
          title="Revenue Metrics"
          stats={[
            { label: 'Total Revenue', value: `₦${(data.overview?.totalRevenue / 1000000).toFixed(1)}M`, color: 'bg-emerald-500' },
            { label: 'Avg Order Value', value: `₦${data.overview?.avgOrderValue?.toLocaleString()}`, color: 'bg-blue-500' }
          ]}
        />
        <StatsCard
          title="Cart Metrics"
          stats={[
            { label: 'Abandoned Carts', value: data.abandonment?.abandonmentCount, color: 'bg-amber-500' },
            { label: 'Recovery Value', value: `₦${(data.abandonment?.potentialRecoveryValue / 1000).toFixed(0)}K`, color: 'bg-orange-500' }
          ]}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Buyers by Spending</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Total Spent</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Orders</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Avg Order</th>
              </tr>
            </thead>
            <tbody>
              {data.topBuyers?.map(buyer => (
                <tr key={buyer.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                      {buyer.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{buyer.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{buyer.email}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-gray-900">₦{buyer.totalSpent.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{buyer.orderCount}</td>
                  <td className="px-4 py-3 text-center text-gray-600">₦{buyer.avgOrderValue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * Growth Section
 */
const GrowthSection = ({ data }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Buyer Registration Trend</h3>
        {data.growthTrend && data.growthTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.growthTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="newBuyers"
                stroke="#3B82F6"
                name="New Buyers"
                dot={{ fill: '#3B82F6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10">No data available</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <p className="text-sm text-blue-700 font-medium mb-2">Total New Buyers</p>
          <p className="text-3xl font-bold text-blue-900">{data.overview?.newBuyers || 0}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-6 border border-emerald-200">
          <p className="text-sm text-emerald-700 font-medium mb-2">Growth Rate</p>
          <p className="text-3xl font-bold text-emerald-900">
            {data.overview?.totalBuyers > 0 ? ((data.overview?.newBuyers / data.overview?.totalBuyers) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Engagement Section
 */
const EngagementSection = ({ data }) => {
  const engagementMetrics = [
    { label: 'Total Searches', value: data.engagement?.totalSearches, icon: '🔍' },
    { label: 'Products Browsed', value: data.engagement?.totalBrowses, icon: '👁️' },
    { label: 'Wishlist Adds', value: data.engagement?.wishlistAdds, icon: '❤️' },
    { label: 'Cart Adds', value: data.engagement?.cartAdds, icon: '🛒' },
    { label: 'Purchases', value: data.engagement?.purchases, icon: '✓' },
    { label: 'Conversion Rate', value: `${data.engagement?.conversionRate}%`, icon: '%' }
  ];

  const engagementData = [
    { name: 'Searches', value: data.engagement?.totalSearches || 0 },
    { name: 'Browsing', value: data.engagement?.totalBrowses || 0 },
    { name: 'Wishlist', value: data.engagement?.wishlistAdds || 0 },
    { name: 'Cart', value: data.engagement?.cartAdds || 0 },
    { name: 'Purchases', value: data.engagement?.purchases || 0 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {engagementMetrics.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">{metric.label}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{metric.value}</p>
              </div>
              <span className="text-2xl">{metric.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Funnel</h3>
        {engagementData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10">No data available</p>
        )}
      </div>

      <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
        <h4 className="font-semibold text-amber-900 mb-4">Cart Abandonment</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-amber-700">Abandoned Carts</p>
            <p className="text-2xl font-bold text-amber-900">{data.abandonment?.abandonmentCount}</p>
          </div>
          <div>
            <p className="text-sm text-amber-700">Potential Recovery</p>
            <p className="text-2xl font-bold text-amber-900">₦{(data.abandonment?.abandonedValue / 1000).toFixed(0)}K</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Retention Section
 */
const RetentionSection = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-4">Repeat Buyer Analysis</h4>
          <div className="space-y-3">
            <MetricRow label="Total Buyers" value={data.repeatAnalysis?.totalBuyers} />
            <MetricRow label="Repeat Buyers" value={`${data.repeatAnalysis?.repeatBuyers} (${data.repeatAnalysis?.repeatBuyerRate}%)`} />
            <MetricRow label="Loyal Buyers" value={`${data.repeatAnalysis?.loyalBuyers} (${data.repeatAnalysis?.loyalBuyerRate}%)`} />
            <MetricRow label="Avg Orders/Buyer" value={data.repeatAnalysis?.avgOrdersPerBuyer} />
          </div>
        </div>

        <div className="bg-emerald-50 rounded-lg p-6 border border-emerald-200">
          <h4 className="font-semibold text-emerald-900 mb-4">Retention Rates</h4>
          <div className="space-y-3">
            <RetentionBar label="30-Day Retention" value={data.retention?.retention30} />
            <RetentionBar label="60-Day Retention" value={data.retention?.retention60} />
            <RetentionBar label="90-Day Retention" value={data.retention?.retention90} />
            <MetricRow label="Churn Rate" value={`${data.retention?.churnRate}%`} />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * CLV (Customer Lifetime Value) Section
 */
const CLVSection = ({ data }) => {
  if (!data.clv) return null;

  const segments = data.clv.segments;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SegmentCard segment="VIP" count={data.clv.summary.vipCount} color="bg-purple-50 text-purple-700 border-purple-200" />
        <SegmentCard segment="High Value" count={data.clv.summary.highCount} color="bg-blue-50 text-blue-700 border-blue-200" />
        <SegmentCard segment="Medium Value" count={data.clv.summary.mediumCount} color="bg-amber-50 text-amber-700 border-amber-200" />
        <SegmentCard segment="Low Value" count={data.clv.summary.lowCount} color="bg-gray-50 text-gray-700 border-gray-200" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
          <p className="text-sm text-purple-700 font-medium mb-2">Total Customer Lifetime Value</p>
          <p className="text-3xl font-bold text-purple-900">₦{(data.clv.summary.totalCLV / 1000000).toFixed(1)}M</p>
          <p className="text-sm text-purple-600 mt-2">Average CLV: ₦{data.clv.summary.avgCLV.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <p className="text-sm text-blue-700 font-medium mb-2">Customer Value Distribution</p>
          <div className="space-y-2 mt-3">
            <div className="text-sm text-blue-700">VIP: {data.clv.summary.vipCount} customers</div>
            <div className="text-sm text-blue-700">High Value: {data.clv.summary.highCount} customers</div>
            <div className="text-sm text-blue-700">Medium: {data.clv.summary.mediumCount} customers</div>
            <div className="text-sm text-gray-600">Low: {data.clv.summary.lowCount} customers</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Cohorts Section
 */
const CohortsSection = ({ data }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Cohort Analysis (by Signup Month)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Cohort</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Signups</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Purchasers</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Conversion</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Avg Spent</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">30-Day</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">60-Day</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">90-Day</th>
            </tr>
          </thead>
          <tbody>
            {data.cohorts?.map((cohort, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{cohort.month}</td>
                <td className="px-4 py-3 text-right text-gray-600">{cohort.signups}</td>
                <td className="px-4 py-3 text-right text-gray-600">{cohort.purchasers}</td>
                <td className="px-4 py-3 text-right">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                    {cohort.conversionRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                  ₦{cohort.avgSpent.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-blue-600 font-medium">{cohort.retention30}%</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-purple-600 font-medium">{cohort.retention60}%</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-emerald-600 font-medium">{cohort.retention90}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Helper Components
 */
const StatsCard = ({ title, stats }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-4">{title}</h4>
      <div className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
              <p className="text-gray-700">{stat.label}</p>
            </div>
            <p className="font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const MetricRow = ({ label, value }) => {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-700">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
};

const RetentionBar = ({ label, value }) => {
  const numValue = parseFloat(value) || 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-gray-700">{label}</p>
        <p className="text-sm font-bold text-gray-900">{value}%</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
          style={{ width: `${numValue}%` }}
        ></div>
      </div>
    </div>
  );
};

const SegmentCard = ({ segment, count, color }) => {
  const [colorClass, textClass, borderClass] = color.split(' ');
  return (
    <div className={`${colorClass} ${borderClass} border rounded-lg p-4`}>
      <p className={`text-sm font-medium ${textClass}`}>{segment}</p>
      <p className="text-2xl font-bold mt-2" style={{ color: textClass.split('-')[1] }}>
        {count}
      </p>
    </div>
  );
};

export default BuyerAnalyticsTab;
