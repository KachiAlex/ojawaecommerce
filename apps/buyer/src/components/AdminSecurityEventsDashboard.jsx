import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const SecurityEventsDashboard = () => {
  const [securityEvents, setSecurityEvents] = useState([]);
  const [securitySummary, setSecuritySummary] = useState(null);
  const [failedLogins, setFailedLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSecurityData();
  }, [dateRange, filterType]);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch security events
      const eventsRes = await axios.get('/admin/security/events', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          ...(filterType !== 'all' && { eventType: filterType }),
          limit: 100,
        },
        headers,
      });
      setSecurityEvents(eventsRes.data.events || []);

      // Fetch security summary
      const summaryRes = await axios.get('/admin/security/summary', { headers });
      setSecuritySummary(summaryRes.data.summary);

      // Fetch failed logins
      const loginsRes = await axios.get('/admin/security/failed-logins', {
        params: { limit: 50, page: 1 },
        headers,
      });
      setFailedLogins(loginsRes.data.failedLogins || []);
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for charts
  const severityData = securitySummary?.events?.reduce((acc, event) => {
    const severity = event.severity || 'unknown';
    const existing = acc.find(item => item.name === severity);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: severity, value: 1 });
    }
    return acc;
  }, []) || [];

  const eventTypeData = securitySummary?.summary?.eventTypeBreakdown
    ? Object.entries(securitySummary.summary.eventTypeBreakdown).map(([type, count]) => ({
        name: type,
        value: count,
      }))
    : [];

  const timelineData = securityEvents.reduce((acc, event) => {
    const date = new Date(event.timestamp).toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ date, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

  const COLORS = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#FBBF24',
    low: '#60A5FA',
    info: '#3B82F6',
  };

  const getSecurityScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSecurityScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  if (loading) {
    return <div className="p-8 text-center">Loading security data...</div>;
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Security Monitoring Dashboard</h2>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        {['overview', 'events', 'failed-logins', 'analytics'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold capitalize ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && securitySummary && (
        <div>
          {/* Security Score Card */}
          <div
            className={`rounded-lg p-6 mb-6 ${getSecurityScoreBgColor(securitySummary.securityScore?.calculatedScore || 0)}`}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Security Score</h3>
            <div className={`text-4xl font-bold ${getSecurityScoreColor(securitySummary.securityScore?.calculatedScore || 0)}`}>
              {securitySummary.securityScore?.calculatedScore || 0}/100
            </div>
            <p className="text-sm text-gray-600 mt-2">Based on last 24 hours of security events</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-3 lg:grid-cols-6">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {securitySummary.last24Hours?.failedLoginAttempts || 0}
              </div>
              <div className="text-sm text-gray-600">Failed Logins</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {securitySummary.last24Hours?.rateLimitViolations || 0}
              </div>
              <div className="text-sm text-gray-600">Rate Limit Hits</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {securitySummary.last24Hours?.adminContextMismatches || 0}
              </div>
              <div className="text-sm text-gray-600">Context Mismatches</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {securitySummary.last24Hours?.accountLockouts || 0}
              </div>
              <div className="text-sm text-gray-600">Account Lockouts</div>
            </div>

            <div className="bg-red-100 rounded-lg p-4 border border-red-300">
              <div className="text-2xl font-bold text-red-700">
                {securitySummary.last24Hours?.criticalErrors || 0}
              </div>
              <div className="text-sm text-gray-600">Critical Errors</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {securitySummary.last24Hours?.activeAdminSessions || 0}
              </div>
              <div className="text-sm text-gray-600">Active Admins</div>
            </div>
          </div>

          {/* Severity Pie Chart */}
          {severityData.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Events by Severity</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value})`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Timeline Chart */}
          {timelineData.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Security Events Timeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#3B82F6" fillOpacity={1} fill="url(#colorEvents)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div>
          <div className="mb-6 flex gap-4">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Events</option>
              <option value="failed_login">Failed Login</option>
              <option value="rate_limit_exceeded">Rate Limit</option>
              <option value="admin_context_mismatch">Context Mismatch</option>
              <option value="account_lockout">Account Lockout</option>
              <option value="security_alert">Security Alert</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2">
                  <th className="text-left px-4 py-2">Timestamp</th>
                  <th className="text-left px-4 py-2">Event Type</th>
                  <th className="text-left px-4 py-2">Severity</th>
                  <th className="text-left px-4 py-2">User ID</th>
                  <th className="text-left px-4 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {securityEvents.map((event) => (
                  <tr key={event.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">{event.eventType}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-white text-sm font-semibold`}
                        style={{
                          backgroundColor: COLORS[event.severity] || '#6B7280',
                        }}
                      >
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{event.userId}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{event.action || event.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Failed Logins Tab */}
      {activeTab === 'failed-logins' && (
        <div>
          <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">Suspicious IPs</h3>
            {failedLogins.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {failedLogins.slice(0, 4).map((login, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border">
                    <div className="font-mono text-sm text-red-600">{login.ipAddress}</div>
                    <div className="text-xs text-gray-600">
                      {new Date(login.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No failed login attempts in selected period</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2">
                  <th className="text-left px-4 py-2">Timestamp</th>
                  <th className="text-left px-4 py-2">IP Address</th>
                  <th className="text-left px-4 py-2">User Agent</th>
                  <th className="text-left px-4 py-2">User ID</th>
                </tr>
              </thead>
              <tbody>
                {failedLogins.map((login) => (
                  <tr key={login.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">
                      {new Date(login.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono text-red-600">{login.ipAddress}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{login.userAgent}</td>
                    <td className="px-4 py-2 text-sm">{login.userId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && eventTypeData.length > 0 && (
        <div>
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Event Distribution</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={eventTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={fetchSecurityData}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default SecurityEventsDashboard;
