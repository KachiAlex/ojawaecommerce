import React, { useState } from 'react';

const WalletTopUpModal = ({ open, order, onClose, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    const parsedAmount = Number(amount || order?.totalAmount || 0);
    onConfirm?.({ amount: parsedAmount, note, order });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Top up Wallet</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {order && (
            <div className="text-sm text-gray-600">
              For order <span className="font-medium text-gray-900">{order.id}</span> to <span className="font-medium text-gray-900">{order.vendorName}</span>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount (₦)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={(order?.totalAmount || 0).toString()} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Add a note for this top-up" />
          </div>
        </div>
        <div className="p-6 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleConfirm} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Confirm Top-up</button>
        </div>
      </div>
    </div>
  );
};

export default WalletTopUpModal;


