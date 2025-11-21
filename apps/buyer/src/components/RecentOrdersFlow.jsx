import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import firebaseService from '../services/firebaseService';
import { Link } from 'react-router-dom';

const RecentOrdersFlow = () => {
  const { currentUser } = useAuth();
  const { cartItems, clearCart } = useCart();
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchRecentOrders();
    }
  }, [currentUser]);

  const fetchRecentOrders = async () => {
    try {
      setLoading(true);
      const orders = await firebaseService.orders.getByUserPaged({
        userId: currentUser.uid,
        userType: 'buyer',
        pageSize: 5
      });
      setRecentOrders(orders.items || []);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'escrow_funded':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'escrow_funded':
        return 'Order confirmed and payment secured';
      case 'shipped':
        return 'Your order is on the way';
      case 'delivered':
        return 'Order delivered - please confirm receipt';
      case 'completed':
        return 'Order completed successfully';
      case 'cancelled':
        return 'Order was cancelled';
      default:
        return 'Order is being processed';
    }
  };

  const getNextAction = (order) => {
    switch (order.status) {
      case 'escrow_funded':
        return { text: 'Track your order', action: 'track' };
      case 'shipped':
        return { text: 'Track shipment', action: 'track' };
      case 'delivered':
        return { text: 'Confirm order', action: 'confirm' };
      case 'completed':
        return { text: 'Reorder items', action: 'reorder' };
      default:
        return null;
    }
  };

  const handleOrderAction = async (order, action) => {
    switch (action) {
      case 'track':
        // Navigate to tracking page or open tracking modal
        console.log('Track order:', order.id);
        break;
      case 'confirm':
        // Confirm delivery
        try {
          await firebaseService.orders.updateStatus(order.id, 'completed', {
            confirmedBy: 'buyer',
            confirmedAt: new Date()
          });
          await fetchRecentOrders();
          alert('Delivery confirmed successfully!');
        } catch (error) {
          console.error('Error confirming delivery:', error);
          alert('Failed to confirm order. Please try again.');
        }
        break;
      case 'reorder':
        // Add items back to cart
        try {
          if (order.items && order.items.length > 0) {
            // Clear current cart and add reorder items
            clearCart();
            
            // Note: In a real implementation, you'd need to fetch current product details
            // and check stock before adding to cart
            alert('Reorder functionality would add items back to cart');
          }
        } catch (error) {
          console.error('Error reordering:', error);
          alert('Failed to reorder items. Please try again.');
        }
        break;
      default:
        break;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown date';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString();
  };

  const formatAmount = (amount, currency = 'NGN') => {
    const numeric = Number(amount) || 0;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(numeric);
    } catch {
      return `₦${numeric.toLocaleString()}`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Orders</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
        <Link
          to="/buyer"
          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          View All Orders
        </Link>
      </div>

      {recentOrders.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-600 mb-4">Start shopping to see your orders here</p>
          <Link
            to="/products"
            className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {recentOrders.map((order) => {
            const nextAction = getNextAction(order);
            return (
              <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Order #{order.id.slice(-8)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {order.items && order.items.length > 0 
                          ? `${order.items.length} item${order.items.length > 1 ? 's' : ''}`
                          : '1 item'
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatAmount(order.totalAmount, order.currency)}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {getStatusMessage(order.status)}
                    </p>
                  </div>
                </div>

                {nextAction && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        {nextAction.action === 'track' && 'Track your package'}
                        {nextAction.action === 'confirm' && 'Please confirm you received your order'}
                        {nextAction.action === 'reorder' && 'Want to order these items again?'}
                      </p>
                      <button
                        onClick={() => handleOrderAction(order, nextAction.action)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          nextAction.action === 'confirm'
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {nextAction.text}
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowOrderDetails(true);
                    }}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => {
                      // Navigate to support or create a support ticket
                      console.log('Contact support for order:', order.id);
                    }}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                  >
                    Need Help?
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Order #{selectedOrder.id.slice(-8)} Details
              </h3>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-medium">{formatAmount(selectedOrder.totalAmount, selectedOrder.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vendor</p>
                  <p className="font-medium">{selectedOrder.vendorName || 'Unknown'}</p>
                </div>
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Items</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm text-gray-600">
                          {item.quantity ? `Qty: ${item.quantity}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                {getNextAction(selectedOrder) && (
                  <button
                    onClick={() => {
                      handleOrderAction(selectedOrder, getNextAction(selectedOrder).action);
                      setShowOrderDetails(false);
                    }}
                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    {getNextAction(selectedOrder).text}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentOrdersFlow;
