import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const ProductDetailModal = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart();
  const { currentUser } = useAuth();
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Get product images (handle both single image and images array)
  const productImages = product?.image ? [product.image] : (product?.images || []);
  const currentImage = productImages[selectedImageIndex];

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!currentUser) {
      alert('Please sign in to add items to cart');
      return;
    }

    try {
      setAddingToCart(true);
      await addToCart(product, quantity);
      console.log('✅ Added to cart:', product.name);
      // Optionally close modal or show success message
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      alert(error.message || 'Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  // Handle buy now (direct to checkout)
  const handleBuyNow = async () => {
    if (!currentUser) {
      alert('Please sign in to proceed with purchase');
      return;
    }

    try {
      setAddingToCart(true);
      await addToCart(product, quantity);
      // Redirect to checkout
      window.location.href = '/checkout';
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      alert(error.message || 'Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedImageIndex(0);
      setShowFullDescription(false);
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Product Images */}
          <div className="space-y-4">
          
          {/* Processing Time Display */}
          {product.processingTimeDays !== undefined && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center text-sm text-blue-900">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Vendor Processing: </span>
                <span className="ml-1">
                  {product.processingTimeDays === 0 ? 'Same Day Ready' :
                   product.processingTimeDays === 1 ? '1 Business Day' :
                   `${product.processingTimeDays} Business Days`}
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Time needed to prepare/pack your order before shipping
              </p>
            </div>
          )}
            {/* Main Image */}
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center ${currentImage ? 'hidden' : 'flex'}`}>
                <span className="text-6xl">🛍️</span>
              </div>
            </div>

            {/* Thumbnail Images */}
            {productImages.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === index ? 'border-emerald-500' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {/* Price and Rating */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold text-emerald-600">
                  ₦{product.price?.toLocaleString() || '0'}
                </span>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-yellow-400 mr-1">★</span>
                  {product.rating || '4.5'} ({product.reviewCount || '0'} reviews)
                </div>
              </div>
              <p className="text-sm text-gray-600">
                by {product.vendorName || product.vendor || 'Vendor'}
              </p>
            </div>

            {/* Stock Status */}
            <div className="flex items-center space-x-2">
              {product.inStock ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ In Stock
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  ✗ Out of Stock
                </span>
              )}
              {product.stock && (
                <span className="text-sm text-gray-600">
                  {product.stock} available
                </span>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <div className="text-gray-600">
                {showFullDescription ? (
                  <p>{product.description}</p>
                ) : (
                  <p>
                    {product.description?.length > 200 
                      ? `${product.description.substring(0, 200)}...` 
                      : product.description
                    }
                  </p>
                )}
                {product.description?.length > 200 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mt-1"
                  >
                    {showFullDescription ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  -
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock || 10, quantity + 1))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || !product.inStock}
                className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
              >
                {addingToCart ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding to Cart...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                    </svg>
                    Add to Cart
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={addingToCart || !product.inStock}
                className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Buy Now with Escrow
              </button>
            </div>

            {/* Product Features */}
            {product.features && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Features</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  {product.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
