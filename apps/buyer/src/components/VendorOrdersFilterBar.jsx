import React, { useState, useEffect } from 'react';

const VendorOrdersFilterBar = ({ onChange }) => {
  const [status, setStatus] = useState('');
  const [buyer, setBuyer] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    onChange?.({ status, buyer, from, to });
  }, [status, buyer, from, to, onChange]);

  const reset = () => {
    setStatus('');
    setBuyer('');
    setFrom('');
    setTo('');
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-end">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="in_wallet">In Wallet</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="awaiting_wallet">Awaiting Wallet</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Buyer</label>
        <input value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Buyer name/email" className="border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">From</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">To</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="flex gap-2">
        <button onClick={reset} className="border px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Reset</button>
      </div>
    </div>
  );
};

export default VendorOrdersFilterBar;


