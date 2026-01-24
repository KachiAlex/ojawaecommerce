import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const DisputeResolutionDashboard = ({ isOpen, onClose, dispute, onDisputeResolved }) => {
  const { currentUser } = useAuth();
  const [resolution, setResolution] = useState({
    decision: '',
    reasoning: '',
    refundAmount: 0,
    vendorPenalty: 0,
    buyerPenalty: 0,
    additionalNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (dispute) {
      setResolution({
        decision: dispute.resolution?.decision || '',
        reasoning: dispute.resolution?.reasoning || '',
        refundAmount: dispute.resolution?.refundAmount || 0,
        vendorPenalty: dispute.resolution?.vendorPenalty || 0,
        buyerPenalty: dispute.resolution?.buyerPenalty || 0,
        additionalNotes: dispute.resolution?.additionalNotes || ''
      });
    }
  }, [dispute]);

  const handleInputChange = (field, value) => {
    setResolution(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolution.decision || !resolution.reasoning.trim()) {
      setError('Please provide a decision and reasoning');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resolutionData = {
        ...resolution,
        resolvedBy: currentUser.uid,
        resolvedAt: new Date(),
        status: 'resolved'
      };

      // Update dispute with resolution
      await firebaseService.disputes.resolveDispute(dispute.id, resolutionData);

      // Process financial resolution
      if (resolution.decision === 'buyer_wins') {
        const refundAmount = Number(resolution.refundAmount || dispute.totalAmount || 0);
        if (refundAmount > 0) {
          await firebaseService.wallet.refundEscrow(
            dispute.orderId,
            dispute.buyerId,
            refundAmount
          );
        }
      } else if (resolution.decision === 'partial_buyer') {
        const refundAmount = Number(resolution.refundAmount || 0);
        if (refundAmount > 0) {
          await firebaseService.wallet.refundEscrow(
            dispute.orderId,
            dispute.buyerId,
            refundAmount
          );
        }

        const remainingAmount = Math.max(0, Number(dispute.totalAmount || 0) - refundAmount);
        if (remainingAmount > 0) {
          await firebaseService.payouts.createOrderPayoutRequest({
            id: dispute.orderId,
            vendorId: dispute.vendorId,
            buyerId: dispute.buyerId,
            totalAmount: remainingAmount,
            pricingBreakdown: {
              subtotal: remainingAmount,
              breakdown: {
                subtotal: { amount: remainingAmount }
              }
            }
          }, { vendorAmount: remainingAmount });
        }
      } else if (resolution.decision === 'vendor_wins') {
        await firebaseService.payouts.createOrderPayoutRequest({
          id: dispute.orderId,
          vendorId: dispute.vendorId,
          buyerId: dispute.buyerId,
          totalAmount: dispute.totalAmount,
          pricingBreakdown: {
            subtotal: dispute.totalAmount,
            breakdown: {
              subtotal: { amount: dispute.totalAmount }
            }
          }
        }, { vendorAmount: dispute.totalAmount });
      }

      // Apply penalties if any
      if (resolution.vendorPenalty > 0) {
        await firebaseService.wallet.applyPenalty(
          dispute.vendorId,
          resolution.vendorPenalty,
          'Dispute resolution penalty'
        );
      }

      if (resolution.buyerPenalty > 0) {
        await firebaseService.wallet.applyPenalty(
          dispute.buyerId,
          resolution.buyerPenalty,
          'Dispute resolution penalty'
        );
      }

      // Create notifications
      await firebaseService.notifications.create({
        userId: dispute.buyerId,
        title: 'Dispute Resolved',
        message: `Your dispute for order #${dispute.orderId} has been resolved. ${resolution.decision === 'buyer_wins' ? 'You will receive a refund.' : 'The vendor has been found in favor.'}`,
        type: 'info',
        icon: '⚖️',
        orderId: dispute.orderId,
        read: false
      });

      await firebaseService.notifications.create({
        userId: dispute.vendorId,
        title: 'Dispute Resolved',
        message: `The dispute for order #${dispute.orderId} has been resolved. ${resolution.decision === 'vendor_wins' ? 'You have been found in favor.' : 'The buyer has been found in favor.'}`,
        type: 'info',
        icon: '⚖️',
        orderId: dispute.orderId,
        read: false
      });

      onDisputeResolved();
      onClose();

    } catch (error) {
      console.error('Error resolving dispute:', error);
      setError(`Failed to resolve dispute: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !dispute) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Dispute Resolution</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dispute Information */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Dispute Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dispute ID:</span>
                      <span className="font-medium">#{dispute.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span className="font-medium">#{dispute.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">₦{dispute.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reason:</span>
                      <span className="font-medium capitalize">{dispute.reason.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Urgency:</span>
                      <span className={`font-medium ${
                        dispute.urgency === 'high' ? 'text-red-600' :
                        dispute.urgency === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {dispute.urgency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {new Date(dispute.createdAt?.toDate?.() || dispute.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Buyer's Description</h3>
                  <p className="text-sm text-gray-700">{dispute.description}</p>
                </div>

                {dispute.evidence && dispute.evidence.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Evidence</h3>
                    <div className="space-y-2">
                      {dispute.evidence.map((evidence, index) => (
                        <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">
                              {evidence.type.startsWith('image/') ? '🖼️' : 
                               evidence.type.startsWith('video/') ? '🎥' : '📄'}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{evidence.name}</p>
                              <p className="text-xs text-gray-500">
                                {(evidence.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <a
                            href={evidence.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resolution Form */}
              <div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Decision *
                    </label>
                    <select
                      value={resolution.decision}
                      onChange={(e) => handleInputChange('decision', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="">Select decision</option>
                      <option value="buyer_wins">Buyer wins - Full refund</option>
                      <option value="partial_buyer">Partial buyer win - Partial refund</option>
                      <option value="vendor_wins">Vendor wins - No refund</option>
                      <option value="no_fault">No fault - Split costs</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reasoning *
                    </label>
                    <textarea
                      value={resolution.reasoning}
                      onChange={(e) => handleInputChange('reasoning', e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Explain your decision and reasoning..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refund Amount (₦)
                    </label>
                    <input
                      type="number"
                      value={resolution.refundAmount}
                      onChange={(e) => handleInputChange('refundAmount', parseFloat(e.target.value) || 0)}
                      min="0"
                      max={dispute.totalAmount}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vendor Penalty (₦)
                      </label>
                      <input
                        type="number"
                        value={resolution.vendorPenalty}
                        onChange={(e) => handleInputChange('vendorPenalty', parseFloat(e.target.value) || 0)}
                        min="0"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Buyer Penalty (₦)
                      </label>
                      <input
                        type="number"
                        value={resolution.buyerPenalty}
                        onChange={(e) => handleInputChange('buyerPenalty', parseFloat(e.target.value) || 0)}
                        min="0"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={resolution.additionalNotes}
                      onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Any additional notes or instructions..."
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Resolving...' : 'Resolve Dispute'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisputeResolutionDashboard;
