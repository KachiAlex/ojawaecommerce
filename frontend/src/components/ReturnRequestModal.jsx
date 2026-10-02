import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config/env';

const buildApiUrl = (path) => {
  const baseUrl = (config.app.apiBaseUrl || '').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

const ReturnRequestModal = ({ order, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (reason.length < 10) {
      setError('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null;
      const body = { reason };
      if (!currentUser && order.isGuest) {
        body.guestEmail = guestEmail;
      }

      const response = await fetch(buildApiUrl(`/api/orders/${order.id}/return-request`), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to submit return request');
      }

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Return Request Submitted</h3>
          <p className="text-gray-600 text-sm mb-4">
            Your return request for order {order.orderNumber} has been submitted. The vendor will review your request and respond shortly.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Request Return</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Order: <span className="font-medium text-gray-900">{order.orderNumber}</span></p>
          <p className="text-sm text-gray-600">Items: {order.items?.length || 0}</p>
          <p className="text-sm text-gray-600">Total: <span className="font-medium text-gray-900">₦{Number(order.totalAmount || 0).toLocaleString()}</span></p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!currentUser && order.isGuest && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email used for order *</label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="you@example.com"
              required
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for return *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none"
            placeholder="Please describe why you want to return this order (min 10 characters)..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">{reason.length}/1000 characters</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || reason.length < 10}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnRequestModal;
