import React, { useState } from 'react';
import { trackingLookupService, walletTrackingService, productTrackingService, storeService, orderTrackingService } from '../services/trackingService';

const TrackingInterface = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a tracking ID or number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const results = await trackingLookupService.searchByTrackingId(searchTerm.trim());
      setSearchResults(results);
      
      // If no results found
      if (!results.wallet && !results.product && !results.store && !results.order) {
        setError('No items found with this tracking ID');
      }
    } catch (error) {
      console.error('Error searching:', error);
      setError('Error searching for tracking ID. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleString(); // Use current system date as fallback
      }
      return date.toLocaleString();
    } catch {
      return new Date().toLocaleString(); // Use current system date as fallback
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'processing':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Track Your Items</h1>
        <p className="text-gray-600">
          Enter any tracking ID to find wallets, products, stores, or orders
        </p>
      </div>

      {/* Search Interface */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter tracking ID (e.g., WLT-2024-ABC123, PRD-2024-XYZ789)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Searching...
              </div>
            ) : (
              'Search'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults && (
        <div className="space-y-6">
          {/* Wallet Results */}
          {searchResults.wallet && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Wallet Found</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Wallet Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Wallet ID:</span>
                      <span className="font-mono text-blue-600">{searchResults.wallet.walletId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">User Type:</span>
                      <span className="capitalize">{searchResults.wallet.userType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Balance:</span>
                      <span className="font-semibold text-green-600">
                        ₦{searchResults.wallet.balance?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Currency:</span>
                      <span>{searchResults.wallet.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(searchResults.wallet.status)}`}>
                        {searchResults.wallet.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Transaction Statistics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Transactions:</span>
                      <span>{searchResults.wallet.totalTransactions || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Credits:</span>
                      <span className="text-green-600">₦{searchResults.wallet.totalCredits?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Debits:</span>
                      <span className="text-red-600">₦{searchResults.wallet.totalDebits?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-sm">{formatDate(searchResults.wallet.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Transaction:</span>
                      <span className="text-sm">{formatDate(searchResults.wallet.lastTransactionAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Results */}
          {searchResults.product && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Product Found</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {searchResults.product.image && (
                    <img
                      src={searchResults.product.image}
                      alt={searchResults.product.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{searchResults.product.name}</h3>
                  <p className="text-gray-600 mb-4">{searchResults.product.description}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Product Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tracking Number:</span>
                      <span className="font-mono text-green-600">{searchResults.product.trackingNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-semibold">₦{searchResults.product.price?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock:</span>
                      <span className={searchResults.product.inStock ? 'text-green-600' : 'text-red-600'}>
                        {searchResults.product.stock || 0} {searchResults.product.inStock ? 'Available' : 'Out of Stock'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="capitalize">{searchResults.product.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Store ID:</span>
                      <span className="font-mono text-blue-600">{searchResults.product.storeId || 'Not assigned'}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Performance Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Views:</span>
                        <span>{searchResults.product.viewCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Orders:</span>
                        <span>{searchResults.product.orderCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="text-green-600">₦{searchResults.product.totalRevenue?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="text-sm">{formatDate(searchResults.product.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Store Results */}
          {searchResults.store && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Store Found</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {searchResults.store.banner && (
                    <img
                      src={searchResults.store.banner}
                      alt={`${searchResults.store.name} banner`}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{searchResults.store.name}</h3>
                  <p className="text-gray-600 mb-4">{searchResults.store.description}</p>
                  <p className="text-sm text-blue-600">
                    <a href={searchResults.store.shareableLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      Visit Store: {searchResults.store.shareableLink}
                    </a>
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Store Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Store ID:</span>
                      <span className="font-mono text-purple-600">{searchResults.store.storeId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="capitalize">{searchResults.store.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rating:</span>
                      <span className="text-yellow-600">{searchResults.store.rating || 0} ⭐</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Review Count:</span>
                      <span>{searchResults.store.reviewCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(searchResults.store.isActive ? 'active' : 'inactive')}`}>
                        {searchResults.store.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Store Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Products:</span>
                        <span>{searchResults.store.totalProducts || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Orders:</span>
                        <span>{searchResults.store.totalOrders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Revenue:</span>
                        <span className="text-green-600">₦{searchResults.store.totalRevenue?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="text-sm">{formatDate(searchResults.store.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Results */}
          {searchResults.order && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-orange-100 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Order Found</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Order Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tracking Number:</span>
                      <span className="font-mono text-orange-600">{searchResults.order.trackingNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-semibold">₦{searchResults.order.totalAmount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(searchResults.order.status)}`}>
                        {searchResults.order.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(searchResults.order.paymentStatus)}`}>
                        {searchResults.order.paymentStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(searchResults.order.shippingStatus)}`}>
                        {searchResults.order.shippingStatus}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Order Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Buyer ID:</span>
                      <span className="font-mono text-sm">{searchResults.order.buyerId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vendor ID:</span>
                      <span className="font-mono text-sm">{searchResults.order.vendorId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items Count:</span>
                      <span>{searchResults.order.items?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-sm">{formatDate(searchResults.order.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="text-sm">{formatDate(searchResults.order.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracking ID Formats</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700 mb-2">Wallet IDs:</p>
            <p className="text-gray-600 font-mono">WLT-YYYY-XXXXXX</p>
            <p className="text-gray-500">Example: WLT-2024-ABC123</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-2">Product Tracking:</p>
            <p className="text-gray-600 font-mono">PRD-YYYY-XXXXXX</p>
            <p className="text-gray-500">Example: PRD-2024-XYZ789</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-2">Store IDs:</p>
            <p className="text-gray-600 font-mono">STO-YYYY-XXXXXX</p>
            <p className="text-gray-500">Example: STO-2024-DEF456</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-2">Order Tracking:</p>
            <p className="text-gray-600 font-mono">ORD-YYYY-XXXXXX</p>
            <p className="text-gray-500">Example: ORD-2024-GHI789</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingInterface;
