import React from "react";

/**
 * VendorAnalyticsTab - Lightweight Placeholder
 */
const VendorAnalyticsTab = ({ timeRange = "month" }) => {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Vendor Analytics</h3>
        <p className="text-gray-600">Real-time vendor performance metrics</p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Total Vendors</p>
            <p className="text-xl font-bold text-blue-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Active</p>
            <p className="text-xl font-bold text-green-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Revenue</p>
            <p className="text-xl font-bold text-purple-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Avg Rating</p>
            <p className="text-xl font-bold text-amber-900">—</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsTab;
