import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const WishlistButton = ({ product, size = 'md', showText = false }) => {
  const { currentUser } = useAuth();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (currentUser && product?.id) {
      checkWishlistStatus();
    }
  }, [currentUser, product?.id]);

  const checkWishlistStatus = async () => {
    try {
      const status = await firebaseService.wishlist.isInWishlist(currentUser.uid, product.id);
      setIsInWishlist(status);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleToggleWishlist = async (e) => {
    e.stopPropagation();
    
    if (!currentUser) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    setLoading(true);
    try {
      if (isInWishlist) {
        await firebaseService.wishlist.removeFromWishlist(currentUser.uid, product.id);
        setIsInWishlist(false);
      } else {
        await firebaseService.wishlist.addToWishlist(currentUser.uid, product.id, {
          name: product.name,
          price: product.price,
          image: product.images?.[0] || product.image,
          vendorId: product.vendorId,
          vendorName: product.vendorName
        });
        setIsInWishlist(true);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  if (showToast && !currentUser) {
    return (
      <div className="fixed top-20 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
        Please sign in to add items to your wishlist
      </div>
    );
  }

  return (
    <button
      onClick={handleToggleWishlist}
      disabled={loading}
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full ${
        isInWishlist 
          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      } transition-colors disabled:opacity-50`}
      title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      {loading ? (
        <div className={`${iconSizeClasses[size]} border-2 border-gray-300 border-t-current rounded-full animate-spin`}></div>
      ) : (
        <svg 
          className={iconSizeClasses[size]} 
          fill={isInWishlist ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      )}
      {showText && (
        <span className="ml-2 text-sm font-medium">
          {isInWishlist ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );
};

export default WishlistButton;

