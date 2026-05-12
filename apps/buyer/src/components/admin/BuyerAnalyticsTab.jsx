import React from "react";

/**
 * BuyerAnalyticsTab - Lightweight Placeholder
 */
const BuyerAnalyticsTab = ({ timeRange = "month" }) => {
  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">👥</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Buyer Analytics</h3>
        <p className="text-gray-600">Real-time buyer engagement metrics</p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Total Buyers</p>
            <p className="text-xl font-bold text-green-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Active</p>
            <p className="text-xl font-bold text-green-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Retention</p>
            <p className="text-xl font-bold text-green-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Engagement</p>
            <p className="text-xl font-bold text-green-900">—</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerAnalyticsTab;
