import React, { useState } from 'react';

const PayoutRequestModal = ({ open, onClose, onSubmit }) => {
  const [method, setMethod] = useState('Bank Transfer');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    const errors = [];
    if (!amount || Number(amount) <= 0) errors.push('Amount must be greater than 0');
    if (method === 'Bank Transfer' && account.trim().length < 8) errors.push('Enter a valid bank account');
    if (method === 'Mobile Money' && account.trim().length < 8) errors.push('Enter a valid MoMo number');
    if (errors.length) {
      alert(errors.join('\n'));
      return;
    }
    onSubmit?.({ method, amount: Number(amount), account });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Request Payout</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option>Bank Transfer</option>
              <option>Mobile Money</option>
              <option>PayPal</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount (₦)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Account / Wallet</label>
            <input value={account} onChange={(e) => setAccount(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder={method === 'Mobile Money' ? 'MoMo number' : 'Bank account number'} />
          </div>
        </div>
        <div className="p-6 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Submit Request</button>
        </div>
      </div>
    </div>
  );
};

export default PayoutRequestModal;


