import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Award, AlertCircle, Store } from 'lucide-react';
import vendorAnalyticsService from '../../services/vendorAnalyticsService';

/**
 * Vendor Analytics Tab for Admin Dashboard
 * Displays comprehensive vendor metrics and performance
 */
const VendorAnalyticsTab = ({ timeRange = 'month' }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVendorMetrics();
  }, [timeRange]);

  const fetchVendorMetrics = async () => {
    try {
      setLoading(true);
      setError('');

      const [overview, topVendors, growthTrend, health, byCategory, funnel] = await Promise.all([
        vendorAnalyticsService.getVendorOverviewMetrics({ timeRange }),
        vendorAnalyticsService.getTopVendorsByRevenue(10, timeRange),
        vendorAnalyticsService.getVendorGrowthTrend(timeRange),
        vendorAnalyticsService.getVendorHealthIndicators(),
        vendorAnalyticsService.getVendorsByCategory(timeRange),
        vendorAnalyticsService.getVendorOnboardingFunnel()
      ]);

      setData({
        overview,
        topVendors,
        growthTrend,
        health,
        byCategory,
        funnel
      });
    } catch (err) {
      console.error('Error fetching vendor metrics:', err);
      setError('Failed to load vendor analytics');
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
          title="Total Vendors"
          value={data.overview?.totalVendors}
          icon={<Store className="h-6 w-6" />}
          color="blue"
        />
        <KPICard
          title="Active Vendors"
          value={data.overview?.activeVendors}
          icon={<Users className="h-6 w-6" />}
          color="green"
        />
        <KPICard
          title="Pending Approval"
          value={data.overview?.pendingVendors}
          icon={<AlertCircle className="h-6 w-6" />}
          color="amber"
        />
        <KPICard
          title="Avg Rating"
          value={data.overview?.averageRating?.toFixed(1)}
          icon={<Award className="h-6 w-6" />}
          color="purple"
          suffix="/5"
        />
        <KPICard
          title="Total Revenue"
          value={`₦${(data.overview?.totalVendorRevenue / 1000000).toFixed(1)}M`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="emerald"
        />
      </div>

      {/* Metrics Toggle */}
      <div className="flex gap-2 border-b border-gray-200">
        {['overview', 'growth', 'performance', 'category', 'funnel'].map(metric => (
          <button
            key={metric}
            onClick={() => setSelectedMetric(metric)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
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
        {selectedMetric === 'performance' && (
          <PerformanceSection data={data} />
        )}
        {selectedMetric === 'category' && (
          <CategorySection data={data} />
        )}
        {selectedMetric === 'funnel' && (
          <FunnelSection data={data} />
        )}
      </div>
    </div>
  );
};

/**
 * KPI Card Component
 */
const KPICard = ({ title, value, icon, color, suffix = '' }) => {
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
            {value}{suffix}
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
 * Overview Section - Top Vendors
 */
const OverviewSection = ({ data }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendors by Revenue</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Store Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Orders</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Revenue</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Rating</th>
              </tr>
            </thead>
            <tbody>
              {data.topVendors?.map((vendor, index) => (
                <tr key={vendor.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                      {vendor.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{vendor.name}</p>
                      <p className="text-xs text-gray-500">{vendor.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{vendor.category}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{vendor.ordersCount}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-gray-900">₦{vendor.revenue.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-medium">
                      ⭐ {vendor.rating.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsCard
          title="Status Distribution"
          stats={[
            { label: 'Active', value: data.overview?.activeVendors, color: 'bg-green-500' },
            { label: 'Pending', value: data.overview?.pendingVendors, color: 'bg-amber-500' },
            { label: 'Suspended', value: data.overview?.suspendedVendors, color: 'bg-red-500' }
          ]}
        />
        <StatsCard
          title="Performance Indicators"
          stats={[
            { label: 'Avg Revenue', value: `₦${(data.overview?.averageRevenuePerVendor / 1000).toFixed(0)}K`, color: 'bg-blue-500' },
            { label: 'Avg Rating', value: data.overview?.averageRating?.toFixed(1), suffix: '/5', color: 'bg-purple-500' }
          ]}
        />
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Registration Trend</h3>
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
                dataKey="newVendors"
                stroke="#3B82F6"
                name="New Vendors"
                dot={{ fill: '#3B82F6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10">No data available</p>
        )}
      </div>
    </div>
  );
};

/**
 * Performance Section - Health Indicators
 */
const PerformanceSection = ({ data }) => {
  if (!data.health) return null;

  const healthMetrics = [
    {
      label: 'Responsive Vendors',
      current: data.health.responsiveVendors,
      total: data.health.totalVendors,
      color: 'bg-green-500'
    },
    {
      label: 'High-Rated Vendors',
      current: data.health.highRatedVendors,
      total: data.health.totalVendors,
      color: 'bg-blue-500'
    },
    {
      label: 'Active Listers',
      current: data.health.activeListers,
      total: data.health.totalVendors,
      color: 'bg-emerald-500'
    },
    {
      label: 'Low Response Rate',
      current: data.health.lowResponseVendors,
      total: data.health.totalVendors,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Platform Health Score</h3>
          <div className="ml-auto text-2xl font-bold">{data.health.healthScore}/100</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              data.health.healthScore >= 80
                ? 'bg-green-500'
                : data.health.healthScore >= 60
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${data.health.healthScore}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {healthMetrics.map((metric, index) => (
          <HealthMetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  );
};

/**
 * Category Section
 */
const CategorySection = ({ data }) => {
  const categoryData = data.byCategory || [];

  const chartData = categoryData.map(cat => ({
    name: cat.category,
    value: cat.revenue
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ₦${(value / 1000000).toFixed(1)}M`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₦${(value / 1000000).toFixed(1)}M`} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10">No data available</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Vendors</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Revenue</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Orders</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((category, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{category.category}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{category.count}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                    ₦{category.revenue.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{category.orders}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-yellow-600 font-medium">⭐ {category.avgRating.toFixed(1)}</span>
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

/**
 * Funnel Section - Onboarding Stages
 */
const FunnelSection = ({ data }) => {
  const funnel = data.funnel;

  if (!funnel) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Onboarding Funnel</h3>
        <p className="text-gray-600 text-sm mb-6">
          Overall conversion rate: <span className="font-bold text-blue-600">{funnel.conversionRate}%</span>
        </p>

        <div className="space-y-4">
          {funnel.stages.map((stage, index) => (
            <FunnelStage key={index} stage={stage} index={index} totalStages={funnel.stages.length} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-700 font-medium mb-1">Total Registered</p>
          <p className="text-2xl font-bold text-blue-900">{funnel.totalRegistered}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-4">
          <p className="text-sm text-emerald-700 font-medium mb-1">Conversion Rate</p>
          <p className="text-2xl font-bold text-emerald-900">{funnel.conversionRate}%</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-purple-700 font-medium mb-1">First Sales</p>
          <p className="text-2xl font-bold text-purple-900">{funnel.stages[3]?.count || 0}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Health Metric Card
 */
const HealthMetricCard = ({ label, current, total, color }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-lg font-bold text-gray-900">{current}/{total}</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500 mt-2">{percentage.toFixed(1)}%</p>
    </div>
  );
};

/**
 * Funnel Stage Component
 */
const FunnelStage = ({ stage, index, totalStages }) => {
  const width = index === 0 ? 100 : (stage.percentage || 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-gray-900">{stage.name}</p>
        <div className="text-right">
          <p className="font-bold text-gray-900">{stage.count}</p>
          <p className="text-xs text-gray-500">{stage.percentage}%</p>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
          style={{ width: `${width}%` }}
        ></div>
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
      <div className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
              <p className="text-gray-700">{stat.label}</p>
            </div>
            <p className="font-bold text-gray-900">
              {stat.value}
              {stat.suffix}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316'
];

export default VendorAnalyticsTab;
