import { useState } from 'react';
import firebaseService from '../services/firebaseService';

const OrderSatisfactionModal = ({ order, isOpen, onClose, onSatisfactionConfirmed }) => {
  const [satisfactionData, setSatisfactionData] = useState({
    isSatisfied: null,
    rating: 5,
    feedback: '',
    createDispute: false
  });
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (satisfactionData.isSatisfied === null) {
      alert('Please indicate if you are satisfied with your order');
      return;
    }

    if (satisfactionData.isSatisfied && satisfactionData.rating < 1) {
      alert('Please provide a rating');
      return;
    }

    if (!satisfactionData.isSatisfied && !satisfactionData.feedback.trim()) {
      alert('Please provide feedback explaining why you are not satisfied');
      return;
    }

    setLoading(true);

    try {
      await onSatisfactionConfirmed(satisfactionData);
    } catch (error) {
      console.error('Error confirming satisfaction:', error);
      alert('Failed to confirm satisfaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSatisfactionChange = (isSatisfied) => {
    setSatisfactionData(prev => ({
      ...prev,
      isSatisfied,
      createDispute: !isSatisfied
    }));
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Confirm Delivery & Satisfaction - Order #{order.id.slice(-8)}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Warning about escrow release */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-red-600 text-xl mr-3">⚠️</span>
              <div>
                <h4 className="font-medium text-red-900">Important: Escrow Release</h4>
                <p className="text-sm text-red-800 mt-1">
                  By confirming delivery and satisfaction, you are releasing the escrow funds to the vendor. 
                  This action is permanent and cannot be reversed. Please ensure you are completely satisfied 
                  with your order before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium">₦{order.totalAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">{order.items?.length || 0} item(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Method:</span>
                <span className="font-medium">
                  {order.deliveryOption === 'pickup' ? 'Pickup' : 'Home Delivery'}
                </span>
              </div>
            </div>
          </div>

          {/* Satisfaction Question */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Are you satisfied with your order?</h4>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="satisfaction"
                  value="yes"
                  checked={satisfactionData.isSatisfied === true}
                  onChange={() => handleSatisfactionChange(true)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-3 text-gray-700">Yes, I am satisfied with my order</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="satisfaction"
                  value="no"
                  checked={satisfactionData.isSatisfied === false}
                  onChange={() => handleSatisfactionChange(false)}
                  className="text-red-600 focus:ring-red-500"
                />
                <span className="ml-3 text-gray-700">No, I am not satisfied with my order</span>
              </label>
            </div>
          </div>

          {/* Rating (if satisfied) */}
          {satisfactionData.isSatisfied === true && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Rate your experience (1-5 stars)
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSatisfactionData(prev => ({ ...prev, rating: star }))}
                    className={`text-2xl ${
                      star <= satisfactionData.rating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400 transition-colors`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {satisfactionData.isSatisfied === true ? 'Additional Feedback (Optional)' : 'Please explain why you are not satisfied'}
            </label>
            <textarea
              rows="4"
              value={satisfactionData.feedback}
              onChange={(e) => setSatisfactionData(prev => ({ ...prev, feedback: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder={
                satisfactionData.isSatisfied === true 
                  ? "Share your experience or any additional comments..."
                  : "Please describe the issues with your order..."
              }
            />
          </div>

          {/* Dispute Option */}
          {satisfactionData.isSatisfied === false && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="createDispute"
                  checked={satisfactionData.createDispute}
                  onChange={(e) => setSatisfactionData(prev => ({ ...prev, createDispute: e.target.checked }))}
                  className="text-yellow-600 focus:ring-yellow-500 mt-1"
                />
                <label htmlFor="createDispute" className="ml-3">
                  <span className="text-yellow-900 font-medium">Create a dispute</span>
                  <p className="text-sm text-yellow-800 mt-1">
                    If you create a dispute, the escrow funds will be held until the dispute is resolved. 
                    Our support team will review your case and work to find a fair solution.
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                satisfactionData.isSatisfied === true
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Processing...' : 
               satisfactionData.isSatisfied === true ? 
               'Confirm Satisfaction & Release Funds' : 
               'Submit Feedback & Create Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderSatisfactionModal;