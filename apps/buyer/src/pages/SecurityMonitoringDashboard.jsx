import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Security Monitoring Dashboard Component
 * Admin-only dashboard for monitoring security events and logs
 */
const SecurityMonitoringDashboard = () => {
  const { currentUser, getIdToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [securityData, setSecurityData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [criticalErrors, setCriticalErrors] = useState([]);
  const [timeRange, setTimeRange] = useState('24h'); // 24h, 7d, 30d
  const [selectedFilter, setSelectedFilter] = useState('all');

  const API_BASE_URL = process.env.REACT_APP_FUNCTIONS_URL || 'http://localhost:8080';

  // Fetch security monitoring data
  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const token = await getIdToken();

      const [auditRes, errorRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/security/audit-logs?days=${daysFromRange(timeRange)}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/admin/security/critical-errors?days=${daysFromRange(timeRange)}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/admin/security/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }

      if (errorRes.ok) {
        const data = await errorRes.json();
        setCriticalErrors(data.errors || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setSecurityData(data);
      }
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysFromRange = (range) => {
    switch (range) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      default: return 1;
    }
  };

  useEffect(() => {
    fetchSecurityData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchSecurityData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeRange]);

  if (!currentUser) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-300">Not authenticated</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-teal-300">Loading security data...</p>
      </div>
    );
  }

  // Risk level color mapping
  const getRiskColor = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-900/40 border-red-700/60 text-red-300';
      case 'high':
        return 'bg-orange-900/40 border-orange-700/60 text-orange-300';
      case 'medium':
        return 'bg-yellow-900/40 border-yellow-700/60 text-yellow-300';
      case 'low':
        return 'bg-green-900/40 border-green-700/60 text-green-300';
      default:
        return 'bg-teal-900/40 border-teal-700/60 text-teal-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-amber-300">Security Monitoring</h1>
        <div className="flex space-x-2">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                timeRange === range
                  ? 'bg-amber-400 text-black'
                  : 'bg-teal-700/50 text-teal-300 hover:bg-teal-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Security Summary Cards */}
      {securityData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Incidents */}
          <div className={`border rounded-lg p-6 ${getRiskColor('critical')}`}>
            <p className="text-sm font-medium">Total Incidents</p>
            <p className="text-3xl font-bold mt-2">{securityData.totalIncidents || 0}</p>
            <p className="text-xs mt-2 opacity-75">This period</p>
          </div>

          {/* Failed Auth Attempts */}
          <div className={`border rounded-lg p-6 ${getRiskColor('high')}`}>
            <p className="text-sm font-medium">Failed Auth</p>
            <p className="text-3xl font-bold mt-2">{securityData.failedAuthAttempts || 0}</p>
            <p className="text-xs mt-2 opacity-75">Lockouts: {securityData.accountLockouts || 0}</p>
          </div>

          {/* Rate Limit Violations */}
          <div className={`border rounded-lg p-6 ${getRiskColor('medium')}`}>
            <p className="text-sm font-medium">Rate Limit Hits</p>
            <p className="text-3xl font-bold mt-2">{securityData.rateLimitViolations || 0}</p>
            <p className="text-xs mt-2 opacity-75">IPs blocked: {securityData.blockedIPs || 0}</p>
          </div>

          {/* Data Access Anomalies */}
          <div className={`border rounded-lg p-6 ${getRiskColor('low')}`}>
            <p className="text-sm font-medium">Data Anomalies</p>
            <p className="text-3xl font-bold mt-2">{securityData.dataAccessAnomalies || 0}</p>
            <p className="text-xs mt-2 opacity-75">Flagged for review</p>
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      {securityData?.riskLevel && (
        <div className={`border rounded-lg p-6 ${getRiskColor(securityData.riskLevel)}`}>
          <h2 className="text-xl font-bold mb-4">Current Risk Level</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Assessment:</span> {securityData.riskLevel.toUpperCase()}</p>
            <p><span className="font-medium">Recommendations:</span></p>
            <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
              {securityData.recommendations?.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              )) || <li>Monitor logs regularly</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Critical Errors */}
      {criticalErrors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700/60 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-300 mb-4">Critical Errors</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {criticalErrors.map((error, idx) => (
              <div key={idx} className="bg-red-800/20 border border-red-700/40 rounded p-3 text-sm">
                <p className="text-red-300 font-medium">{error.message}</p>
                <p className="text-red-300/60 text-xs mt-1">
                  {new Date(error.timestamp).toLocaleString()}
                </p>
                {error.context && (
                  <p className="text-red-300/50 text-xs mt-1">
                    {JSON.stringify(error.context).substring(0, 100)}...
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Logs */}
      <div className="bg-teal-900/30 border border-teal-700/60 rounded-lg p-6">
        <h2 className="text-xl font-bold text-amber-300 mb-4">Admin Audit Trail</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-700/40">
                <th className="text-left py-2 px-2 text-teal-300 font-medium">Time</th>
                <th className="text-left py-2 px-2 text-teal-300 font-medium">Event</th>
                <th className="text-left py-2 px-2 text-teal-300 font-medium">Admin</th>
                <th className="text-left py-2 px-2 text-teal-300 font-medium">Details</th>
                <th className="text-left py-2 px-2 text-teal-300 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.slice(0, 20).map((log, idx) => (
                <tr key={idx} className="border-b border-teal-700/20 hover:bg-teal-800/20">
                  <td className="py-2 px-2 text-teal-300/80 text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-amber-300/80 font-medium">{log.event}</td>
                  <td className="py-2 px-2 text-teal-300/80">{log.adminId?.substring(0, 8) || 'System'}</td>
                  <td className="py-2 px-2 text-teal-300/60 text-xs">
                    {log.details ? JSON.stringify(log.details).substring(0, 50) : '-'}
                  </td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.severity === 'critical' ? 'bg-red-900 text-red-300' :
                      log.severity === 'warn' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-green-900 text-green-300'
                    }`}>
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-Time Alerts */}
      <div className="bg-orange-900/30 border border-orange-700/60 rounded-lg p-6">
        <h2 className="text-xl font-bold text-orange-300 mb-4">Active Threats & Alerts</h2>
        <div className="space-y-2">
          {securityData?.activeThreats?.length > 0 ? (
            securityData.activeThreats.map((threat, idx) => (
              <div key={idx} className="bg-orange-800/20 border border-orange-700/40 rounded p-3 flex justify-between">
                <div>
                  <p className="text-orange-300 font-medium">{threat.type}</p>
                  <p className="text-orange-300/60 text-xs">{threat.description}</p>
                </div>
                <span className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium">
                  {threat.count} active
                </span>
              </div>
            ))
          ) : (
            <p className="text-green-300">No active threats detected</p>
          )}
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="bg-blue-900/30 border border-blue-700/60 rounded-lg p-6">
        <h2 className="text-xl font-bold text-blue-300 mb-4">Recommended Actions</h2>
        <ul className="space-y-2">
          <li className="flex items-start space-x-3">
            <span className="text-blue-400 font-bold mt-1">1.</span>
            <span className="text-blue-200">Review recent failed authentication attempts for suspicious patterns</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="text-blue-400 font-bold mt-1">2.</span>
            <span className="text-blue-200">Check rate limit violations for potential DDoS attacks</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="text-blue-400 font-bold mt-1">3.</span>
            <span className="text-blue-200">Verify critical errors are not related to security issues</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="text-blue-400 font-bold mt-1">4.</span>
            <span className="text-blue-200">Archive old logs monthly for compliance and long-term storage</span>
          </li>
          <li className="flex items-start space-x-3">
            <span className="text-blue-400 font-bold mt-1">5.</span>
            <span className="text-blue-200">Review and rotate secrets on schedule (90-day cycle)</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SecurityMonitoringDashboard;
