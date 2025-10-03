import { useState, useEffect } from 'react';
import firebaseService from '../services/firebaseService';

const OrderTransactionModal = ({ order, isOpen, onClose }) => {
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      fetchTransactionDetails();
    }
  }, [isOpen, order]);

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching transaction details for order:', order.id);
      // Fetch wallet transactions related to this order
      const transactions = await firebaseService.wallet.getOrderTransactions(order.id);
      console.log('Transaction details fetched:', transactions);
      setTransactionDetails(transactions);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      setTransactionDetails([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_wallet_funding': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending_wallet_funding': return 'Funds transferred to escrow, vendor has been notified, awaiting delivery';
      case 'shipped': return 'Product has been shipped and is in transit';
      case 'delivered': return 'Product has been delivered, awaiting your confirmation';
      case 'completed': return 'Order completed, funds released to vendor';
      case 'cancelled': return 'Order was cancelled, funds refunded';
      default: return 'Order is being processed';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Order #{order.id.slice(-8)} - Transaction Details
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
          {/* Order Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Order Status</h4>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-sm text-gray-600">
                {getStatusMessage(order.status)}
              </span>
            </div>
          </div>

          {/* Transaction Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Transaction Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-medium">Wallet Escrow</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-medium">₦{order.totalAmount?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Escrow Status</p>
                <p className="font-medium text-blue-600">
                  {order.escrowStatus === 'funds_transferred_to_escrow' ? 'Funds Held in Escrow' : 'Processing'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Order Date</p>
                <p className="font-medium">
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          {order.deliveryOption && (
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Delivery Information</h4>
              <div className="space-y-2">
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
                    <p className="text-sm text-gray-600">Tracking ID</p>
                    <p className="font-medium">{order.trackingId}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Transaction History</h4>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading transaction details...</p>
              </div>
            ) : transactionDetails && transactionDetails.length > 0 ? (
              <div className="space-y-3">
                {transactionDetails.map((transaction, index) => (
                  <div key={transaction.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{transaction.description || 'Transaction'}</p>
                      <p className="text-sm text-gray-600">
                        {transaction.createdAt ? 
                          (transaction.createdAt.toDate ? 
                            transaction.createdAt.toDate().toLocaleString() : 
                            new Date(transaction.createdAt).toLocaleString()
                          ) : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}₦{(transaction.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Balance: ₦{(transaction.balanceAfter || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-gray-400 text-4xl mb-2">📊</div>
                <p className="text-gray-600">No transaction details available</p>
                <p className="text-sm text-gray-500 mt-1">
                  Transaction history will appear here once payments are processed
                </p>
              </div>
            )}
          </div>

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
                Confirm Delivery & Satisfaction
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

export default OrderTransactionModal;
