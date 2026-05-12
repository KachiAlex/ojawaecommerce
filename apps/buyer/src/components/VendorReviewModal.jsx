import React, { useState } from 'react';

const VendorReviewModal = ({ open, vendor, onClose, onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (!open || !vendor) return null;

  const handleSubmit = () => {
    onSubmit?.({ rating: Number(rating), comment, vendor });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Rate {vendor.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rating</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              {[5,4,3,2,1].map((r) => (
                <option key={r} value={r}>{r} Star{r>1?'s':''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Comment</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Share your experience" />
          </div>
        </div>
        <div className="p-6 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Submit Review</button>
        </div>
      </div>
    </div>
  );
};

export default VendorReviewModal;


