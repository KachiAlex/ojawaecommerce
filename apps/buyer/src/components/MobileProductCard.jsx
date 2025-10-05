import { useState } from 'react';
import { Link } from 'react-router-dom';
import MobileTouchHandler from './MobileTouchHandler';
import MobileSwipeableCard from './MobileSwipeableCard';

const MobileProductCard = ({ 
  product, 
  onAddToCart, 
  onAddToWishlist, 
  onQuickView,
  showActions = true 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart(product);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
    onAddToWishlist(product);
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView(product);
  };

  const handleSwipeLeft = () => {
    // Add to wishlist on swipe left
    handleWishlist();
  };

  const handleSwipeRight = () => {
    // Add to cart on swipe right
    handleAddToCart();
  };

  const availableStock = product.stock || product.stockQuantity || 0;
  const isOutOfStock = product.inStock === false || availableStock <= 0;

  return (
    <MobileSwipeableCard
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      leftAction="Add to Wishlist"
      rightAction="Add to Cart"
      leftActionColor="bg-pink-500"
      rightActionColor="bg-emerald-500"
      leftActionIcon="❤️"
      rightActionIcon="🛒"
    >
      <Link to={`/products/${product.id}`} className="block">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Product Image */}
          <div className="relative aspect-square bg-gray-100">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse bg-gray-200 w-full h-full"></div>
              </div>
            )}
            <img
              src={product.image || '/placeholder-product.jpg'}
              alt={product.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
            
            {/* Stock Status Badge */}
            <div className="absolute top-2 left-2">
              {isOutOfStock ? (
                <div className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  Out of Stock
                </div>
              ) : (
                <div className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  In Stock ({availableStock})
                </div>
              )}
            </div>

            {/* Quick Actions Overlay */}
            {showActions && (
              <div className="absolute top-2 right-2 flex flex-col space-y-2">
                <button
                  onClick={handleWishlist}
                  className={`p-2 rounded-full shadow-md transition-colors ${
                    isLiked 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                
                <button
                  onClick={handleQuickView}
                  className="p-2 bg-white text-gray-600 rounded-full shadow-md hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-3">
            <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
              {product.name}
            </h3>
            
              <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1">
                <span className="text-lg font-bold text-emerald-600">
                  ₦{product.price?.toLocaleString()}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-gray-500 line-through">
                    ₦{product.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
              
              {product.rating && (
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs text-gray-600">{product.rating}</span>
                </div>
              )}
            </div>

              {/* Stock count under price */}
              <p className="text-[11px] text-gray-500 mb-2">
                {isOutOfStock ? 'No units available' : `${availableStock} unit${availableStock === 1 ? '' : 's'} available`}
              </p>

            {/* Vendor Info */}
            {product.vendorName && (
              <p className="text-xs text-gray-500 mb-2">
                by {product.vendorName}
              </p>
            )}

            {/* Action Buttons */}
              {showActions && (
              <div className="flex space-x-2">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    isOutOfStock
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleQuickView}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Quick View
                </button>
              </div>
            )}
          </div>
        </div>
      </Link>
    </MobileSwipeableCard>
  );
};

export default MobileProductCard;