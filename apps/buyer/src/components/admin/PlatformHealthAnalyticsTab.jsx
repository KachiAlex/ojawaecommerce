import React from "react";

/**
 * PlatformHealthAnalyticsTab - Lightweight Placeholder
 */
const PlatformHealthAnalyticsTab = ({ timeRange = "month" }) => {
  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">⚡</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Platform Health</h3>
        <p className="text-gray-600">Real-time system metrics and performance</p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Uptime</p>
            <p className="text-xl font-bold text-purple-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">API Latency</p>
            <p className="text-xl font-bold text-purple-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Error Rate</p>
            <p className="text-xl font-bold text-purple-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Active Users</p>
            <p className="text-xl font-bold text-purple-900">—</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformHealthAnalyticsTab;
