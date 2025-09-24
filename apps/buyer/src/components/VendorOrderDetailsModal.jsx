import React from 'react';

const VendorOrderDetailsModal = ({ open, order, onClose, onShip }) => {
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
              <p className="text-sm text-gray-500">Buyer</p>
              <p className="font-medium text-gray-900">{order.buyer || order.buyerName || 'Unknown Buyer'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium text-gray-900">{order.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-medium text-gray-900">{order.amount || `₦${(order.totalAmount || 0).toLocaleString()}`}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium text-gray-900">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : order.date || '—'}</p>
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
          <button onClick={() => onShip(order)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Mark as Shipped</button>
        </div>
      </div>
    </div>
  );
};

export default VendorOrderDetailsModal;


