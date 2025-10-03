import React, { useState, useEffect } from 'react';
import { useRealTimeProducts } from '../hooks/useRealTimeProducts';

const RealTimeStockMonitor = () => {
  const { products, loading, error } = useRealTimeProducts();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (products.length > 0) {
      setLastUpdate(new Date());
    }
  }, [products]);

  const formatTime = (date) => {
    return date.toLocaleTimeString();
  };

  const getStockStatus = (product) => {
    if (product.inStock === false || (product.stock || 0) <= 0) {
      return { status: 'out', color: 'text-red-600', bg: 'bg-red-50', label: 'Out of Stock' };
    } else if ((product.stock || 0) <= 5) {
      return { status: 'low', color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Low Stock' };
    } else {
      return { status: 'in', color: 'text-green-600', bg: 'bg-green-50', label: 'In Stock' };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Real-Time Stock Monitor</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Real-Time Stock Monitor</h3>
        <div className="text-red-600 bg-red-50 p-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Real-Time Stock Monitor</h3>
        <div className="text-sm text-gray-500">
          Last updated: {formatTime(lastUpdate)}
        </div>
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          <span className="text-sm text-blue-800">
            Connected to real-time database - {products.length} products monitored
          </span>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📦</div>
          <p className="text-gray-600">No products found in database</p>
          <p className="text-sm text-gray-500 mt-1">
            Products will appear here in real-time as vendors add them
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {products.slice(0, 10).map((product) => {
            const stockStatus = getStockStatus(product);
            return (
              <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-600">
                    {product.vendorName || 'Unknown Vendor'} • {product.category || 'Uncategorized'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {product.currency ? `${product.currency.replace(/\d+/, (product.price || 0).toLocaleString())}` : `₦${(product.price || 0).toLocaleString()}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      Stock: {product.stock || 0}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                    {stockStatus.label}
                  </div>
                </div>
              </div>
            );
          })}
          
          {products.length > 10 && (
            <div className="text-center py-2 text-sm text-gray-500">
              Showing first 10 of {products.length} products
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        <p>💡 This monitor shows real-time stock updates. When vendors update their products, changes appear here immediately.</p>
      </div>
    </div>
  );
};

export default RealTimeStockMonitor;
