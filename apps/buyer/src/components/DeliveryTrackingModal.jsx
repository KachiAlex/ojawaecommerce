import { useState, useEffect } from 'react';
import firebaseService from '../services/firebaseService';

const DeliveryTrackingModal = ({ order, isOpen, onClose }) => {
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      fetchTrackingInfo();
    }
  }, [isOpen, order]);

  const fetchTrackingInfo = async () => {
    try {
      setLoading(true);
      // Fetch delivery tracking information
      const tracking = await firebaseService.logistics.getDeliveryTracking(order.trackingId);
      setTrackingInfo(tracking);
    } catch (error) {
      console.error('Error fetching tracking info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  const getTrackingStatus = (status) => {
    switch (status) {
      case 'pending': return { color: 'bg-yellow-100 text-yellow-800', text: 'Awaiting Pickup' };
      case 'picked_up': return { color: 'bg-blue-100 text-blue-800', text: 'Picked Up' };
      case 'in_transit': return { color: 'bg-purple-100 text-purple-800', text: 'In Transit' };
      case 'out_for_delivery': return { color: 'bg-orange-100 text-orange-800', text: 'Out for Delivery' };
      case 'delivered': return { color: 'bg-green-100 text-green-800', text: 'Delivered' };
      default: return { color: 'bg-gray-100 text-gray-800', text: 'Processing' };
    }
  };

  const getTrackingSteps = () => {
    const steps = [
      { key: 'pending', label: 'Order Confirmed', description: 'Vendor has been notified and is preparing your order' },
      { key: 'picked_up', label: 'Picked Up', description: 'Logistics company has picked up your order' },
      { key: 'in_transit', label: 'In Transit', description: 'Your order is on its way to you' },
      { key: 'out_for_delivery', label: 'Out for Delivery', description: 'Your order is out for delivery' },
      { key: 'delivered', label: 'Delivered', description: 'Your order has been delivered' }
    ];

    return steps.map((step, index) => {
      const isCompleted = trackingInfo?.status === step.key || 
        (step.key === 'pending' && order.status === 'pending_wallet_funding');
      const isCurrent = trackingInfo?.status === step.key;
      
      return (
        <div key={step.key} className="flex items-start">
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isCompleted ? 'bg-emerald-600 text-white' : 
            isCurrent ? 'bg-blue-600 text-white' : 
            'bg-gray-300 text-gray-600'
          }`}>
            {isCompleted ? '✓' : index + 1}
          </div>
          <div className="ml-4">
            <h4 className={`font-medium ${
              isCompleted ? 'text-emerald-900' : 
              isCurrent ? 'text-blue-900' : 
              'text-gray-500'
            }`}>
              {step.label}
            </h4>
            <p className={`text-sm ${
              isCompleted ? 'text-emerald-700' : 
              isCurrent ? 'text-blue-700' : 
              'text-gray-500'
            }`}>
              {step.description}
            </p>
            {isCurrent && trackingInfo?.updatedAt && (
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {new Date(trackingInfo.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Track Delivery - Order #{order.id.slice(-8)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Loading tracking information...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  trackingInfo ? getTrackingStatus(trackingInfo.status).color : 'bg-gray-100 text-gray-800'
                }`}>
                  {trackingInfo ? getTrackingStatus(trackingInfo.status).text : 'Processing'}
                </span>
                {trackingInfo?.estimatedDelivery && (
                  <span className="text-sm text-gray-600">
                    Est. delivery: {new Date(trackingInfo.estimatedDelivery).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Delivery Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Delivery Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Delivery Method</p>
                <p className="font-medium">
                  {order.deliveryOption === 'pickup' ? 'Pickup from Vendor' : 'Home Delivery'}
                </p>
              </div>
              {order.deliveryAddress && (
                <div>
                  <p className="text-sm text-gray-600">Delivery Address</p>
                  <p className="font-medium">{order.deliveryAddress}</p>
                </div>
              )}
              {order.logisticsCompany && (
                <div>
                  <p className="text-sm text-gray-600">Logistics Company</p>
                  <p className="font-medium">{order.logisticsCompany}</p>
                </div>
              )}
              {order.trackingId && (
                <div>
                  <p className="text-sm text-gray-600">Internal Tracking ID</p>
                  <p className="font-medium font-mono">{order.trackingId}</p>
                </div>
              )}
              {order.trackingNumber && (
                <div>
                  <p className="text-sm text-gray-600">Carrier Tracking Number</p>
                  <p className="font-medium font-mono">{order.trackingNumber}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    📦 Use this number to track on {order.shippingCarrier || 'carrier'} website
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tracking Timeline */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4">Delivery Progress</h4>
            <div className="space-y-4">
              {getTrackingSteps()}
            </div>
          </div>

          {/* Special Instructions for Pickup */}
          {order.deliveryOption === 'pickup' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-yellow-600 text-xl mr-3">🏪</span>
                <div>
                  <h4 className="font-medium text-yellow-900">Pickup Instructions</h4>
                  <p className="text-sm text-yellow-800 mt-1">
                    Your order is ready for pickup. Please contact the vendor to arrange pickup time and location.
                    You will need to show your order confirmation when picking up.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {order.status === 'delivered' && !order.satisfactionConfirmed && (
              <button
                onClick={() => {
                  // This would trigger the satisfaction modal
                  console.log('Trigger satisfaction confirmation');
                }}
                className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium"
              >
                Confirm Order
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTrackingModal;