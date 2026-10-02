import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const OrderTrackingModal = ({ trackingId, orderId, order, isOpen, onClose }) => {
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && (trackingId || orderId || order?.id || order?.trackingNumber)) {
      fetchTrackingInfo();
    }
  }, [isOpen, trackingId, orderId, order]);

  const fetchTrackingInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const id = trackingId || orderId || order?.trackingNumber || order?.id || order?.orderNumber;
      if (!id) {
        setError('No tracking ID available for this order.');
        return;
      }
      const result = await apiService.orders.getByTrackingId(id);
      setTrackingInfo(result);
      if (!result) {
        setError('No tracking information found for this order.');
      }
    } catch (err) {
      console.error('Error fetching tracking info:', err);
      setError(err?.message || 'Failed to load tracking information.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'shipped':
      case 'in_transit':
      case 'out_for_delivery':
      case 'picked_up':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
      case 'processing':
        return 'bg-amber-100 text-amber-800';
      case 'pending':
        return 'bg-slate-100 text-slate-700';
      case 'cancelled':
      case 'failed':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
  const currentStep = trackingInfo ? statusSteps.indexOf(trackingInfo.status?.toLowerCase()) : -1;
  const displayOrder = trackingInfo || order;
  const timeline = trackingInfo?.timeline || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative min-h-screen flex items-start justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Order Tracking</h3>
              {displayOrder?.trackingNumber && (
                <p className="text-sm font-mono text-blue-600 mt-0.5">{displayOrder.trackingNumber}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600">Loading tracking information...</span>
              </div>
            )}

            {error && !loading && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            {!loading && !error && trackingInfo && (
              <>
                {/* Status Badge */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Status</p>
                    <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(trackingInfo.status)}`}>
                      {formatStatus(trackingInfo.status)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Order Number</p>
                    <p className="text-sm font-mono text-gray-700">{trackingInfo.orderNumber || 'N/A'}</p>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Delivery Progress</h4>
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 rounded-full" />
                    <div
                      className="absolute top-4 left-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: currentStep >= 0 ? `${(currentStep / (statusSteps.length - 1)) * 100}%` : '0%' }}
                    />
                    {statusSteps.map((step, idx) => (
                      <div key={step} className="relative flex flex-col items-center z-10">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                            idx <= currentStep && currentStep >= 0
                              ? 'bg-gradient-to-br from-blue-500 to-emerald-500 border-blue-400 text-white'
                              : 'bg-white border-gray-300 text-gray-400'
                          }`}
                        >
                          {idx < currentStep ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-xs font-bold">{idx + 1}</span>
                          )}
                        </div>
                        <span className={`mt-1.5 text-[10px] font-medium text-center ${idx <= currentStep && currentStep >= 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                          {formatStatus(step)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Timeline */}
                {timeline.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Status History</h4>
                    <div className="space-y-3">
                      {timeline.map((entry, idx) => (
                        <div key={idx} className="flex gap-3 items-start">
                          <div className="flex flex-col items-center">
                            <div className={`w-2.5 h-2.5 rounded-full ${idx === timeline.length - 1 ? 'bg-emerald-500' : 'bg-blue-400'}`} />
                            {idx < timeline.length - 1 && <div className="w-px h-6 bg-gray-200" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                                {formatStatus(entry.status)}
                              </span>
                              <span className="text-xs text-gray-400">{formatDate(entry.timestamp)}</span>
                            </div>
                            {entry.notes && <p className="text-sm text-gray-600 mt-0.5">{entry.notes}</p>}
                            {entry.location && <p className="text-xs text-gray-400 mt-0.5">📍 {entry.location}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order & Delivery Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Info</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total:</span>
                        <span className="font-semibold text-emerald-600">₦{Number(trackingInfo.totalAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Payment:</span>
                        <span className="capitalize text-gray-700">{trackingInfo.paymentStatus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Order Date:</span>
                        <span className="text-gray-700">{formatDate(trackingInfo.createdAt)}</span>
                      </div>
                      {trackingInfo.estimatedDelivery && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Est. Delivery:</span>
                          <span className="text-gray-700">{formatDate(trackingInfo.estimatedDelivery)}</span>
                        </div>
                      )}
                      {trackingInfo.actualDelivery && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Delivered:</span>
                          <span className="text-emerald-600">{formatDate(trackingInfo.actualDelivery)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Customer & Delivery</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Customer:</span>
                        <span className="text-gray-700">{trackingInfo.buyerName || 'Customer'}</span>
                      </div>
                      {trackingInfo.shippingAddress?.city && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">City:</span>
                          <span className="text-gray-700">{trackingInfo.shippingAddress.city}</span>
                        </div>
                      )}
                      {trackingInfo.shippingAddress?.state && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">State:</span>
                          <span className="text-gray-700">{trackingInfo.shippingAddress.state}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items */}
                {trackingInfo.items && trackingInfo.items.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Items ({trackingInfo.items.length})</h4>
                    <div className="space-y-2">
                      {trackingInfo.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          {item.productImage ? (
                            <img src={item.productImage} alt={item.productName} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} × ₦{Number(item.unitPrice || 0).toLocaleString()}</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-700">₦{Number(item.totalPrice || 0).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!loading && !error && !trackingInfo && (
              <div className="text-center py-12">
                <p className="text-gray-500">No tracking information available.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 flex justify-end rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingModal;
