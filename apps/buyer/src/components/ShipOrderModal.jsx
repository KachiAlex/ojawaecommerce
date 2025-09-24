import React, { useState } from 'react';

const ShipOrderModal = ({ open, order, onClose, onConfirm }) => {
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [eta, setEta] = useState('');

  if (!open || !order) return null;

  const handleConfirm = () => {
    onConfirm?.({ carrier, trackingNumber, eta, order });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Mark as Shipped</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-600">Order <span className="font-medium text-gray-900">{order.id}</span></div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Carrier</label>
            <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g., DHL, UPS, FedEx" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tracking Number</label>
            <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g., 1Z999AA10123456784" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">ETA</label>
            <input type="date" value={eta} onChange={(e) => setEta(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="p-6 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleConfirm} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Confirm Shipment</button>
        </div>
      </div>
    </div>
  );
};

export default ShipOrderModal;


