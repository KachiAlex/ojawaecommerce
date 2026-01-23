import React, { useEffect, useState } from 'react';

// Generate a unique tracking number
const generateTrackingNumber = () => {
  // Generate a tracking number with format: OJAWA + timestamp + random
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `OJAWA${timestamp}${random}`;
};

const ShipOrderModal = ({ open, order, onClose, onConfirm }) => {
  // Pre-populate carrier with the logistics partner selected by buyer
  const [carrier, setCarrier] = useState(order?.logisticsCompany || order?.logisticsPartnerName || '');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [eta, setEta] = useState('');

  // Generate new tracking number when modal opens
  useEffect(() => {
    if (open && order) {
      setTrackingNumber(generateTrackingNumber());
      setCarrier(order?.logisticsCompany || order?.logisticsPartnerName || '');
    }
  }, [open, order]);

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
            <label className="block text-xs text-gray-500 mb-1">Carrier (Selected by Buyer)</label>
            <input 
              value={carrier} 
              readOnly 
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700" 
            />
            {carrier && (
              <p className="text-xs text-blue-600 mt-1">
                ℹ️ This logistics partner was selected by the buyer during checkout
              </p>
            )}
            {!carrier && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ No logistics partner was selected by the buyer
              </p>
            )}
          </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tracking Number</label>
          <div className="flex gap-2">
            <input
              value={trackingNumber}
              readOnly
              className="flex-1 border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 font-mono"
            />
            <button
              type="button"
              onClick={() => setTrackingNumber(generateTrackingNumber())}
              className="px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Regenerate
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            📦 Auto-generated tracking number. Click regenerate if needed.
          </p>
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


