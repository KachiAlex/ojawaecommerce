import { useState } from 'react';
import { useRealTimeProducts } from '../hooks/useRealTimeProducts';

const ProductDebug = () => {
  const { products, loading, error } = useRealTimeProducts();
  const [selectedProduct, setSelectedProduct] = useState(null);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-2">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Products</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Product Data Debug</h2>
          <p className="text-gray-600 mt-1">Debugging product data structure and display issues</p>
        </div>

        <div className="p-6">
          {/* Summary */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Total Products</h4>
                <p className="text-2xl font-bold text-blue-600">{products.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Products with Images</h4>
                <p className="text-2xl font-bold text-green-600">
                  {products.filter(p => p.images && p.images.length > 0).length}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900">Products with Prices</h4>
                <p className="text-2xl font-bold text-yellow-600">
                  {products.filter(p => p.price && p.price > 0).length}
                </p>
              </div>
            </div>
          </div>

          {/* Product List */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product List</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.slice(0, 12).map((product) => (
                <div 
                  key={product.id} 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedProduct?.id === product.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-product.png';
                        }}
                      />
                    ) : product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-product.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-4xl">📦</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    by {product.vendorName || product.vendor || 'Unknown Vendor'}
                  </p>
                  
                  {/* Price */}
                  <div className="text-lg font-bold text-gray-900 mb-2">
                    {product.price ? (
                      product.currency ? (
                        `${product.currency.split(' ')[0] || '₦'}${Number(product.price).toLocaleString()}`
                      ) : (
                        `₦${Number(product.price).toLocaleString()}`
                      )
                    ) : (
                      'Price TBD'
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className="text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      product.inStock === false || (product.stock || 0) <= 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {product.inStock === false || (product.stock || 0) <= 0
                        ? 'Out of Stock'
                        : `In Stock (${product.stock || 0})`
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Product Details */}
          {selectedProduct && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selected Product: {selectedProduct.name}
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Image */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Product Image</h4>
                  <div className="aspect-square bg-white border rounded-lg overflow-hidden">
                    {selectedProduct.images && selectedProduct.images.length > 0 ? (
                      <img
                        src={selectedProduct.images[0]}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-product.png';
                        }}
                      />
                    ) : selectedProduct.image ? (
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-product.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-6xl">📦</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Data */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Raw Product Data</h4>
                  <div className="bg-white border rounded-lg p-4 overflow-auto max-h-96">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedProduct, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Key Fields Summary */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-gray-900">Price</h5>
                  <p className="text-sm text-gray-600">{selectedProduct.price || 'Not set'}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-gray-900">Currency</h5>
                  <p className="text-sm text-gray-600">{selectedProduct.currency || 'Not set'}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-gray-900">Images Field</h5>
                  <p className="text-sm text-gray-600">
                    {selectedProduct.images ? 
                      `Array with ${selectedProduct.images.length} items` : 
                      'Not set'
                    }
                  </p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-gray-900">Image Field</h5>
                  <p className="text-sm text-gray-600">{selectedProduct.image || 'Not set'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDebug;
