import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle, AlertTriangle, Activity, Server, Database, Shield, Zap } from 'lucide-react';
import platformHealthAnalyticsService from '../../services/platformHealthAnalyticsService';

/**
 * Platform Health Analytics Tab for Admin Dashboard
 * Displays system performance, API health, database metrics, and CSP violations
 */
const PlatformHealthAnalyticsTab = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlatformMetrics();
  }, []);

  const fetchPlatformMetrics = async () => {
    try {
      setLoading(true);
      setError('');

      const [health, api, firestore, csp, errors, performance, activity, services] = await Promise.all([
        platformHealthAnalyticsService.getPlatformHealthOverview(),
        platformHealthAnalyticsService.getAPIPerformanceMetrics(),
        platformHealthAnalyticsService.getFirestoreUsageMetrics(),
        platformHealthAnalyticsService.getCSPHealthMetrics(),
        platformHealthAnalyticsService.getErrorTrackingMetrics(),
        platformHealthAnalyticsService.getPerformanceTrend('day'),
        platformHealthAnalyticsService.getUserActivityMetrics(),
        platformHealthAnalyticsService.getServiceStatusMetrics()
      ]);

      setData({
        health,
        api,
        firestore,
        csp,
        errors,
        performance,
        activity,
        services
      });
    } catch (err) {
      console.error('Error fetching platform metrics:', err);
      setError('Failed to load platform health analytics');
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
      {/* Health Score Card */}
      <HealthScoreCard health={data.health} />

      {/* Metrics Toggle */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {['overview', 'performance', 'api', 'database', 'security', 'errors', 'services'].map(metric => (
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
        {selectedMetric === 'performance' && <PerformanceSection data={data} />}
        {selectedMetric === 'api' && <APISection data={data} />}
        {selectedMetric === 'database' && <DatabaseSection data={data} />}
        {selectedMetric === 'security' && <SecuritySection data={data} />}
        {selectedMetric === 'errors' && <ErrorsSection data={data} />}
        {selectedMetric === 'services' && <ServicesSection data={data} />}
      </div>
    </div>
  );
};

/**
 * Health Score Card
 */
const HealthScoreCard = ({ health }) => {
  const getStatusColor = (status) => {
    if (status === 'Excellent') return 'text-green-600';
    if (status === 'Good') return 'text-blue-600';
    if (status === 'Fair') return 'text-amber-600';
    return 'text-red-600';
  };

  const getStatusBgColor = (status) => {
    if (status === 'Excellent') return 'bg-green-50';
    if (status === 'Good') return 'bg-blue-50';
    if (status === 'Fair') return 'bg-amber-50';
    return 'bg-red-50';
  };

  return (
    <div className={`${getStatusBgColor(health.status)} rounded-lg p-8 border-2 border-current`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-semibold ${getStatusColor(health.status)}`}>Overall Platform Health</p>
          <p className={`text-5xl font-bold ${getStatusColor(health.status)} mt-2`}>{health.healthScore}%</p>
          <p className={`text-lg font-semibold ${getStatusColor(health.status)} mt-1`}>{health.status}</p>
        </div>
        <div className="space-y-4 text-right">
          <MetricBadge label="CPU" value={`${health.avgCPU}%`} />
          <MetricBadge label="Memory" value={`${health.avgMemory}%`} />
          <MetricBadge label="Uptime" value={health.uptime} />
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Response Time"
          value={`${data.health.avgResponseTime}ms`}
          icon={<Zap className="h-6 w-6" />}
          status={data.health.avgResponseTime < 500 ? 'good' : 'warning'}
        />
        <StatCard
          title="Error Rate"
          value={`${data.health.avgErrorRate}%`}
          icon={<AlertCircle className="h-6 w-6" />}
          status={data.health.avgErrorRate < 1 ? 'good' : 'warning'}
        />
        <StatCard
          title="API Endpoints"
          value={data.api?.length || 0}
          icon={<Server className="h-6 w-6" />}
        />
        <StatCard
          title="Total Errors"
          value={data.errors?.totalErrors || 0}
          icon={<AlertTriangle className="h-6 w-6" />}
          status={data.errors?.totalErrors === 0 ? 'good' : 'warning'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InfoCard title="Database Usage" stats={[
          { label: 'Total Docs', value: data.firestore?.totalDocuments || 0 },
          { label: 'Storage', value: `${data.firestore?.estimatedStorageGB || 0}GB` },
          { label: 'Largest', value: data.firestore?.largestCollection?.[0] || 'N/A' }
        ]} />
        <InfoCard title="CSP Health" stats={[
          { label: 'Violations', value: data.csp?.totalViolations || 0 },
          { label: 'Score', value: `${data.csp?.cspHealthScore || 100}%` },
          { label: 'Status', value: data.csp?.status || 'healthy' }
        ]} />
        <InfoCard title="User Activity" stats={[
          { label: 'Active Users', value: data.activity?.uniqueUsers || 0 },
          { label: 'Events', value: data.activity?.totalEvents || 0 },
          { label: 'Avg/User', value: data.activity?.avgEventsPerUser || 0 }
        ]} />
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance Trend</h3>
        {data.performance && data.performance.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" angle={-45} height={100} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="cpu" stroke="#EF4444" name="CPU%" />
              <Line yAxisId="left" type="monotone" dataKey="memory" stroke="#3B82F6" name="Memory%" />
              <Line yAxisId="right" type="monotone" dataKey="responseTime" stroke="#10B981" name="Response (ms)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10">No performance data available</p>
        )}
      </div>
    </div>
  );
};

/**
 * API Section
 */
const APISection = ({ data }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">API Endpoint Performance</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Endpoint</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Calls</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Avg Response</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Error Rate</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Success Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.api?.map((endpoint, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{endpoint.endpoint}</td>
                <td className="px-4 py-3 text-right text-gray-600">{endpoint.calls}</td>
                <td className="px-4 py-3 text-right text-gray-600">{endpoint.avgResponseTime}ms</td>
                <td className="px-4 py-3 text-right">
                  <span className={endpoint.errorRate > 5 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                    {endpoint.errorRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                    {endpoint.successRate}%
                  </span>
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
 * Database Section
 */
const DatabaseSection = ({ data }) => {
  if (!data.firestore) return null;

  const dbData = Object.entries(data.firestore.collections || {}).map(([name, count]) => ({
    name,
    value: count
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricBox label="Total Documents" value={data.firestore.totalDocuments} />
        <MetricBox label="Estimated Storage" value={`${data.firestore.estimatedStorageGB}GB`} />
        <MetricBox label="Read Ops/Hour" value={data.firestore.readOpsLastHour} />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Sizes</h3>
        {dbData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dbData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10">No data available</p>
        )}
      </div>
    </div>
  );
};

/**
 * Security Section
 */
const SecuritySection = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">CSP Health Score</h3>
            <p className="text-blue-700 mt-2">Content Security Policy violations in last 24 hours</p>
          </div>
          <p className="text-4xl font-bold text-blue-600">{data.csp?.cspHealthScore}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricBox label="Total Violations" value={data.csp?.totalViolations} color="red" />
        <MetricBox label="Violation Types" value={Object.keys(data.csp?.violationTypes || {}).length} />
        <MetricBox label="Status" value={data.csp?.status} />
      </div>

      {data.csp?.topViolations && data.csp.topViolations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Violations</h3>
          <div className="space-y-2">
            {data.csp.topViolations.map((v, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 p-4 rounded">
                <span className="font-medium text-gray-900">{v.type}</span>
                <span className="text-amber-600 font-bold">{v.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Errors Section
 */
const ErrorsSection = ({ data }) => {
  if (!data.errors) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricBox label="Total Errors" value={data.errors.totalErrors} color="red" />
        <MetricBox label="Critical" value={data.errors.severityBreakdown.critical} color="red" />
        <MetricBox label="Unresolved" value={data.errors.unresolvedErrors} color="amber" />
        <MetricBox label="Error Rate" value={`${data.errors.errorRate}/min`} />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Types</h3>
        <div className="space-y-2">
          {data.errors.errorTypes?.map((et, idx) => (
            <div key={idx} className="flex items-center justify-between bg-gray-50 p-4 rounded">
              <span className="font-medium text-gray-900">{et.type}</span>
              <span className="text-red-600 font-bold">{et.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Services Section
 */
const ServicesSection = ({ data }) => {
  if (!data.services || !data.services.services) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Service Health Status</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(data.services.services).map((service, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{service.name}</h4>
              <span className="flex items-center gap-1">
                {service.status === 'operational' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : service.status === 'degraded' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm font-medium capitalize text-gray-600">
                  {service.status}
                </span>
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">Response: <span className="font-semibold">{service.responseTime.toFixed(0)}ms</span></p>
              <p className="text-gray-600">Uptime: <span className="font-semibold">{service.uptime}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Helper Components
 */
const StatCard = ({ title, value, icon, status = 'normal' }) => {
  const statusColors = {
    good: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
    normal: 'bg-blue-50 text-blue-700 border-blue-200'
  };

  return (
    <div className={`${statusColors[status]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">{title}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

const MetricBadge = ({ label, value }) => (
  <div className="bg-white bg-opacity-50 rounded px-3 py-2">
    <p className="text-xs text-gray-600">{label}</p>
    <p className="text-lg font-bold text-gray-900">{value}</p>
  </div>
);

const InfoCard = ({ title, stats }) => (
  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
    <h4 className="font-semibold text-gray-900 mb-4">{title}</h4>
    <div className="space-y-3">
      {stats.map((stat, idx) => (
        <div key={idx} className="flex items-center justify-between">
          <p className="text-gray-600">{stat.label}</p>
          <p className="font-bold text-gray-900">{stat.value}</p>
        </div>
      ))}
    </div>
  </div>
);

const MetricBox = ({ label, value, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200'
  };

  return (
    <div className={`${colors[color]} border rounded-lg p-4 text-center`}>
      <p className="text-sm font-medium mb-2">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};

export default PlatformHealthAnalyticsTab;
