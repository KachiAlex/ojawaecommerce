import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AdminAnalyticsDashboard = () => {
  const { currentUser, getIdToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Analytics data
  const [revenue, setRevenue] = useState(null);
  const [payments, setPayments] = useState(null);
  const [vendors, setVendors] = useState(null);
  const [events, setEvents] = useState(null);
  const [auditLogs, setAuditLogs] = useState(null);
  
  // UI controls
  const [period, setPeriod] = useState('30d');
  const [eventType, setEventType] = useState('subscription.created');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const API_BASE_URL = process.env.REACT_APP_FUNCTIONS_URL || 'http://localhost:8080';

  // Fetch analytics summary
  const fetchAnalyticsSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getIdToken();
      const response = await fetch(`${API_BASE_URL}/admin/analytics/summary?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setRevenue(data.summary.revenue);
      setPayments(data.summary.payments);
      setVendors(data.summary.vendors);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch events
  const fetchEvents = async () => {
    try {
      const token = await getIdToken();
      const params = new URLSearchParams({
        eventType,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        limit: 50
      });
      
      const response = await fetch(`${API_BASE_URL}/admin/analytics/events?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      setEvents(data.events);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      const token = await getIdToken();
      const response = await fetch(`${API_BASE_URL}/admin/analytics/audit?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      
      const data = await response.json();
      setAuditLogs(data.logs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAnalyticsSummary();
    fetchAuditLogs();
  }, [period]);

  // Event filters
  useEffect(() => {
    if (eventType) {
      fetchEvents();
    }
  }, [eventType, startDate, endDate]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-teal-300">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-teal-900/30 border border-teal-700/60 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <label className="text-teal-300 font-medium">Time Period:</label>
          <div className="flex space-x-2">
            {['7d', '30d', '60d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  period === p
                    ? 'bg-amber-400 text-black'
                    : 'bg-teal-700/50 text-teal-300 hover:bg-teal-700'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '60d' ? '60 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/60 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-300/80 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-green-400 mt-2">
                ₦{revenue?.totalRevenue?.toLocaleString() || '0'}
              </p>
              <p className="text-green-300/60 text-xs mt-2">
                {revenue?.transactionCount || 0} transactions
              </p>
            </div>
            <span className="text-4xl">💰</span>
          </div>
        </div>

        {/* Payment Health Card */}
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/60 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-300/80 text-sm font-medium">Payment Success Rate</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">
                {payments?.successRate ? `${(payments.successRate * 100).toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-blue-300/60 text-xs mt-2">
                {payments?.successCount || 0} successful / {payments?.totalProcessed || 0} total
              </p>
            </div>
            <span className="text-4xl">✓</span>
          </div>
        </div>

        {/* Vendor Activation Card */}
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/60 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-300/80 text-sm font-medium">Vendor Activation Rate</p>
              <p className="text-3xl font-bold text-purple-400 mt-2">
                {vendors?.activationRate ? `${(vendors.activationRate * 100).toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-purple-300/60 text-xs mt-2">
                {vendors?.approvedCount || 0} approved / {vendors?.registeredCount || 0} registered
              </p>
            </div>
            <span className="text-4xl">👥</span>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown by Plan */}
      {revenue?.byPlan && Object.keys(revenue.byPlan).length > 0 && (
        <div className="bg-teal-900/30 border border-teal-700/60 rounded-lg p-6">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Revenue by Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(revenue.byPlan).map(([plan, amount]) => (
              <div key={plan} className="bg-teal-800/40 border border-teal-700/40 rounded p-4">
                <p className="text-teal-300 text-sm capitalize font-medium">{plan}</p>
                <p className="text-2xl font-bold text-amber-400 mt-2">
                  ₦{amount?.toLocaleString() || '0'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Breakdown by Billing Cycle */}
      {revenue?.byCycle && Object.keys(revenue.byCycle).length > 0 && (
        <div className="bg-teal-900/30 border border-teal-700/60 rounded-lg p-6">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Revenue by Billing Cycle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(revenue.byCycle).map(([cycle, amount]) => (
              <div key={cycle} className="bg-teal-800/40 border border-teal-700/40 rounded p-4 flex justify-between items-center">
                <p className="text-teal-300 capitalize font-medium">{cycle} Billing</p>
                <p className="text-2xl font-bold text-amber-400">
                  ₦{amount?.toLocaleString() || '0'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Trends */}
      {vendors && (
        <div className="bg-teal-900/30 border border-teal-700/60 rounded-lg p-6">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Vendor Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-teal-800/40 border border-teal-700/40 rounded p-4">
              <p className="text-teal-300 text-sm">Registered Vendors</p>
              <p className="text-2xl font-bold text-amber-400 mt-2">{vendors.registeredCount || 0}</p>
            </div>
            <div className="bg-teal-800/40 border border-teal-700/40 rounded p-4">
              <p className="text-teal-300 text-sm">Approved Vendors</p>
              <p className="text-2xl font-bold text-green-400 mt-2">{vendors.approvedCount || 0}</p>
            </div>
            <div className="bg-teal-800/40 border border-teal-700/40 rounded p-4">
              <p className="text-teal-300 text-sm">Suspended Vendors</p>
              <p className="text-2xl font-bold text-red-400 mt-2">{vendors.suspendedCount || 0}</p>
            </div>
            <div className="bg-teal-800/40 border border-teal-700/40 rounded p-4">
              <p className="text-teal-300 text-sm">Popular Plans</p>
              <div className="mt-2">
                {vendors.topPlans && Object.entries(vendors.topPlans).slice(0, 2).map(([plan, count]) => (
                  <p key={plan} className="text-xs text-amber-300">
                    {plan}: {count}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Failure Analysis */}
      {payments?.failureReasons && Object.keys(payments.failureReasons).length > 0 && (
        <div className="bg-teal-900/30 border border-teal-700/60 rounded-lg p-6">
          <h3 className="text-xl font-bold text-amber-300 mb-4">Payment Failure Reasons</h3>
          <div className="space-y-2">
            {Object.entries(payments.failureReasons).map(([reason, count]) => (
              <div key={reason} className="flex justify-between items-center py-2 border-b border-teal-700/40">
                <p className="text-teal-300 capitalize">{reason.replace(/_/g, ' ')}</p>
                <span className="bg-red-900/40 text-red-300 px-3 py-1 rounded text-sm font-medium">{count}</span>
              </div>
            ))}
            {payments.refundAmount > 0 && (
              <div className="flex justify-between items-center py-2 border-t border-teal-700/40 mt-4">
                <p className="text-red-300 font-medium">Total Refunded</p>
                <p className="text-red-400 font-bold">₦{payments.refundAmount?.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events Filter and Display */}
      <div className="bg-teal-900/30 border border-teal-700/60 rounded-lg p-6">
        <h3 className="text-xl font-bold text-amber-300 mb-4">Platform Events</h3>
        
        <div className="mb-4 space-y-3">
          <div>
            <label className="text-teal-300 text-sm font-medium">Event Type:</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-teal-800/40 border border-teal-700/60 rounded text-teal-300"
            >
              <option value="subscription.created">Subscription Created</option>
              <option value="subscription.renewed">Subscription Renewed</option>
              <option value="subscription.upgraded">Subscription Upgraded</option>
              <option value="payment.success">Payment Success</option>
              <option value="payment.failed">Payment Failed</option>
              <option value="vendor.registered">Vendor Registered</option>
              <option value="vendor.approved">Vendor Approved</option>
              <option value="admin.action">Admin Action</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-teal-300 text-sm font-medium">Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-teal-800/40 border border-teal-700/60 rounded text-teal-300"
              />
            </div>
            <div>
              <label className="text-teal-300 text-sm font-medium">End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-teal-800/40 border border-teal-700/60 rounded text-teal-300"
              />
            </div>
          </div>
        </div>

        {events && events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-teal-700/40">
                  <th className="text-left py-2 px-2 text-teal-300 font-medium">Timestamp</th>
                  <th className="text-left py-2 px-2 text-teal-300 font-medium">User</th>
                  <th className="text-left py-2 px-2 text-teal-300 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, idx) => (
                  <tr key={idx} className="border-b border-teal-700/20 hover:bg-teal-800/20">
                    <td className="py-2 px-2 text-teal-300/80 text-xs">
                      {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-teal-300/80 text-xs">{event.userId?.substring(0, 8) || 'System'}</td>
                    <td className="py-2 px-2 text-amber-300/80 text-xs">
                      {JSON.stringify(event.data || {}).substring(0, 50)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-teal-300/60 text-center py-8">No events found for the selected filters.</p>
        )}
      </div>

      {/* Audit Log */}
      <div className="bg-teal-900/30 border border-teal-700/60 rounded-lg p-6">
        <h3 className="text-xl font-bold text-amber-300 mb-4">Admin Audit Log</h3>
        
        {auditLogs && auditLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-teal-700/40">
                  <th className="text-left py-2 px-2 text-teal-300 font-medium">Time</th>
                  <th className="text-left py-2 px-2 text-teal-300 font-medium">Admin</th>
                  <th className="text-left py-2 px-2 text-teal-300 font-medium">Action</th>
                  <th className="text-left py-2 px-2 text-teal-300 font-medium">Target</th>
                  <th className="text-left py-2 px-2 text-teal-300 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, idx) => (
                  <tr key={idx} className="border-b border-teal-700/20 hover:bg-teal-800/20">
                    <td className="py-2 px-2 text-teal-300/80 text-xs">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-teal-300/80 text-xs">{log.adminId?.substring(0, 8) || 'Unknown'}</td>
                    <td className="py-2 px-2 text-amber-300/80 text-xs font-medium">{log.action}</td>
                    <td className="py-2 px-2 text-teal-300/80 text-xs">
                      {log.targetType}: {log.targetId?.substring(0, 8)}
                    </td>
                    <td className="py-2 px-2 text-teal-300/80 text-xs">{log.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-teal-300/60 text-center py-8">No audit logs found.</p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/60 rounded-lg p-4">
          <p className="text-red-300">
            <span className="font-bold">Error:</span> {error}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminAnalyticsDashboard;
