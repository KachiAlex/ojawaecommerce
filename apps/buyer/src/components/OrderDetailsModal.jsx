import React, { useState, useEffect } from 'react';
import Receipt from './Receipt';
import SupportTicket from './SupportTicket';
import firebaseService from '../services/firebaseService';

// Currency formatting helper
const formatCurrency = (amount, currencyValue) => {
  const numAmount = parseFloat(amount) || 0;
  if (!currencyValue) return `₦${numAmount.toLocaleString()}`;
  
  // Extract currency symbol and code from string like "₦ NGN"
  const parts = String(currencyValue).trim().split(/\s+/);
  const symbol = parts[0] || '₦';
  const code = parts[1] || 'NGN';
  
  return `${symbol}${numAmount.toLocaleString()}`;
};

// Get status badge styling
const getStatusBadge = (status) => {
  const statusMap = {
    'pending_payment': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
    'pending_wallet_funding': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '💳' },
    'escrow_funded': { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔒' },
    'pending_vendor_confirmation': { bg: 'bg-blue-100', text: 'text-blue-800', icon: '⏱️' },
    'shipped': { bg: 'bg-purple-100', text: 'text-purple-800', icon: '📦' },
    'delivered': { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: '✅' },
    'completed': { bg: 'bg-green-100', text: 'text-green-800', icon: '🎉' },
    'disputed': { bg: 'bg-red-100', text: 'text-red-800', icon: '⚠️' },
    'cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', icon: '❌' }
  };
  
  return statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: '📋' };
};

const OrderDetailsModal = ({ open, order, onClose, onFundWallet, onConfirmOrder }) => {
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(false);

  // Fetch vendor details if vendor name is missing
  useEffect(() => {
    const fetchVendorDetails = async () => {
      if (!open || !order) return;
      
      // If we already have vendor name, no need to fetch
      if (order.vendorName && order.vendorName !== 'Unknown') {
        setVendorDetails(order);
        return;
      }

      // If we have a vendorId, fetch the vendor details
      if (order.vendorId) {
        try {
          setLoadingVendor(true);
          const vendor = await firebaseService.users.getVendorProfile(order.vendorId);
          if (vendor) {
            setVendorDetails({
              ...order,
              vendorName: vendor.businessName || vendor.name || vendor.storeName || 'Unknown'
            });
          } else {
            setVendorDetails(order);
          }
        } catch (error) {
          console.error('Error fetching vendor details:', error);
          setVendorDetails(order);
        } finally {
          setLoadingVendor(false);
        }
      } else {
        setVendorDetails(order);
      }
    };

    fetchVendorDetails();
  }, [open, order]);

  if (!open || !order) return null;

  // Use vendor details if available, otherwise use original order
  const displayOrder = vendorDetails || order;

  const statusBadge = getStatusBadge(displayOrder.status);
  const displayId = displayOrder.id?.slice(-8) || 'N/A';
  
  // Determine what actions are available based on order status
  const canConfirmOrder = ['delivered', 'escrow_funded', 'pending_vendor_confirmation'].includes(displayOrder.status);
  const canViewReceipt = ['completed', 'delivered', 'escrow_funded', 'shipped'].includes(displayOrder.status);
  const canFundWallet = displayOrder.status === 'pending_payment' || displayOrder.status === 'pending_wallet_funding';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Order Details</h2>
              <p className="text-gray-300 text-sm mt-1">Order #{displayId}</p>
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-white text-3xl font-light">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Bar */}
          <div className={`${statusBadge.bg} ${statusBadge.text} rounded-lg p-4 flex items-center gap-3`}>
            <span className="text-2xl">{statusBadge.icon}</span>
            <div>
              <p className="font-semibold text-sm">{displayOrder.status.replace(/_/g, ' ').toUpperCase()}</p>
              <p className="text-xs opacity-80">
                {displayOrder.status === 'pending_wallet_funding' && 'Waiting for wallet funding'}
                {displayOrder.status === 'escrow_funded' && 'Funds held in escrow, vendor is preparing'}
                {displayOrder.status === 'pending_vendor_confirmation' && 'Vendor confirming order'}
                {displayOrder.status === 'shipped' && 'Order is in transit'}
                {displayOrder.status === 'delivered' && 'Order delivered - please confirm receipt'}
                {displayOrder.status === 'completed' && 'Order completed successfully'}
                {displayOrder.status === 'disputed' && 'Order is under dispute'}
                {displayOrder.status === 'cancelled' && 'Order has been cancelled'}
              </p>
            </div>
          </div>

          {/* Order Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 font-semibold mb-1 uppercase">Vendor</p>
              <p className="text-sm font-medium text-gray-900">
                {loadingVendor ? '...' : (displayOrder.vendorName || 'Unknown')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 font-semibold mb-1 uppercase">Amount</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(displayOrder.totalAmount || 0, displayOrder.currency)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 font-semibold mb-1 uppercase">Date</p>
              <p className="text-sm font-medium text-gray-900">
                {displayOrder.createdAt?.toDate ? displayOrder.createdAt.toDate().toLocaleDateString() : '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 font-semibold mb-1 uppercase">Wallet ID</p>
              <p className="text-sm font-medium text-gray-900 truncate">{displayOrder.walletId || 'N/A'}</p>
            </div>
          </div>

          {/* Delivery Information */}
          {displayOrder.deliveryOption && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">🚚</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Delivery Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Method</p>
                      <p className="font-medium text-gray-900">
                        {displayOrder.deliveryOption === 'pickup' ? '🏪 Pickup' : '🚛 Delivery'}
                      </p>
                    </div>
                    {displayOrder.deliveryAddress && (
                      <div className="md:col-span-2">
                        <p className="text-gray-600">Address</p>
                        <p className="font-medium text-gray-900">{displayOrder.deliveryAddress}</p>
                      </div>
                    )}
                    {displayOrder.trackingId && (
                      <div>
                        <p className="text-gray-600">Tracking ID</p>
                        <p className="font-medium text-gray-900 font-mono text-xs">{displayOrder.trackingId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Items List */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>📦</span> Items
            </h3>
            <div className="border rounded-lg overflow-hidden">
              {(displayOrder.items || []).length > 0 ? (
                <div className="divide-y">
                  {displayOrder.items.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name || 'Item'}</p>
                        {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                      </div>
                      <div className="text-right">
                        {item.price && (
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.price, displayOrder.currency)}
                          </p>
                        )}
                        {item.quantity && (
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">No items in this order</div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">{formatCurrency(displayOrder.subtotal || displayOrder.totalAmount || 0, displayOrder.currency)}</span>
            </div>
            {displayOrder.shippingFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-gray-900">{formatCurrency(displayOrder.shippingFee, displayOrder.currency)}</span>
              </div>
            )}
            {displayOrder.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium text-gray-900">{formatCurrency(displayOrder.tax, displayOrder.currency)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-lg text-gray-900">{formatCurrency(displayOrder.totalAmount || 0, displayOrder.currency)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
          >
            Close
          </button>
          
          {canViewReceipt && (
            <button
              onClick={() => setIsReceiptOpen(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              📄 Receipt
            </button>
          )}

          {canFundWallet && onFundWallet && (
            <button
              onClick={() => onFundWallet(displayOrder)}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              💳 Fund Wallet
            </button>
          )}

          {canConfirmOrder && onConfirmOrder && (
            <button
              onClick={() => onConfirmOrder(displayOrder)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              ✅ Confirm Order
            </button>
          )}

          <button
            onClick={() => setShowReportIssue(true)}
            className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
          >
            🚨 Report Issue
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      <Receipt
        order={displayOrder}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />

      {/* Report Issue Modal */}
      {showReportIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <SupportTicket
              initialData={{
                orderId: displayOrder.id,
                category: 'order',
                orderDetails: {
                  amount: displayOrder.totalAmount,
                  status: displayOrder.status,
                  vendorName: displayOrder.vendorName,
                  date: displayOrder.createdAt?.toDate ? displayOrder.createdAt.toDate().toLocaleString() : 'N/A'
                }
              }}
              onTicketCreated={() => {
                setShowReportIssue(false);
                alert('Issue reported successfully! Our support team will review it shortly.');
              }}
              onClose={() => setShowReportIssue(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsModal;


