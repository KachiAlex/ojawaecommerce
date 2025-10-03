import React, { useState } from 'react';
import { useRealTimeProducts } from '../hooks/useRealTimeProducts';
import RealTimeStockMonitor from '../components/RealTimeStockMonitor';

const StockSyncTest = () => {
  const { products, loading, error } = useRealTimeProducts();
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleStockUpdate = async (productId, newStock) => {
    try {
      // This would normally update the product in the database
      // For demo purposes, we'll just log the action
      console.log(`Updating stock for product ${productId} to ${newStock}`);
      alert(`Stock update simulated: Product ${productId} stock set to ${newStock}`);
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock');
    }
  };

  const getStockStatusColor = (product) => {
    if (product.inStock === false || (product.stock || 0) <= 0) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if ((product.stock || 0) <= 5) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Real-Time Stock Synchronization Test</h1>
        <p className="text-gray-600 mb-6">
          This page demonstrates real-time synchronization between vendor and buyer dashboards. 
          When vendors update product stock, changes should appear here immediately.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to Test:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>Open the vendor dashboard in another tab/window</li>
            <li>Update a product's stock quantity</li>
            <li>Watch this page update in real-time</li>
            <li>Verify that stock status badges change accordingly</li>
          </ol>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Products List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Live Products ({products.length})</h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-red-600 bg-red-50 p-4 rounded">
              Error: {error}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📦</div>
              <p className="text-gray-600">No products found</p>
              <p className="text-sm text-gray-500 mt-1">
                Add products in the vendor dashboard to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedProduct?.id === product.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-600">
                        {product.vendorName || 'Unknown Vendor'} • {product.category || 'Uncategorized'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Price: {product.currency ? `${product.currency.replace(/\d+/, (product.price || 0).toLocaleString())}` : `₦${(product.price || 0).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStockStatusColor(product)}`}>
                        Stock: {product.stock || 0}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {product.inStock === false || (product.stock || 0) <= 0 ? 'Out of Stock' : 'Available'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Product Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Product Details</h2>
          
          {selectedProduct ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-600">ID: {selectedProduct.id}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vendor</label>
                  <p className="text-sm text-gray-900">{selectedProduct.vendorName || 'Unknown'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="text-sm text-gray-900">{selectedProduct.category || 'Uncategorized'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <p className="text-sm text-gray-900">
                    {selectedProduct.currency ? `${selectedProduct.currency.replace(/\d+/, (selectedProduct.price || 0).toLocaleString())}` : `₦${(selectedProduct.price || 0).toLocaleString()}`}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                  <p className="text-sm text-gray-900">{selectedProduct.stock || 0}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Stock Status</label>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStockStatusColor(selectedProduct)}`}>
                  {selectedProduct.inStock === false || (selectedProduct.stock || 0) <= 0 ? 'Out of Stock' : 'In Stock'}
                </div>
              </div>

              {selectedProduct.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900">{selectedProduct.description}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Simulate Stock Updates</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStockUpdate(selectedProduct.id, 0)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Set Out of Stock
                  </button>
                  <button
                    onClick={() => handleStockUpdate(selectedProduct.id, 5)}
                    className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
                  >
                    Set Low Stock (5)
                  </button>
                  <button
                    onClick={() => handleStockUpdate(selectedProduct.id, 50)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                  >
                    Set High Stock (50)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">👆</div>
              <p className="text-gray-600">Select a product to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Monitor Component */}
      <div className="mt-8">
        <RealTimeStockMonitor />
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Testing Instructions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Vendor Side:</h4>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
              <li>Go to vendor dashboard</li>
              <li>Find a product and edit its stock quantity</li>
              <li>Save the changes</li>
              <li>Watch this page update automatically</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Expected Results:</h4>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>Stock quantities update immediately</li>
              <li>Status badges change color (red/yellow/green)</li>
              <li>Out of stock labels appear/disappear</li>
              <li>Featured products section updates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockSyncTest;
