import React, { useState, useEffect } from 'react';

const VendorOrdersFilterBar = ({ onChange }) => {
  const [status, setStatus] = useState('');
  const [buyer, setBuyer] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    onChange?.({ status, buyer, from, to });
  }, [status, buyer, from, to, onChange]);

  const reset = () => {
    setStatus('');
    setBuyer('');
    setFrom('');
    setTo('');
    setShowMobileFilters(false);
  };

  const filterContainerClasses = `${showMobileFilters ? 'grid' : 'hidden'} grid-cols-1 gap-3 md:grid md:grid-cols-5 md:gap-4 md:items-end`;

  return (
    <div className="w-full">
      <div className="md:hidden mb-3">
        <button
          type="button"
          onClick={() => setShowMobileFilters((prev) => !prev)}
          className="w-full px-4 py-2 text-sm font-medium border rounded-lg flex items-center justify-between"
        >
          <span>Filters</span>
          <span className="text-xs text-gray-500">{showMobileFilters ? 'Hide' : 'Show'}</span>
        </button>
      </div>
      <div className={filterContainerClasses}>
        <div className="w-full">
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full">
            <option value="">All</option>
            <option value="in_wallet">In Wallet</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="awaiting_wallet">Awaiting Wallet</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="w-full">
        <label className="block text-xs text-gray-500 mb-1">Buyer</label>
        <input value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Buyer name/email" className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div className="w-full">
        <label className="block text-xs text-gray-500 mb-1">From</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div className="w-full">
        <label className="block text-xs text-gray-500 mb-1">To</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={reset} className="border px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 w-full md:w-auto">Reset</button>
        </div>
      </div>
    </div>
  );
};

export default VendorOrdersFilterBar;


