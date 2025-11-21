import { useState } from 'react';
import firebaseService from '../services/firebaseService';

const ConfirmOrderModal = ({ isOpen, order, onClose, onOrderConfirmed }) => {
  // Checkbox states
  const [hasReceivedProduct, setHasReceivedProduct] = useState(false);
  const [isSatisfied, setIsSatisfied] = useState(false);
  
  // Dispute state
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  
  // Ratings (optional, only if satisfied)
  const [satisfactionRating, setSatisfactionRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [conditionRating, setConditionRating] = useState(5);
  const [comments, setComments] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const handleNext = () => {
    setError('');
    
    // If neither checkbox is checked, go to dispute
    if (!hasReceivedProduct && !isSatisfied) {
      setIsDisputing(true);
      return;
    }
    
    // If received but not satisfied, go to dispute
    if (hasReceivedProduct && !isSatisfied) {
      setIsDisputing(true);
      return;
    }
    
    // If both checked, proceed with confirmation
    if (hasReceivedProduct && isSatisfied) {
      handleConfirmOrder();
    }
  };

  const handleConfirmOrder = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('✅ Confirming order with satisfaction...');

      // Release escrow payment to vendor FIRST
      let transactionId = null;
      if (order.escrowAmount && order.vendorId) {
        console.log('💰 Releasing escrow to vendor...');
        transactionId = await firebaseService.wallet.releaseWallet(
          order.id,
          order.vendorId,
          order.totalAmount
        );
        console.log('✅ Escrow released, transaction ID:', transactionId);
      }

      // Then update order status to completed
      await firebaseService.orders.updateStatus(order.id, 'completed', {
        satisfactionConfirmed: true,
        hasReceivedProduct: true,
        isSatisfied: true,
        satisfactionRating,
        deliveryRating,
        conditionRating,
        comments,
        confirmedAt: new Date().toISOString(),
        confirmedBy: 'buyer',
        escrowReleased: true,
        releaseTransactionId: transactionId,
        completedAt: new Date().toISOString()
      });

      // Update vendor's stats
      if (order.vendorId) {
        try {
          const vendorDoc = await firebaseService.users.getById(order.vendorId);
          if (vendorDoc && vendorDoc.vendorProfile) {
            const currentStats = vendorDoc.vendorProfile;
            const completedOrders = (currentStats.completedOrders || 0) + 1;
            const totalRevenue = (currentStats.totalRevenue || 0) + order.totalAmount;
            const currentRating = currentStats.rating || 0;
            const reviewCount = currentStats.reviewCount || 0;
            
            const newAverageRating = ((currentRating * reviewCount) + satisfactionRating) / (reviewCount + 1);
            
            await firebaseService.users.update(order.vendorId, {
              'vendorProfile.completedOrders': completedOrders,
              'vendorProfile.totalRevenue': totalRevenue,
              'vendorProfile.rating': newAverageRating,
              'vendorProfile.reviewCount': reviewCount + 1
            });
          }
        } catch (vendorError) {
          console.warn('Failed to update vendor stats:', vendorError);
        }
      }

      // Create notification for vendor
      await firebaseService.notifications.create({
        userId: order.vendorId,
        type: 'order_completed',
        title: 'Order Completed',
        message: `Order #${order.id.slice(-8)} has been confirmed by the buyer. Payment released!`,
        orderId: order.id,
        read: false
      });

      alert('Order confirmed! Payment has been released to the vendor.');
      onOrderConfirmed(order);
      resetAndClose();
      
    } catch (error) {
      console.error('Error confirming order:', error);
      setError('Failed to confirm order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!disputeReason.trim()) {
      setError('Please describe the issue with your order.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('⚠️ Creating dispute...');

      // Create dispute
      const disputeData = {
        orderId: order.id,
        buyerId: order.buyerId,
        vendorId: order.vendorId,
        buyerName: order.buyerName || 'Buyer',
        vendorName: order.vendorName || 'Vendor',
        orderAmount: order.totalAmount,
        escrowAmount: order.escrowAmount || order.totalAmount,
        hasReceivedProduct,
        isSatisfied,
        reason: disputeReason,
        status: 'pending_admin_review',
        createdAt: new Date(),
        createdBy: order.buyerId
      };

      const disputeRef = await firebaseService.disputes.create(disputeData);

      // Update order status to disputed
      await firebaseService.orders.updateStatus(order.id, 'disputed', {
        disputeId: disputeRef.id,
        disputeReason,
        disputedAt: new Date().toISOString(),
        disputedBy: 'buyer',
        hasReceivedProduct,
        isSatisfied,
        escrowStatus: 'held_for_dispute'
      });

      // Notify admin
      const admins = await firebaseService.users.getAdmins();
      for (const admin of admins) {
        await firebaseService.notifications.create({
          userId: admin.uid,
          type: 'dispute_created',
          title: 'New Dispute Requires Review',
          message: `Order #${order.id.slice(-8)} has been disputed by the buyer. Escrow funds are on hold.`,
          orderId: order.id,
          disputeId: disputeRef.id,
          read: false
        });
      }

      // Notify vendor
      await firebaseService.notifications.create({
        userId: order.vendorId,
        type: 'order_disputed',
        title: 'Order Disputed',
        message: `Order #${order.id.slice(-8)} has been disputed by the buyer. Admin will review.`,
        orderId: order.id,
        disputeId: disputeRef.id,
        read: false
      });

      alert('Dispute created. An admin will review your case and contact all parties.');
      onOrderConfirmed(order);
      resetAndClose();
      
    } catch (error) {
      console.error('Error creating dispute:', error);
      setError('Failed to create dispute. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setHasReceivedProduct(false);
    setIsSatisfied(false);
    setIsDisputing(false);
    setDisputeReason('');
    setSatisfactionRating(5);
    setDeliveryRating(5);
    setConditionRating(5);
    setComments('');
    setError('');
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isDisputing ? '⚠️ Report Issue' : '✅ Confirm Order'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Order #{order.id?.slice(-8)}
              </p>
            </div>
            <button
              onClick={resetAndClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* Main Content */}
          {!isDisputing ? (
            // Confirmation Flow
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Order Summary</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-600">Amount:</span> <span className="font-semibold">₦{order.totalAmount?.toLocaleString()}</span></p>
                  <p><span className="text-gray-600">Vendor:</span> {order.vendorName || 'Vendor'}</p>
                  {order.items && (
                    <p><span className="text-gray-600">Items:</span> {order.items.length} item(s)</p>
                  )}
                </div>
              </div>

              {/* Critical Checkboxes */}
              <div className="space-y-4">
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasReceivedProduct}
                      onChange={(e) => setHasReceivedProduct(e.target.checked)}
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        ✓ I have received the product(s)
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Critical:</strong> Check this box to confirm you have physically received all items in your order.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSatisfied}
                      onChange={(e) => setIsSatisfied(e.target.checked)}
                      className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        ✓ I am satisfied with the product(s)
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Check this box to confirm the product meets your expectations and matches the description.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Optional Ratings (shown if both checked) */}
              {hasReceivedProduct && isSatisfied && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-gray-900">Rate Your Experience (Optional)</h3>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Overall Satisfaction: {satisfactionRating}/5
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={satisfactionRating}
                      onChange={(e) => setSatisfactionRating(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Delivery Rating: {deliveryRating}/5
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={deliveryRating}
                      onChange={(e) => setDeliveryRating(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Product Condition: {conditionRating}/5
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={conditionRating}
                      onChange={(e) => setConditionRating(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Comments (Optional)
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows="3"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Share your experience with this order..."
                    />
                  </div>
                </div>
              )}

              {/* Warning Box */}
              {(!hasReceivedProduct || !isSatisfied) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <span className="text-yellow-600 text-xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900">
                        {!hasReceivedProduct && !isSatisfied 
                          ? 'Have you received your order?'
                          : !hasReceivedProduct
                          ? 'Please confirm you have received the product before proceeding.'
                          : 'Is there an issue with your order?'}
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        {!hasReceivedProduct 
                          ? 'If you haven\'t received your order, clicking Next will create a dispute.'
                          : 'If you\'re not satisfied, clicking Next will allow you to report the issue.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetAndClose}
                  disabled={loading}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium disabled:opacity-50 ${
                    hasReceivedProduct && isSatisfied
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'
                  }`}
                >
                  {loading ? 'Processing...' : hasReceivedProduct && isSatisfied ? '✅ Confirm & Release Payment' : '⚠️ Report Issue'}
                </button>
              </div>

              {/* Info Footer */}
              {hasReceivedProduct && isSatisfied && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    💡 By confirming, you agree that you have received the order and are satisfied with it. The escrow payment of ₦{order.totalAmount?.toLocaleString()} will be released to the vendor.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Dispute Flow
            <div className="space-y-6">
              {/* Dispute Info */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="text-red-600 text-xl">⚠️</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-1">Creating a Dispute</h3>
                    <p className="text-sm text-red-700">
                      The escrow payment of ₦{order.totalAmount?.toLocaleString()} will be held until an admin reviews your case. Please describe the issue in detail.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Received Product:</span>
                  <span className={hasReceivedProduct ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {hasReceivedProduct ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Satisfied:</span>
                  <span className={isSatisfied ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {isSatisfied ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
              </div>

              {/* Dispute Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe the Issue <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows="6"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Please provide detailed information about the issue with your order. Include:
- What specifically is wrong?
- Do you have photos of the issue?
- What resolution are you seeking?

An admin will review your case and contact all parties."
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsDisputing(false)}
                  disabled={loading}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreateDispute}
                  disabled={loading || !disputeReason.trim()}
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Creating Dispute...' : '📢 Submit Dispute'}
                </button>
              </div>

              {/* Dispute Process Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">What happens next?</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>1. Your dispute will be sent to an admin for review</li>
                  <li>2. The vendor will be notified of the dispute</li>
                  <li>3. Escrow funds remain held until resolution</li>
                  <li>4. Admin will contact all parties to gather information</li>
                  <li>5. Admin will decide: Release to vendor OR Refund to buyer</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmOrderModal;
