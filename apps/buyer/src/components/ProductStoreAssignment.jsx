import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { storeService, productTrackingService } from '../services/trackingService';
import firebaseService from '../services/firebaseService';

const ProductStoreAssignment = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedStore, setSelectedStore] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch vendor's stores
      const userStores = await storeService.getStoresByVendor(currentUser.uid);
      setStores(userStores);

      // Fetch vendor's products
      const vendorProducts = await firebaseService.productService.getByVendor(currentUser.uid);
      setProducts(vendorProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignProduct = async () => {
    if (!selectedProduct || !selectedStore) {
      alert('Please select both a product and a store');
      return;
    }

    try {
      setLoading(true);
      
      await storeService.assignProductToStore(selectedProduct.id, selectedStore);
      
      // Update local state
      setProducts(prev => prev.map(product => 
        product.id === selectedProduct.id 
          ? { ...product, storeId: selectedStore }
          : product
      ));
      
      setShowAssignmentModal(false);
      setSelectedProduct(null);
      setSelectedStore('');
      
      alert('Product assigned to store successfully!');
    } catch (error) {
      console.error('Error assigning product:', error);
      alert('Error assigning product to store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromStore = async (productId) => {
    if (!window.confirm('Are you sure you want to remove this product from its current store?')) {
      return;
    }

    try {
      setLoading(true);
      
      // Update product to remove store assignment
      const productRef = firebaseService.db.collection('products').doc(productId);
      await productRef.update({
        storeId: null,
        updatedAt: new Date()
      });
      
      // Update local state
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, storeId: null }
          : product
      ));
      
      alert('Product removed from store successfully!');
    } catch (error) {
      console.error('Error removing product from store:', error);
      alert('Error removing product from store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStoreName = (storeId) => {
    const store = stores.find(s => s.storeId === storeId);
    return store ? store.name : 'Unknown Store';
  };

  const openAssignmentModal = (product) => {
    setSelectedProduct(product);
    setShowAssignmentModal(true);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading products and stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Store Assignment</h1>
        <p className="text-gray-600">
          Assign your products to specific stores for better organization and tracking.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Products</p>
              <p className="text-2xl font-bold text-blue-900">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Assigned Products</p>
              <p className="text-2xl font-bold text-green-900">
                {products.filter(p => p.storeId).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Total Stores</p>
              <p className="text-2xl font-bold text-purple-900">{stores.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Products</h2>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Yet</h3>
            <p className="text-gray-600">Create some products first to assign them to stores</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {products.map((product) => (
              <div key={product.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-600">
                        Price: ₦{product.price?.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600">
                        Track: {product.trackingNumber || 'No tracking number'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Store Assignment Status */}
                    <div className="text-right">
                      {product.storeId ? (
                        <div>
                          <p className="text-sm font-medium text-green-600">
                            In Store: {getStoreName(product.storeId)}
                          </p>
                          <button
                            onClick={() => handleRemoveFromStore(product.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove from Store
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not assigned to any store</p>
                      )}
                    </div>

                    {/* Assignment Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openAssignmentModal(product)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        {product.storeId ? 'Reassign' : 'Assign to Store'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Assign Product to Store
              </h3>
              
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-2">Selected Product:</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-600">
                    Price: ₦{selectedProduct.price?.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600">
                    Tracking: {selectedProduct.trackingNumber || 'No tracking number'}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Store:
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a store...</option>
                  {stores.map((store) => (
                    <option key={store.storeId} value={store.storeId}>
                      {store.name} ({store.storeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setSelectedProduct(null);
                    setSelectedStore('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignProduct}
                  disabled={loading || !selectedStore}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Assigning...' : 'Assign to Store'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductStoreAssignment;
