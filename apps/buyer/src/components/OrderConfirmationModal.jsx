import React, { useState } from 'react';
import escrowPaymentService from '../services/escrowPaymentService';
import firebaseService from '../services/firebaseService';

const OrderConfirmationModal = ({ open, order, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [deliveryReceived, setDeliveryReceived] = useState(null);
  const [satisfactionLevel, setSatisfactionLevel] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  if (!open || !order) return null;

  const handleConfirmDelivery = () => {
    if (deliveryReceived === null || satisfactionLevel === null) {
      alert('Please answer both questions before proceeding.');
      return;
    }
    setShowWarning(true);
  };

  const handleFinalConfirmation = async () => {
    try {
      setLoading(true);

      // Debug: Log the order object to see its structure
      console.log('Order object being passed to releaseEscrowFunds:', order);
      console.log('Order ID:', order.id);
      console.log('Vendor ID:', order.vendorId);
      console.log('Total Amount:', order.totalAmount);
      console.log('Amount:', order.amount);
      console.log('Using amount value:', order.totalAmount || order.amount);

      // Validate required fields before calling the function
      if (!order.id) {
        throw new Error('Order ID is missing');
      }
      if (!order.vendorId) {
        throw new Error('Vendor ID is missing from order');
      }
      if (!(order.totalAmount || order.amount)) {
        throw new Error('Order amount is missing');
      }

      // Release escrow funds to vendor using HTTP endpoint
      const functionParams = {
        orderId: order.id,
        vendorId: order.vendorId,
        amount: order.totalAmount || order.amount
      };
      
      console.log('Parameters being sent to releaseEscrowFundsHttp:', functionParams);
      
      const response = await fetch('https://us-central1-ojawa-ecommerce.cloudfunctions.net/releaseEscrowFundsHttp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(functionParams)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to release escrow funds');
      }
      
      const result = await response.json();
      console.log('Escrow release result:', result);

      // Update order status to completed
      await firebaseService.orders.updateStatus(order.id, 'completed', {
        completedAt: new Date(),
        completedBy: 'buyer',
        deliveryReceived,
        satisfactionLevel,
        satisfactionFeedback: feedback,
        satisfactionConfirmed: true
      });

      // Create notifications
      try {
        // Notify buyer
        await firebaseService.notifications.createOrderNotification(
          { id: order.id, buyerId: order.buyerId, status: 'completed' },
          'order_completed'
        );

        // Notify vendor
        await firebaseService.notifications.createOrderNotification(
          { id: order.id, vendorId: order.vendorId, status: 'completed' },
          'payment_released'
        );
      } catch (notificationError) {
        console.warn('Failed to send notifications:', notificationError);
      }

      alert('Order confirmed successfully! Payment has been released to the vendor.');
      onConfirm();
      onClose();
    } catch (error) {
      console.error('Error confirming order:', error);
      alert('Failed to confirm order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDeliveryReceived(null);
    setSatisfactionLevel(null);
    setFeedback('');
    setShowWarning(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Confirm Order</h3>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!showWarning ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-blue-600 text-xl mr-3">📦</span>
                  <div>
                    <h4 className="font-medium text-blue-900">Order Confirmation</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Please confirm that you have received your order and are satisfied with the product.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Have you received your product?</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deliveryReceived"
                      value="yes"
                      checked={deliveryReceived === 'yes'}
                      onChange={(e) => setDeliveryReceived(e.target.value)}
                      className="mr-2"
                    />
                    <span>Yes, I have received the product</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deliveryReceived"
                      value="no"
                      checked={deliveryReceived === 'no'}
                      onChange={(e) => setDeliveryReceived(e.target.value)}
                      className="mr-2"
                    />
                    <span>No, I have not received the product</span>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Are you satisfied with the product?</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="satisfactionLevel"
                      value="satisfied"
                      checked={satisfactionLevel === 'satisfied'}
                      onChange={(e) => setSatisfactionLevel(e.target.value)}
                      className="mr-2"
                    />
                    <span>Yes, I am satisfied</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="satisfactionLevel"
                      value="not_satisfied"
                      checked={satisfactionLevel === 'not_satisfied'}
                      onChange={(e) => setSatisfactionLevel(e.target.value)}
                      className="mr-2"
                    />
                    <span>No, I am not satisfied</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback (Optional)
                </label>
                <textarea
                  rows="3"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Share your experience with this order..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelivery}
                  className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-red-600 text-xl mr-3">⚠️</span>
                  <div>
                    <h4 className="font-medium text-red-900">Final Confirmation</h4>
                    <p className="text-sm text-red-800 mt-1">
                      Once you confirm, the payment will be released to the vendor and this action cannot be undone.
                      Are you sure you want to proceed?
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Your Confirmation:</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>• Delivery: {deliveryReceived === 'yes' ? 'Received' : 'Not received'}</p>
                  <p>• Satisfaction: {satisfactionLevel === 'satisfied' ? 'Satisfied' : 'Not satisfied'}</p>
                  {feedback && <p>• Feedback: {feedback}</p>}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowWarning(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200"
                >
                  Go Back
                </button>
                <button
                  onClick={handleFinalConfirmation}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm & Release Payment'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationModal;
