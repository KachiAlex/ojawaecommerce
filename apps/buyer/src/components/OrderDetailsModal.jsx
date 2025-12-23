import React, { useState } from 'react';
import Receipt from './Receipt';
import SupportTicket from './SupportTicket';

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

const OrderDetailsModal = ({ open, order, onClose, onFundWallet }) => {
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);

  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Order {order.id}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Vendor</p>
              <p className="font-medium text-gray-900">{order.vendorName || 'Unknown Vendor'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium text-gray-900">{order.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-medium text-gray-900">{formatCurrency(order.totalAmount || 0, order.currency)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium text-gray-900">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Wallet ID</p>
              <p className="font-medium text-gray-900">{order.walletId || 'N/A'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-2">Items</p>
            <div className="border rounded-lg divide-y">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div className="text-sm text-gray-900">{item.name || 'Item'}</div>
                  {item.quantity && (
                    <div className="text-sm text-gray-500">x{item.quantity}</div>
                  )}
                </div>
              ))}
              {(!order.items || order.items.length === 0) && (
                <div className="p-3 text-sm text-gray-500">No items available</div>
              )}
            </div>
          </div>
        </div>
        <div className="p-6 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50">Close</button>
          <button 
            onClick={() => setShowReportIssue(true)} 
            className="px-4 py-2 text-sm border border-red-300 rounded-lg text-red-600 hover:bg-red-50 font-medium"
          >
            🚨 Report Issue
          </button>
          {(order.paymentStatus === 'escrow_funded' || order.paymentStatus === 'paid' || order.status === 'escrow_funded') && (
            <button 
              onClick={() => setIsReceiptOpen(true)} 
              className="px-4 py-2 text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-400 hover:to-teal-400 font-semibold"
            >
              📄 View Receipt
            </button>
          )}
          {onFundWallet && (
            <button onClick={() => onFundWallet(order)} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Fund Wallet</button>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      <Receipt
        order={order}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />

      {/* Report Issue Modal */}
      {showReportIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <SupportTicket
              initialData={{
                orderId: order.id,
                category: 'order',
                orderDetails: {
                  amount: order.totalAmount,
                  status: order.status,
                  vendorName: order.vendorName,
                  date: order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'N/A'
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


