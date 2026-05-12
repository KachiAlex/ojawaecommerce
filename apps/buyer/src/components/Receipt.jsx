import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import SimpleLogo from './SimpleLogo';

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

const formatDate = (date) => {
  if (!date) return '—';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Receipt = ({ order, isOpen, onClose }) => {
  const receiptRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Ojawa_Receipt_${order?.id?.slice(-8) || 'Order'}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  const handleDownload = () => {
    handlePrint();
  };

  if (!isOpen || !order) return null;

  const subtotal = order.subtotal || 0;
  const deliveryFee = order.deliveryFee || 0;
  const serviceFee = order.ojawaCommission || subtotal * 0.05;
  const vat = (subtotal + deliveryFee) * 0.075;
  const total = order.totalAmount || subtotal + deliveryFee + serviceFee + vat;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Receipt Modal */}
        <div
          className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-emerald-900/60"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-emerald-900/60 p-6 flex items-center justify-between z-10">
            <h2 className="text-2xl font-bold text-white">Payment Receipt</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-lg hover:from-emerald-400 hover:to-teal-400 transition-colors font-semibold text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download/Print
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-teal-200 hover:text-white hover:bg-emerald-900/40 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Receipt Content - Printable */}
          <div ref={receiptRef} className="p-8 bg-white">
            {/* Receipt Header */}
            <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
              <div className="flex justify-center mb-4">
                <SimpleLogo size="large" variant="full" className="text-emerald-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Receipt</h1>
              <p className="text-gray-600">Secure E-commerce Platform</p>
              <p className="text-sm text-gray-500 mt-2">www.ojawa.com</p>
            </div>

            {/* Receipt Details */}
            <div className="space-y-6 mb-8">
              {/* Order & Payment Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Receipt Number</p>
                  <p className="font-semibold text-gray-900">#{order.id?.slice(-12).toUpperCase() || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Order ID</p>
                  <p className="font-semibold text-gray-900">#{order.id?.slice(-8) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date & Time</p>
                  <p className="font-semibold text-gray-900">{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                  <p className="font-semibold text-emerald-600">
                    {order.paymentStatus === 'escrow_funded' ? 'Escrow Funded' : 
                     order.paymentStatus === 'paid' ? 'Paid' : 
                     order.paymentStatus || 'Pending'}
                  </p>
                </div>
              </div>

              {/* Buyer Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Bill To</h3>
                <p className="text-gray-900 font-medium">{order.buyerName || 'Customer'}</p>
                <p className="text-sm text-gray-600">{order.buyerEmail || 'N/A'}</p>
                {order.deliveryAddress && (
                  <p className="text-sm text-gray-600 mt-1">{order.deliveryAddress}</p>
                )}
              </div>

              {/* Vendor Information */}
              {order.vendorName && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Sold By</h3>
                  <p className="text-gray-900 font-medium">{order.vendorName}</p>
                  {order.vendorId && (
                    <p className="text-sm text-gray-600">Vendor ID: {order.vendorId.slice(-8)}</p>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Items Purchased</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2 text-sm font-semibold text-gray-700">Item</th>
                      <th className="text-center py-2 text-sm font-semibold text-gray-700">Qty</th>
                      <th className="text-right py-2 text-sm font-semibold text-gray-700">Price</th>
                      <th className="text-right py-2 text-sm font-semibold text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-3 text-gray-900">{item.name || 'Item'}</td>
                        <td className="py-3 text-center text-gray-600">{item.quantity || 1}</td>
                        <td className="py-3 text-right text-gray-600">
                          {formatCurrency(item.price || 0, order.currency)}
                        </td>
                        <td className="py-3 text-right font-semibold text-gray-900">
                          {formatCurrency((item.price || 0) * (item.quantity || 1), order.currency)}
                        </td>
                      </tr>
                    ))}
                    {(!order.items || order.items.length === 0) && (
                      <tr>
                        <td colSpan="4" className="py-4 text-center text-gray-500">
                          No items available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Payment Breakdown */}
              <div className="border-t-2 border-gray-200 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal, order.currency)}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>Delivery Fee:</span>
                      <span>{formatCurrency(deliveryFee, order.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700">
                    <span>Service Fee (5%):</span>
                    <span>{formatCurrency(serviceFee, order.currency)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>VAT (7.5%):</span>
                    <span>{formatCurrency(vat, order.currency)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total Amount:</span>
                    <span className="text-emerald-600">{formatCurrency(total, order.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                <p className="font-semibold text-emerald-700">
                  {order.paymentProvider === 'wallet_escrow' ? 'Wallet Escrow (Protected)' :
                   order.paymentProvider === 'paystack' ? 'Paystack Payment' :
                   order.paymentProvider || 'Not specified'}
                </p>
                {order.paymentProvider === 'wallet_escrow' && (
                  <p className="text-xs text-emerald-600 mt-1">
                    🔒 Your payment is held securely in escrow until delivery confirmation
                  </p>
                )}
              </div>

              {/* Delivery Information */}
              {order.deliveryOption === 'delivery' && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Delivery Information</p>
                  {order.logisticsCompany && (
                    <p className="font-semibold text-blue-700">Logistics: {order.logisticsCompany}</p>
                  )}
                  {order.trackingId && (
                    <p className="text-sm text-blue-600 mt-1">Tracking ID: {order.trackingId}</p>
                  )}
                  {order.estimatedDeliveryDate && (
                    <p className="text-sm text-blue-600 mt-1">
                      Estimated Delivery: {formatDate(order.estimatedDeliveryDate)}
                    </p>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-6 border-t-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  Thank you for shopping with Ojawa!
                </p>
                <p className="text-xs text-gray-500">
                  This is an official receipt for your records. Keep this receipt for your records.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  For support, contact: support@ojawa.com
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons (Non-printable) */}
          <div className="sticky bottom-0 bg-slate-900 border-t border-emerald-900/60 p-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-emerald-700 text-teal-200 rounded-lg hover:bg-emerald-900/40 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-lg hover:from-emerald-400 hover:to-teal-400 transition-colors font-semibold"
            >
              Download/Print Receipt
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Receipt;

