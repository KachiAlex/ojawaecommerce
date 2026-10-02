import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../services/apiService';

const TrackingInterface = () => {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (term) => {
    const query = (term || searchTerm).trim();
    if (!query) {
      setError('Please enter a tracking number or order ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const order = await apiService.orders.getByTrackingId(query);
      
      if (order) {
        setSearchResults({ order });
      } else {
        setError('No order found with this tracking number');
        setSearchResults(null);
      }
    } catch (err) {
      console.error('Error searching:', err);
      setError(err?.message || 'Error searching for order. Please try again.');
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search if ?id= query param is present
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setSearchTerm(id);
      handleSearch(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp.toDate) return timestamp.toDate().toLocaleString();
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return 'text-emerald-200 bg-emerald-900/40 border border-emerald-500/60';
      case 'shipped':
      case 'in_transit':
      case 'out_for_delivery':
      case 'picked_up':
        return 'text-blue-200 bg-blue-900/40 border border-blue-500/60';
      case 'confirmed':
      case 'processing':
        return 'text-amber-200 bg-amber-900/40 border border-amber-500/60';
      case 'pending':
        return 'text-slate-200 bg-slate-800/60 border border-slate-600/60';
      case 'cancelled':
      case 'failed':
        return 'text-rose-200 bg-rose-900/40 border border-rose-500/60';
      default:
        return 'text-teal-200 bg-slate-900/60 border border-slate-700/60';
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Status step progression for visual timeline
  const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
  const getCurrentStepIndex = (status) => {
    const idx = statusSteps.indexOf(status?.toLowerCase());
    return idx >= 0 ? idx : 0;
  };

  const order = searchResults?.order;
  const currentStep = order ? getCurrentStepIndex(order.status) : 0;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent mb-2">
            Track Your Order
          </h1>
          <p className="text-teal-200/80 text-sm">
            Enter your tracking number or order ID to see real-time delivery status.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-slate-900 rounded-2xl shadow-xl border border-teal-900/50 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter tracking number (e.g., TRK-1234567890-ABC123) or order ID"
                className="w-full px-4 py-3 border border-teal-700/50 rounded-xl bg-slate-800 text-teal-50 placeholder:text-teal-400/50 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50 shadow-lg font-semibold whitespace-nowrap"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-950 mr-2"></div>
                  Tracking...
                </div>
              ) : (
                'Track Order'
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-rose-900/30 border border-rose-500/40 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-rose-200 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {order && (
          <div className="space-y-4">
            {/* Tracking Number Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl border border-teal-900/50 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-teal-400 mb-1">Tracking Number</p>
                  <p className="text-2xl font-mono font-bold text-amber-300">{order.trackingNumber || order.id}</p>
                  <p className="text-sm text-teal-300/70 mt-1">Order: {order.orderNumber || order.id}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs uppercase tracking-wider text-teal-400 mb-1">Current Status</p>
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                    {formatStatus(order.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Status Progress */}
            <div className="bg-slate-900 rounded-2xl shadow-xl border border-teal-900/50 p-6">
              <h3 className="text-lg font-semibold text-teal-100 mb-6">Delivery Progress</h3>
              <div className="flex items-center justify-between relative">
                {/* Progress line */}
                <div className="absolute top-5 left-0 right-0 h-1 bg-slate-700 rounded-full" />
                <div
                  className="absolute top-5 left-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }}
                />
                {statusSteps.map((step, idx) => (
                  <div key={step} className="relative flex flex-col items-center z-10">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        idx <= currentStep
                          ? 'bg-gradient-to-br from-teal-500 to-emerald-500 border-teal-400 text-white'
                          : 'bg-slate-800 border-slate-600 text-slate-500'
                      }`}
                    >
                      {idx < currentStep ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${idx <= currentStep ? 'text-teal-200' : 'text-slate-500'}`}>
                      {formatStatus(step)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Timeline */}
            {order.timeline && order.timeline.length > 0 && (
              <div className="bg-slate-900 rounded-2xl shadow-xl border border-teal-900/50 p-6">
                <h3 className="text-lg font-semibold text-teal-100 mb-4">Status History</h3>
                <div className="space-y-3">
                  {order.timeline.map((entry, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${idx === order.timeline.length - 1 ? 'bg-emerald-400' : 'bg-teal-600'}`} />
                        {idx < order.timeline.length - 1 && <div className="w-0.5 h-8 bg-slate-700" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                            {formatStatus(entry.status)}
                          </span>
                          <span className="text-xs text-teal-400/70">{formatDate(entry.timestamp)}</span>
                        </div>
                        {entry.notes && <p className="text-sm text-teal-300/80 mt-1">{entry.notes}</p>}
                        {entry.location && <p className="text-xs text-teal-400/60 mt-0.5">📍 {entry.location}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Info */}
              <div className="bg-slate-900 rounded-2xl shadow-xl border border-teal-900/50 p-6">
                <h3 className="text-lg font-semibold text-teal-100 mb-4">Order Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-teal-300/70">Tracking Number:</span>
                    <span className="font-mono text-amber-300 text-xs">{order.trackingNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-300/70">Order Number:</span>
                    <span className="font-mono text-teal-100 text-xs">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-300/70">Total Amount:</span>
                    <span className="font-semibold text-emerald-300">
                      ₦{Number(order.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-300/70">Payment Status:</span>
                    <span className="capitalize text-teal-100">{order.paymentStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-300/70">Order Date:</span>
                    <span className="text-teal-100">{formatDate(order.createdAt)}</span>
                  </div>
                  {order.estimatedDelivery && (
                    <div className="flex justify-between">
                      <span className="text-teal-300/70">Est. Delivery:</span>
                      <span className="text-teal-100">{formatDate(order.estimatedDelivery)}</span>
                    </div>
                  )}
                  {order.actualDelivery && (
                    <div className="flex justify-between">
                      <span className="text-teal-300/70">Delivered On:</span>
                      <span className="text-emerald-300">{formatDate(order.actualDelivery)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer & Delivery Info */}
              <div className="bg-slate-900 rounded-2xl shadow-xl border border-teal-900/50 p-6">
                <h3 className="text-lg font-semibold text-teal-100 mb-4">Customer & Delivery</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-teal-300/70">Customer:</span>
                    <span className="text-teal-100">{order.buyerName || 'Customer'}</span>
                  </div>
                  {order.shippingAddress && (
                    <>
                      {order.shippingAddress.city && (
                        <div className="flex justify-between">
                          <span className="text-teal-300/70">City:</span>
                          <span className="text-teal-100">{order.shippingAddress.city}</span>
                        </div>
                      )}
                      {order.shippingAddress.state && (
                        <div className="flex justify-between">
                          <span className="text-teal-300/70">State:</span>
                          <span className="text-teal-100">{order.shippingAddress.state}</span>
                        </div>
                      )}
                      {order.shippingAddress.country && (
                        <div className="flex justify-between">
                          <span className="text-teal-300/70">Country:</span>
                          <span className="text-teal-100">{order.shippingAddress.country}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <div className="bg-slate-900 rounded-2xl shadow-xl border border-teal-900/50 p-6">
                <h3 className="text-lg font-semibold text-teal-100 mb-4">Items in This Shipment</h3>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-teal-50 truncate">{item.productName}</p>
                        <p className="text-xs text-teal-400/70">Qty: {item.quantity} × ₦{Number(item.unitPrice || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-amber-300">₦{Number(item.totalPrice || 0).toLocaleString()}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${getStatusColor(item.status)}`}>
                          {formatStatus(item.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state when no search yet */}
        {!order && !loading && !error && (
          <div className="bg-slate-900/50 rounded-2xl border border-teal-900/30 p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800 rounded-full mb-4">
              <svg className="w-10 h-10 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-teal-300/70 text-sm">Enter a tracking number above to track your order.</p>
            <p className="text-teal-400/50 text-xs mt-2">Your tracking number was included in your order confirmation.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingInterface;
