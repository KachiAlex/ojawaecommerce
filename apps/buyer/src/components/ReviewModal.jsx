import { useState } from 'react';

const ReviewModal = ({ open, order, onClose, onSubmit }) => {
  const [productRating, setProductRating] = useState(0);
  const [vendorRating, setVendorRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [vendorReviewText, setVendorReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoveredProductStar, setHoveredProductStar] = useState(0);
  const [hoveredVendorStar, setHoveredVendorStar] = useState(0);

  if (!open || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (productRating === 0) {
      alert('Please rate the product');
      return;
    }
    
    if (vendorRating === 0) {
      alert('Please rate the vendor');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        orderId: order.id,
        productRating,
        vendorRating,
        reviewText,
        vendorReviewText,
        items: order.items || []
      });
      
      // Reset form
      setProductRating(0);
      setVendorRating(0);
      setReviewText('');
      setVendorReviewText('');
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ rating, setRating, hovered, setHovered, label }) => {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <svg
                className={`w-8 h-8 ${
                  star <= (hovered || rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {rating > 0 ? `${rating} out of 5` : 'No rating'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Rate Your Experience - Order #{order.id.slice(-8)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Review Section */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4">Product Review</h4>
            
            {/* Display products from order */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Product(s) in this order:</p>
              <div className="space-y-2">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="bg-white rounded p-2 text-sm">
                    <span className="font-medium">{item.name}</span>
                    {item.quantity && <span className="text-gray-500 ml-2">× {item.quantity}</span>}
                  </div>
                ))}
              </div>
            </div>

            <StarRating
              rating={productRating}
              setRating={setProductRating}
              hovered={hoveredProductStar}
              setHovered={setHoveredProductStar}
              label="How would you rate the product quality?"
            />

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Review (Optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Tell others about your experience with this product..."
              />
            </div>
          </div>

          {/* Vendor Review Section */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4">Vendor Service</h4>
            
            <StarRating
              rating={vendorRating}
              setRating={setVendorRating}
              hovered={hoveredVendorStar}
              setHovered={setHoveredVendorStar}
              label="How would you rate the vendor's service?"
            />

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor Review (Optional)
              </label>
              <textarea
                value={vendorReviewText}
                onChange={(e) => setVendorReviewText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Share your experience with the vendor's service..."
              />
            </div>
          </div>

          {/* Submit Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-4">
              Your review helps other buyers make informed decisions and helps vendors improve their service.
            </p>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Skip for Now
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;

