import React from "react";

/**
 * TransactionAnalyticsTab - Lightweight Placeholder
 */
const TransactionAnalyticsTab = ({ timeRange = "month" }) => {
  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">💳</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Transaction Analytics</h3>
        <p className="text-gray-600">Real-time transaction and revenue metrics</p>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Total Orders</p>
            <p className="text-xl font-bold text-orange-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Revenue</p>
            <p className="text-xl font-bold text-orange-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Avg Order</p>
            <p className="text-xl font-bold text-orange-900">—</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-xs text-gray-600">Conversion</p>
            <p className="text-xl font-bold text-orange-900">—</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionAnalyticsTab;
