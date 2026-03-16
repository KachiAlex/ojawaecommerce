import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import adminAnalyticsService from '../services/adminAnalyticsService';
import { useRealtimeAll } from '../hooks/useRealtimeAnalytics';
import { analyticsCache } from '../services/analyticsCache';
import VendorAnalyticsTab from './VendorAnalyticsTab';
import BuyerAnalyticsTab from './BuyerAnalyticsTab';
import TransactionAnalyticsTab from './TransactionAnalyticsTab';
import PlatformHealthAnalyticsTab from './PlatformHealthAnalyticsTab';
import { ChevronDown, Download, RefreshCw, TrendingUp, TrendingDown, Users, Activity, AlertCircle, Clock, Wifi } from 'lucide-react';

const AdminAnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [exporting, setExporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [livestreamActive, setLiveStreamActive] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  
  const autoRefreshTimerRef = useRef(null);
  
  // Real-time analytics subscription
  const {
    vendorMetrics,
    buyerMetrics,
    transactionMetrics,
    healthMetrics,
    errorMetrics,
    apiMetrics,
    activityMetrics,
    loading: realtimeLoading,
    listenerCount: activeListeners,
    getAllCachedData
  } = useRealtimeAll();

  // Determine if any real-time data is available
  useEffect(() => {
    const hasLiveData = [
      vendorMetrics?.livestream,
      buyerMetrics?.livestream,
      transactionMetrics?.livestream,
      healthMetrics?.livestream
    ].some(v => v === true);

    setLiveStreamActive(hasLiveData);
    setListenerCount(activeListeners);
  }, [
    vendorMetrics?.livestream,
    buyerMetrics?.livestream,
    transactionMetrics?.livestream,
    healthMetrics?.livestream,
    activeListeners
  ]);

  // Fetch metrics with cache and real-time fallback
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // Try to use cached real-time data first
      if (livestreamActive) {
        const combinedMetrics = {
          vendor: vendorMetrics,
          buyer: buyerMetrics,
          transaction: transactionMetrics,
          health: healthMetrics,
          errors: errorMetrics,
          api: apiMetrics,
          activity: activityMetrics,
          timestamp: new Date()
        };
        setMetrics(combinedMetrics);
      } else {
        // Fallback to traditional fetch
        const data = await adminAnalyticsService.getDashboardMetrics({ timeRange });
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Setup auto-refresh timer
  useEffect(() => {
    if (autoRefresh && refreshInterval) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchMetrics();
      }, refreshInterval);
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Initial fetch and when timeRange changes
  useEffect(() => {
    fetchMetrics();
  }, [timeRange, livestreamActive, vendorMetrics, buyerMetrics, transactionMetrics]);

  const handleExport = async (format) => {
    try {
      setExporting(true);
      const data = await adminAnalyticsService.exportAnalytics(format, { timeRange });
      
      const element = document.createElement('a');
      element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(data)}`);
      element.setAttribute('download', `analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.${format}`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
        <p className="text-red-700">Failed to load analytics data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
            {livestreamActive && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-medium text-green-700">LIVE</span>
                <span className="text-xs text-green-600">({listenerCount} listeners)</span>
              </div>
            )}
          </div>
          <p className="text-gray-600 text-sm mt-1">Last {timeRange} performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm font-medium hover:border-gray-400"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
            >
              <Wifi className="h-5 w-5" />
            </button>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-900 text-xs font-medium hover:border-gray-400"
              >
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>1m</option>
                <option value={300000}>5m</option>
              </select>
            )}
          </div>
          
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative group">
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Download className="h-5 w-5 text-gray-600" />
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg hidden group-hover:block z-10">
              <button
                onClick={() => handleExport('json')}
                disabled={exporting}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 rounded-t-lg"
              >
                Export as JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 rounded-b-lg"
              >
                Export as CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Events"
          value={metrics.totalEvents}
          icon={<Activity className="h-6 w-6" />}
          trend="up"
          color="blue"
        />
        <KPICard
          title="Total Errors"
          value={metrics.errorStats.totalErrors}
          icon={<AlertCircle className="h-6 w-6" />}
          trend={metrics.errorStats.totalErrors > 100 ? 'down' : 'up'}
          color="red"
        />
        <KPICard
          title="Active Sessions"
          value={metrics.userEngagement.activeSessions}
          icon={<Users className="h-6 w-6" />}
          trend="up"
          color="green"
        />
        <KPICard
          title="Unique Users"
          value={metrics.userEngagement.uniqueUsers}
          icon={<Users className="h-6 w-6" />}
          trend="up"
          color="purple"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200">
        {['overview', 'vendor', 'buyer', 'transaction', 'platform-health', 'events', 'performance', 'conversions', 'errors'].map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              selectedTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        {selectedTab === 'overview' && (
          <OverviewSection metrics={metrics} />
        )}
        {selectedTab === 'vendor' && (
          <VendorAnalyticsTab timeRange={timeRange} />
        )}
        {selectedTab === 'buyer' && (
          <BuyerAnalyticsTab timeRange={timeRange} />
        )}
        {selectedTab === 'transaction' && (
          <TransactionAnalyticsTab timeRange={timeRange} />
        )}
        {selectedTab === 'platform-health' && (
          <PlatformHealthAnalyticsTab timeRange={timeRange} />
        )}
        {selectedTab === 'events' && (
          <EventsSection metrics={metrics} />
        )}
        {selectedTab === 'performance' && (
          <PerformanceSection metrics={metrics} />
        )}
        {selectedTab === 'conversions' && (
          <ConversionsSection metrics={metrics} />
        )}
        {selectedTab === 'errors' && (
          <ErrorsSection metrics={metrics} />
        )}
      </div>
    </div>
  );
};

/**
 * KPI Card Component
 */
const KPICard = ({ title, value, icon, trend, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-4">
        {trend === 'up' ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
        <span className={trend === 'up' ? 'text-green-600 text-sm font-medium' : 'text-red-600 text-sm font-medium'}>
          {trend === 'up' ? 'Increasing' : 'Decreasing'}
        </span>
      </div>
    </div>
  );
};

/**
 * Overview Section
 */
const OverviewSection = ({ metrics }) => {
  const eventData = Object.entries(metrics.eventsByCategory).map(([category, count]) => ({
    name: category,
    value: count
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Events by Category</h3>
        {eventData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={eventData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {eventData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No event data available</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Avg Session Duration</p>
          <p className="text-2xl font-bold text-blue-900">{metrics.userEngagement.averageSessionDuration}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
          <p className="text-2xl font-bold text-green-900">{metrics.userEngagement.totalSessions}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Events Section
 */
const EventsSection = ({ metrics }) => {
  const eventData = Object.entries(metrics.eventsByCategory).map(([category, count]) => ({
    name: category,
    count
  }));

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Breakdown</h3>
      {eventData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={eventData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-500 text-center py-8">No event data available</p>
      )}
    </div>
  );
};

/**
 * Performance Section
 */
const PerformanceSection = ({ metrics }) => {
  const perfData = [
    { name: 'Page Load', value: parseFloat(metrics.performanceMetrics.avgPageLoadTime) },
    { name: 'FCP', value: parseFloat(metrics.performanceMetrics.avgFCP) },
    { name: 'LCP', value: parseFloat(metrics.performanceMetrics.avgLCP) },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Performance Metrics (ms)</h3>
      {metrics.performanceMetrics.totalSamples > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={perfData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" />
            </LineChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-gray-600">Page Load</p>
              <p className="font-bold text-lg">{metrics.performanceMetrics.avgPageLoadTime}ms</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-gray-600">FCP</p>
              <p className="font-bold text-lg">{metrics.performanceMetrics.avgFCP}ms</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-gray-600">LCP</p>
              <p className="font-bold text-lg">{metrics.performanceMetrics.avgLCP}ms</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-gray-600">CLS</p>
              <p className="font-bold text-lg">{metrics.performanceMetrics.avgCLS}</p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-center py-8">No performance data available</p>
      )}
    </div>
  );
};

/**
 * Conversions Section
 */
const ConversionsSection = ({ metrics }) => {
  const conversionData = Object.entries(metrics.conversionMetrics).map(([funnelType, data]) => ({
    name: funnelType,
    ...data
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Conversion Funnels</h3>
      {conversionData.length > 0 ? (
        <div className="space-y-4">
          {conversionData.map((funnel, idx) => (
            <div key={idx} className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900 capitalize">{funnel.name}</h4>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {['view', 'start', 'progress', 'complete', 'abandon'].map(stage => (
                  <div key={stage} className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-600 capitalize">{stage}</p>
                    <p className="text-lg font-bold text-gray-900">{funnel[stage]}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-green-600 font-medium mt-2">
                Conversion Rate: {funnel.conversionRate}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No conversion data available</p>
      )}
    </div>
  );
};

/**
 * Errors Section
 */
const ErrorsSection = ({ metrics }) => {
  const errorTypeData = Object.entries(metrics.errorStats.errorTypes).map(([type, count]) => ({
    name: type,
    count
  }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Types</h3>
        {errorTypeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={errorTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No errors recorded</p>
        )}
      </div>

      {metrics.errorStats.topErrors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Errors</h3>
          <div className="space-y-2 mt-4">
            {metrics.errorStats.topErrors.map((error, idx) => (
              <div key={idx} className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                <p className="font-semibold text-red-900">{error.errorType}</p>
                <p className="text-sm text-red-700 mt-1">{error.errorMessage}</p>
                <p className="text-xs text-red-600 mt-1">
                  {error.timestamp ? new Date(error.timestamp).toLocaleString() : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default AdminAnalyticsDashboard;
