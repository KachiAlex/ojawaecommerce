import React, { useState } from 'react';
import firebaseService from '../services/firebaseService';

const TrackingInterface = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter an Order ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Search for order using Order ID as tracking ID
      const order = await firebaseService.orders.getByTrackingId(searchTerm.trim());
      
      if (order) {
        setSearchResults({ order });
      } else {
        setError('No order found with this Order ID');
        setSearchResults(null);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setError('Error searching for Order ID. Please try again.');
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
        return 'text-emerald-200 bg-emerald-900/40 border border-emerald-500/60';
      case 'pending':
      case 'processing':
        return 'text-amber-200 bg-amber-900/40 border border-amber-500/60';
      case 'cancelled':
      case 'failed':
        return 'text-rose-200 bg-rose-900/40 border border-rose-500/60';
      default:
        return 'text-teal-200 bg-slate-900/60 border border-slate-700/60';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent mb-2">
          Track Your Order
        </h1>
        <p className="text-teal-200">
          Enter your Order ID to track your order status and delivery progress with secure logistics.
        </p>
      </div>

      {/* Search Interface */}
      <div className="bg-slate-950 rounded-lg shadow-lg border border-teal-900/70 p-6 mb-8">
        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your Order ID (e.g., abc123def456)"
              className="w-full px-4 py-3 border border-teal-700 rounded-lg bg-slate-900 text-teal-50 placeholder:text-teal-400/70 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-lg hover:from-amber-300 hover:to-amber-400 transition-colors disabled:opacity-50 shadow-lg"
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
          <div className="mt-4 p-4 bg-rose-900/40 border border-rose-500/60 rounded-lg">
            <p className="text-rose-100">{error}</p>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults && searchResults.order && (
        <div className="space-y-6">
          {/* Order Results */}
            <div className="bg-slate-950 rounded-lg shadow-lg p-6 border border-teal-900/70">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-teal-900/60 rounded-lg mr-4 border border-teal-500/60">
                <svg className="w-8 h-8 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              <div>
                <h2 className="text-2xl font-semibold text-teal-50">Order Found</h2>
                <p className="text-teal-300/80">Order ID: {searchResults.order.id}</p>
              </div>
            </div>
            
            {/* Order Status */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-teal-100">Order Status</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(searchResults.order.status)}`}>
                  {searchResults.order.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-teal-100 mb-3">Order Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-teal-300/80">Order ID:</span>
                      <span className="font-mono text-amber-300">{searchResults.order.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-300/80">Total Amount:</span>
                      <span className="font-semibold text-emerald-300">
                        ₦{searchResults.order.totalAmount?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-300/80">Payment Status:</span>
                      <span className="capitalize text-teal-100">{searchResults.order.paymentStatus || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-300/80">Created:</span>
                      <span className="text-teal-100">{formatDate(searchResults.order.createdAt)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-teal-100 mb-3">Customer Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-teal-300/80">Customer:</span>
                      <span className="text-teal-100">{searchResults.order.buyerName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-300/80">Email:</span>
                      <span className="text-sm text-teal-100">{searchResults.order.buyerEmail || 'N/A'}</span>
                    </div>
                    {searchResults.order.deliveryAddress && (
                    <div className="flex justify-between">
                        <span className="text-teal-300/80">Delivery Address:</span>
                        <span className="text-sm text-teal-100">{searchResults.order.deliveryAddress}</span>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Order Items */}
            {searchResults.order.items && searchResults.order.items.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-teal-100 mb-3">Order Items</h4>
                <div className="space-y-2">
                  {searchResults.order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-slate-900/70 rounded-lg border border-slate-700/60">
                <div>
                        <span className="font-medium text-teal-50">{item.name}</span>
                        <span className="text-teal-300/80 ml-2">x{item.quantity}</span>
                </div>
                      <span className="font-semibold text-amber-300">₦{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

            {/* Delivery Information */}
            {searchResults.order.logisticsCompany && (
              <div className="border-t border-slate-800 pt-4">
                <h4 className="font-medium text-teal-100 mb-3">Delivery Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                    <span className="text-teal-300/80">Logistics Company:</span>
                    <span>{searchResults.order.logisticsCompany}</span>
                    </div>
                  {searchResults.order.estimatedDelivery && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Delivery:</span>
                      <span>{searchResults.order.estimatedDelivery} days</span>
                    </div>
                  )}
              </div>
            </div>
          )}
              </div>
            </div>
          )}
    </div>
  );
};

export default TrackingInterface;
