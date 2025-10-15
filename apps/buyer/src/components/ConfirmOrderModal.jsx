import { useState } from 'react';
import firebaseService from '../services/firebaseService';

const ConfirmOrderModal = ({ isOpen, order, onClose, onOrderConfirmed }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [satisfactionRating, setSatisfactionRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [conditionRating, setConditionRating] = useState(0);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    { id: 1, title: 'Verify Items', description: 'Check that all items match your order' },
    { id: 2, title: 'Rate Satisfaction', description: 'Rate your overall experience' },
    { id: 3, title: 'Confirm Receipt', description: 'Final confirmation and release payment' }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirmOrder = async () => {
    if (satisfactionRating === 0) {
      setError('Please provide a satisfaction rating before confirming.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Update order status to completed
      await firebaseService.orders.updateStatus(order.id, 'completed', {
        satisfactionConfirmed: true,
        satisfactionRating,
        deliveryRating,
        conditionRating,
        comments,
        confirmedAt: new Date().toISOString(),
        confirmedBy: 'buyer'
      });

      // Release escrow payment to vendor
      if (order.escrowAmount) {
        await firebaseService.escrow.releasePayment(order.id, {
          releasedTo: 'vendor',
          releasedAt: new Date().toISOString(),
          satisfactionRating,
          comments
        });
      }

      // Update vendor's stats
      if (order.vendorId) {
        await firebaseService.vendors.updateStats(order.vendorId, {
          completedOrders: 1,
          totalRevenue: order.totalAmount,
          averageRating: satisfactionRating
        });
      }

      // Close modal and trigger callback
      onOrderConfirmed(order);
      onClose();
      
    } catch (error) {
      console.error('Error confirming order:', error);
      setError('Failed to confirm order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSatisfactionRating(0);
    setDeliveryRating(0);
    setConditionRating(0);
    setComments('');
    setError('');
    onClose();
  };

  if (!isOpen || !order) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 text-xl">📦</span>
                <h4 className="font-medium text-blue-900">Verify Your Items</h4>
              </div>
              <p className="text-sm text-blue-700">
                Please check that all items in your order match what you purchased.
              </p>
            </div>

            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">Order Items:</h5>
              {order.items?.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">📦</span>
                  </div>
                  <div className="flex-1">
                    <h6 className="font-medium text-gray-900">{item.name}</h6>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    <p className="text-sm text-gray-600">
                      {order.currency ? `${order.currency.split(' ')[0]}${item.price?.toFixed(2)}` : `₦${item.price?.toFixed(2)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`item-${index}`}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      defaultChecked
                    />
                    <label htmlFor={`item-${index}`} className="text-sm text-gray-600">
                      Received
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✅</span>
                <p className="text-sm text-green-700">
                  <strong>All items received and in good condition?</strong> Click Next to proceed with rating.
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-600 text-xl">⭐</span>
                <h4 className="font-medium text-yellow-900">Rate Your Experience</h4>
              </div>
              <p className="text-sm text-yellow-700">
                Your feedback helps improve our service and helps other buyers make informed decisions.
              </p>
            </div>

            {/* Overall Satisfaction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Satisfaction *
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSatisfactionRating(rating)}
                    className={`text-2xl ${
                      rating <= satisfactionRating
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    } hover:text-yellow-400 transition-colors`}
                  >
                    ⭐
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {satisfactionRating === 0 ? 'Select rating' : `${satisfactionRating}/5 stars`}
                </span>
              </div>
            </div>

            {/* Delivery Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Experience
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setDeliveryRating(rating)}
                    className={`text-2xl ${
                      rating <= deliveryRating
                        ? 'text-blue-400'
                        : 'text-gray-300'
                    } hover:text-blue-400 transition-colors`}
                  >
                    🚚
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {deliveryRating === 0 ? 'Select rating' : `${deliveryRating}/5 stars`}
                </span>
              </div>
            </div>

            {/* Item Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Condition
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setConditionRating(rating)}
                    className={`text-2xl ${
                      rating <= conditionRating
                        ? 'text-green-400'
                        : 'text-gray-300'
                    } hover:text-green-400 transition-colors`}
                  >
                    📦
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {conditionRating === 0 ? 'Select rating' : `${conditionRating}/5 stars`}
                </span>
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Comments (Optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Share your experience or any feedback..."
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-600 text-xl">🎉</span>
                <h4 className="font-medium text-emerald-900">Ready to Confirm!</h4>
              </div>
              <p className="text-sm text-emerald-700">
                By confirming, you're satisfied with your order and ready to release payment to the vendor.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-3">Order Summary:</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium">#{order.id.slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">
                    {order.currency ? `${order.currency.split(' ')[0]}${order.totalAmount?.toFixed(2)}` : `₦${order.totalAmount?.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Items:</span>
                  <span className="font-medium">{order.items?.length || 0} item(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Rating:</span>
                  <span className="font-medium">
                    {satisfactionRating}/5 ⭐
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-blue-600">💰</span>
                <div>
                  <p className="text-sm font-medium text-blue-900">Payment Release</p>
                  <p className="text-xs text-blue-700">
                    Once confirmed, the escrow payment will be released to {order.vendorName || 'the vendor'}.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">⚠️</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Confirm Order #{order.id.slice(-8)}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    currentStep >= step.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.id}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-emerald-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-emerald-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-6">
            {renderStepContent()}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              {currentStep < steps.length ? (
                <button
                  onClick={handleNext}
                  disabled={currentStep === 2 && satisfactionRating === 0}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleConfirmOrder}
                  disabled={loading}
                  className="px-6 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Confirming...
                    </>
                  ) : (
                    '✅ Confirm & Release Payment'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmOrderModal;
