import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

const LogisticsPerformanceDashboard = ({ logisticsId, deliveries = [], routes = [] }) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [metrics, setMetrics] = useState({
    totalDeliveries: 0,
    successRate: 0,
    avgDeliveryTime: 0,
    onTimeDeliveryRate: 0,
    revenue: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
    failedDeliveries: 0,
    deliveriesByStatus: {},
    dailyDeliveries: [],
    routePerformance: [],
    avgRating: 0
  });

  useEffect(() => {
    if (deliveries.length > 0) {
      calculateMetrics();
    }
  }, [deliveries, timeRange]);

  const calculateMetrics = () => {
    const now = new Date();
    const timeRangeMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };
    const rangeMs = timeRangeMs[timeRange];
    const startDate = new Date(now - rangeMs);

    // Filter deliveries within time range
    const filteredDeliveries = deliveries.filter(delivery => {
      const deliveryDate = delivery.createdAt?.toDate ? delivery.createdAt.toDate() : new Date(delivery.createdAt);
      return deliveryDate >= startDate;
    });

    const totalDeliveries = filteredDeliveries.length;
    const completedDeliveries = filteredDeliveries.filter(d => d.status === 'delivered').length;
    const failedDeliveries = filteredDeliveries.filter(d => d.status === 'failed' || d.status === 'cancelled').length;
    const activeDeliveries = filteredDeliveries.filter(d => 
      d.status === 'picked_up' || d.status === 'in_transit' || d.status === 'out_for_delivery'
    ).length;

    // Calculate success rate
    const successRate = totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0;

    // Calculate average delivery time
    let totalDeliveryTime = 0;
    let deliveryTimeCount = 0;
    filteredDeliveries.forEach(delivery => {
      if (delivery.status === 'delivered' && delivery.createdAt && delivery.deliveredAt) {
        const created = delivery.createdAt?.toDate ? delivery.createdAt.toDate() : new Date(delivery.createdAt);
        const delivered = delivery.deliveredAt?.toDate ? delivery.deliveredAt.toDate() : new Date(delivery.deliveredAt);
        const timeInHours = (delivered - created) / (1000 * 60 * 60);
        totalDeliveryTime += timeInHours;
        deliveryTimeCount++;
      }
    });
    const avgDeliveryTime = deliveryTimeCount > 0 ? totalDeliveryTime / deliveryTimeCount : 0;

    // Calculate on-time delivery rate
    let onTimeCount = 0;
    filteredDeliveries.forEach(delivery => {
      if (delivery.status === 'delivered' && delivery.estimatedDeliveryTime && delivery.deliveredAt) {
        const estimated = delivery.estimatedDeliveryTime?.toDate ? delivery.estimatedDeliveryTime.toDate() : new Date(delivery.estimatedDeliveryTime);
        const actual = delivery.deliveredAt?.toDate ? delivery.deliveredAt.toDate() : new Date(delivery.deliveredAt);
        if (actual <= estimated) {
          onTimeCount++;
        }
      }
    });
    const onTimeDeliveryRate = completedDeliveries > 0 ? (onTimeCount / completedDeliveries) * 100 : 0;

    // Calculate revenue
    const revenue = filteredDeliveries
      .filter(d => d.status === 'delivered')
      .reduce((sum, d) => sum + (d.deliveryFee || 0), 0);

    // Deliveries by status
    const deliveriesByStatus = {
      pending: filteredDeliveries.filter(d => d.status === 'pending' || d.status === 'assigned').length,
      active: activeDeliveries,
      completed: completedDeliveries,
      failed: failedDeliveries
    };

    // Daily deliveries
    const dailyDeliveriesMap = {};
    filteredDeliveries.forEach(delivery => {
      const deliveryDate = delivery.createdAt?.toDate ? delivery.createdAt.toDate() : new Date(delivery.createdAt);
      const dateKey = deliveryDate.toISOString().split('T')[0];
      dailyDeliveriesMap[dateKey] = (dailyDeliveriesMap[dateKey] || 0) + 1;
    });
    const dailyDeliveries = Object.entries(dailyDeliveriesMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Route performance
    const routePerformanceMap = {};
    filteredDeliveries.forEach(delivery => {
      const routeKey = `${delivery.pickupAddress || 'Unknown'} → ${delivery.deliveryAddress || 'Unknown'}`;
      if (!routePerformanceMap[routeKey]) {
        routePerformanceMap[routeKey] = {
          route: routeKey,
          count: 0,
          completed: 0,
          avgTime: 0,
          totalTime: 0,
          revenue: 0
        };
      }
      routePerformanceMap[routeKey].count++;
      if (delivery.status === 'delivered') {
        routePerformanceMap[routeKey].completed++;
        routePerformanceMap[routeKey].revenue += delivery.deliveryFee || 0;
        
        if (delivery.createdAt && delivery.deliveredAt) {
          const created = delivery.createdAt?.toDate ? delivery.createdAt.toDate() : new Date(delivery.createdAt);
          const delivered = delivery.deliveredAt?.toDate ? delivery.deliveredAt.toDate() : new Date(delivery.deliveredAt);
          const timeInHours = (delivered - created) / (1000 * 60 * 60);
          routePerformanceMap[routeKey].totalTime += timeInHours;
        }
      }
    });

    const routePerformance = Object.values(routePerformanceMap)
      .map(route => ({
        ...route,
        avgTime: route.completed > 0 ? route.totalTime / route.completed : 0,
        successRate: route.count > 0 ? (route.completed / route.count) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average rating
    const ratingsSum = filteredDeliveries
      .filter(d => d.rating && d.rating > 0)
      .reduce((sum, d) => sum + d.rating, 0);
    const ratingsCount = filteredDeliveries.filter(d => d.rating && d.rating > 0).length;
    const avgRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

    setMetrics({
      totalDeliveries,
      successRate,
      avgDeliveryTime,
      onTimeDeliveryRate,
      revenue,
      activeDeliveries,
      completedDeliveries,
      failedDeliveries,
      deliveriesByStatus,
      dailyDeliveries,
      routePerformance,
      avgRating
    });
  };

  const formatCurrency = (amount) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTime = (hours) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} mins`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} hours`;
    } else {
      return `${(hours / 24).toFixed(1)} days`;
    }
  };

  // Chart data
  const deliveriesChartData = {
    labels: metrics.dailyDeliveries.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Deliveries',
        data: metrics.dailyDeliveries.map(d => d.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const statusChartData = {
    labels: ['Completed', 'Active', 'Pending', 'Failed'],
    datasets: [
      {
        data: [
          metrics.deliveriesByStatus.completed,
          metrics.deliveriesByStatus.active,
          metrics.deliveriesByStatus.pending,
          metrics.deliveriesByStatus.failed
        ],
        backgroundColor: [
          'rgb(16, 185, 129)',
          'rgb(59, 130, 246)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)'
        ]
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
        <div className="flex gap-2">
          {['7d', '30d', '90d', '1y'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '1y' ? '1 Year' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Deliveries */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalDeliveries}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {metrics.completedDeliveries} completed • {metrics.activeDeliveries} active
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.successRate.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {metrics.completedDeliveries} of {metrics.totalDeliveries} successful
          </div>
        </div>

        {/* Average Delivery Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Delivery Time</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatTime(metrics.avgDeliveryTime)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            On-time: {metrics.onTimeDeliveryRate.toFixed(1)}%
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.revenue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            From completed deliveries
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deliveries Over Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deliveries Over Time</h3>
          {metrics.dailyDeliveries.length > 0 ? (
            <Line 
              data={deliveriesChartData}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: { display: false }
                }
              }}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No delivery data for this period
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Status Distribution</h3>
          {metrics.totalDeliveries > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <Doughnut 
                data={statusChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom' }
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No delivery data available
            </div>
          )}
        </div>
      </div>

      {/* Route Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Routes Performance</h3>
          {metrics.routePerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Deliveries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Success Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg. Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.routePerformance.map((route, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {route.route}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {route.count}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          route.successRate >= 90 
                            ? 'bg-green-100 text-green-800' 
                            : route.successRate >= 70 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {route.successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatTime(route.avgTime)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                        {formatCurrency(route.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-500">
              No route performance data available
            </div>
          )}
        </div>
      </div>

      {/* Rating Section */}
      {metrics.avgRating > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Rating</h3>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-gray-900">{metrics.avgRating.toFixed(1)}</div>
            <div>
              <div className="flex items-center gap-1 text-yellow-400">
                {[1, 2, 3, 4, 5].map(star => (
                  <svg 
                    key={star}
                    className={`w-6 h-6 ${star <= Math.round(metrics.avgRating) ? 'fill-current' : 'fill-gray-300'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-1">Average customer rating</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsPerformanceDashboard;

