import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import analyticsService from '../services/analyticsService';
import AnimatedCard from './AnimatedCard';
import AnimatedButton from './AnimatedButton';

const ProductCard = ({ product, onAddToCart, onClick }) => {
  const { addToCart, saveIntendedDestination } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccessBadge, setShowSuccessBadge] = useState(false);
  const addToCartTimeoutRef = useRef(null);

  const handleAddToCart = async (e) => {
    e.stopPropagation(); // Prevent triggering onClick of parent
    
    if (isAdding) return; // Prevent double-clicks
    
    // Track add to cart interaction
    analyticsService.trackProductInteraction(
      product.id, 
      product.vendorId, 
      'add_to_cart',
      { productName: product.name, price: product.price }
    );
    
    // Check if user is logged in
    if (!currentUser) {
      saveIntendedDestination(`/products/${product.id}`, product.id);
      navigate(`/login?message=${encodeURIComponent('Please sign in to add this product to your cart and complete your purchase.')}`);
      return;
    }

    // Clear any existing timeout
    if (addToCartTimeoutRef.current) {
      clearTimeout(addToCartTimeoutRef.current);
    }

    setIsAdding(true);
    try {
      await addToCart(product, 1);
      
      // Show success badge
      setShowSuccessBadge(true);
      setTimeout(() => setShowSuccessBadge(false), 2000);
      
      if (onAddToCart) {
        onAddToCart(product);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Could show error toast here instead of alert
    } finally {
      // Short delay to show loading state
      setTimeout(() => setIsAdding(false), 400);
    }
  };
  
  // Track product view when component mounts (only for authenticated users)
  useEffect(() => {
    if (product.id && product.vendorId && currentUser) {
      (async () => {
        try {
          await analyticsService.trackProductView(product.id, product.vendorId, {
            productName: product.name,
            category: product.category,
            price: product.price
          });
        } catch (_) {
          // Silently ignore analytics errors (e.g., permission issues)
        }
      })();
    }
  }, [product.id, product.vendorId, product.name, product.category, product.price, currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (addToCartTimeoutRef.current) {
        clearTimeout(addToCartTimeoutRef.current);
      }
    };
  }, []);

  const getCurrencyCode = (currencyValue) => {
    if (!currencyValue) return 'NGN';
    if (typeof currencyValue === 'string') {
      const parts = currencyValue.split(' ');
      return parts[1] || 'NGN';
    }
    return 'NGN';
  };

  const formatPrice = (price, currency) => {
    const currencyCode = getCurrencyCode(currency);
    const symbol = currencyCode === 'NGN' ? '₦' : '$';
    return `${symbol}${price.toLocaleString()}`;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(product);
    }
  };

  return (
    <AnimatedCard 
      className="overflow-hidden cursor-pointer"
      hover={true}
      clickable={true}
      onClick={handleCardClick}
      delay={Math.random() * 0.2} // Random stagger for grid layout
    >
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {!imageError ? (
          <motion.img
            src={product.image || product.images?.[0] || '/placeholder-product.jpg'}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={handleImageError}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <motion.div 
              className="text-center text-gray-400"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-4xl mb-2">📦</div>
              <div className="text-sm">No Image</div>
            </motion.div>
          </div>
        )}
        
        {/* Success Badge */}
        <AnimatePresence>
          {showSuccessBadge && (
            <motion.div 
              className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium"
              initial={{ opacity: 0, scale: 0, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              Added!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <motion.h3 
          className="font-medium text-gray-900 mb-2 line-clamp-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {product.name}
        </motion.h3>
        
        <motion.p 
          className="text-sm text-gray-600 mb-3 line-clamp-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {product.description}
        </motion.p>

        {/* Price */}
        <motion.div 
          className="flex items-center justify-between mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.currency && (
              <span className="ml-1 text-xs text-gray-500">
                ({getCurrencyCode(product.currency)})
              </span>
            )}
          </div>
          
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(product.originalPrice, product.currency)}
            </span>
          )}
        </motion.div>

        {/* Vendor Info */}
        {product.vendorName && (
          <motion.p 
            className="text-xs text-gray-500 mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            Sold by: {product.vendorName}
          </motion.p>
        )}

        {/* Stock Status */}
        {product.stock !== undefined && (
          <motion.div 
            className="mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {product.stock > 0 ? (
              <span className="text-xs text-green-600">
                {product.stock} in stock
              </span>
            ) : (
              <span className="text-xs text-red-600">
                Out of stock
              </span>
            )}
          </motion.div>
        )}

        {/* Add to Cart Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <AnimatedButton
            onClick={handleAddToCart}
            disabled={isAdding || (product.stock !== undefined && product.stock <= 0)}
            variant={product.stock !== undefined && product.stock <= 0 ? "danger" : "primary"}
            size="sm"
            loading={isAdding}
            className="w-full"
          >
            {isAdding ? (
              "Adding..."
            ) : product.stock !== undefined && product.stock <= 0 ? (
              "Out of Stock"
            ) : (
              "Add to Cart"
            )}
          </AnimatedButton>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="flex space-x-2 mt-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link
            to={`/products/${product.id}`}
            className="flex-1 text-center py-2 px-3 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:border-emerald-300"
            onClick={(e) => e.stopPropagation()}
          >
            View Details
          </Link>
          
          {currentUser && (
            <motion.button
              className="flex-1 py-2 px-3 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:border-emerald-300"
              onClick={(e) => {
                e.stopPropagation();
                // Add to wishlist functionality could go here
                console.log('Add to wishlist:', product.name);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ♡ Wishlist
            </motion.button>
          )}
        </motion.div>
      </div>
    </AnimatedCard>
  );
};

export default ProductCard;