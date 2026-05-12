import React, { useState, useEffect } from 'react';

const OrdersFilterBar = ({ onChange }) => {
  const [status, setStatus] = useState('');
  const [vendor, setVendor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    onChange?.({ status, vendor, from, to });
  }, [status, vendor, from, to, onChange]);

  const reset = () => {
    setStatus('');
    setVendor('');
    setFrom('');
    setTo('');
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-end">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="pending_wallet_funding">Awaiting Wallet Funding</option>
          <option value="wallet_funded">Wallet Funded</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Vendor</label>
        <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor name" className="border rounded-lg px-3 py-2 text-sm" />
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

export default OrdersFilterBar;


