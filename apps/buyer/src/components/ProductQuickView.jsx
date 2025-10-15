import { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import { useNavigate } from 'react-router-dom';

const ProductQuickView = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setSelectedImage(0);
      setQuantity(1);
      setSelectedVariant(null);
      setAddedToCart(false);
      loadReviews();
    }
  }, [isOpen, product]);

  const loadReviews = async () => {
    if (!product?.id) return;
    try {
      setLoadingReviews(true);
      const reviewsData = await firebaseService.reviews.getByProduct(product.id);
      setReviews(reviewsData.slice(0, 3)); // Show only first 3 reviews
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleAddToCart = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      setAdding(true);
      await addToCart({
        ...product,
        quantity,
        selectedVariant
      });
      setAddedToCart(true);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setAddedToCart(false);
      }, 2000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    setTimeout(() => {
      navigate('/cart');
      onClose();
    }, 500);
  };

  if (!isOpen || !product) return null;

  const images = product.images || [product.imageUrl || 'https://via.placeholder.com/400'];
  const inStock = product.stock > 0 || product.inStock;
  const discount = product.originalPrice ? 
    Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="overflow-y-auto max-h-[90vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
              {/* Left: Images */}
              <div className="space-y-4">
                {/* Main Image */}
                <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                  <img
                    src={images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {discount > 0 && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      -{discount}%
                    </div>
                  )}
                  {!inStock && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="bg-white text-red-600 px-6 py-3 rounded-lg font-bold text-lg">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Thumbnail Images */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage === index 
                            ? 'border-emerald-600 ring-2 ring-emerald-200' 
                            : 'border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Product Details */}
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {product.category && (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        {product.category}
                      </span>
                    )}
                    {product.brand && (
                      <span className="text-xs text-gray-500">
                        {product.brand}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {product.name}
                  </h2>
                  
                  {/* Rating */}
                  {product.rating > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {product.rating.toFixed(1)} ({product.reviewCount || 0} reviews)
                      </span>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-gray-900">
                    ₦{product.price?.toLocaleString()}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xl text-gray-400 line-through">
                      ₦{product.originalPrice.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Stock Status */}
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
                    {inStock ? `In Stock (${product.stock} available)` : 'Out of Stock'}
                  </span>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {product.description || 'No description available.'}
                  </p>
                </div>

                {/* Features */}
                {product.features && product.features.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Key Features</h3>
                    <ul className="space-y-1">
                      {product.features.slice(0, 5).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quantity Selector */}
                {inStock && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Quantity</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        disabled={quantity <= 1}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                        className="w-20 h-10 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        min="1"
                        max={product.stock}
                      />
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        disabled={quantity >= product.stock}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 pt-4 border-t">
                  {inStock ? (
                    <>
                      <button
                        onClick={handleAddToCart}
                        disabled={adding || addedToCart}
                        className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all transform ${
                          addedToCart
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-105'
                        } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                      >
                        {adding ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Adding...
                          </>
                        ) : addedToCart ? (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Added to Cart!
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Add to Cart
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleBuyNow}
                        disabled={adding}
                        className="w-full py-3 px-6 rounded-lg font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Buy Now
                      </button>
                    </>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 px-6 rounded-lg font-semibold bg-gray-300 text-gray-500 cursor-not-allowed"
                    >
                      Out of Stock
                    </button>
                  )}
                </div>

                {/* Quick Reviews */}
                {reviews.length > 0 && (
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Reviews</h3>
                    <div className="space-y-3">
                      {reviews.map((review, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-xs text-gray-600">{review.userName || 'Anonymous'}</span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vendor Info */}
                {product.vendorName && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500">
                      Sold by: <span className="font-medium text-gray-900">{product.vendorName}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductQuickView;

