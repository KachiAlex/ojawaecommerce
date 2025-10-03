import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'

const ProductCard = ({ product, onAddToCart }) => {
  const { addToCart, saveIntendedDestination } = useCart()
  const { currentUser } = useAuth()
  const [imageError, setImageError] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToCart = async () => {
    // Check if user is logged in
    if (!currentUser) {
      // Save intended destination for post-authentication redirect
      saveIntendedDestination(`/products/${product.id}`, product.id)
      // Redirect to login with a specific message
      window.location.href = `/login?message=${encodeURIComponent('Please sign in to add this product to your cart and complete your purchase.')}`
      return
    }

    setIsAdding(true)
    try {
      addToCart(product, 1)
      if (onAddToCart) {
        onAddToCart(product)
      }
      // Show success message
      console.log(`${product.name} added to cart successfully`)
    } catch (error) {
      console.error('Error adding to cart:', error)
      alert(error.message) // Show user-friendly error message
    } finally {
      setIsAdding(false)
    }
  }

  const getCurrencyCode = (currencyValue) => {
    if (!currencyValue) return 'NGN'
    // Expecting formats like "₦ NGN", "$ USD", "KSh KES", "EUR", "NGN"
    const parts = String(currencyValue).trim().split(/\s+/)
    const maybeCode = parts[parts.length - 1]
    // If last token is a 3-letter code, use it; otherwise if the whole string is a 3-letter code
    if (/^[A-Za-z]{3}$/.test(maybeCode)) return maybeCode.toUpperCase()
    if (/^[A-Za-z]{3}$/.test(currencyValue)) return String(currencyValue).toUpperCase()
    return 'NGN'
  }

  const formatPrice = (price, currencyValue = product.currency) => {
    const numPrice = parseFloat(price) || 0
    const currencyCode = getCurrencyCode(currencyValue)
    
    // For Nigerian Naira, use custom formatting
    if (currencyCode === 'NGN') {
      return `₦${numPrice.toLocaleString()}`
    }
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode
      }).format(numPrice)
    } catch {
      // Fallback if currency code not supported
      const symbol = currencyCode === 'USD' ? '$' : 
                    currencyCode === 'EUR' ? '€' : 
                    currencyCode === 'GBP' ? '£' : 
                    currencyCode === 'KES' ? 'KSh' : 
                    currencyCode === 'GHS' ? '₵' : currencyCode
      return `${symbol}${numPrice.toLocaleString()}`
    }
  }

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating || 0)
    const hasHalfStar = (rating || 0) % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        {hasHalfStar && (
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <defs>
              <linearGradient id="half-star">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#E5E7EB" />
              </linearGradient>
            </defs>
            <path fill="url(#half-star)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <svg key={i} className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    )
  }

  const getImageUrl = () => {
    if (imageError) return '/placeholder-product.png'
    
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0]
    }
    
    if (product.image) {
      return product.image
    }
    
    return '/placeholder-product.png'
  }

  const isOutOfStock = product.inStock === false || (product.stock || product.stockQuantity || 0) <= 0

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 group">
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative aspect-square bg-gray-100">
          <img
            src={getImageUrl()}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={() => setImageError(true)}
            loading="lazy"
            fetchpriority="low"
            decoding="async"
          />
          
          {/* Stock Status Badge */}
          {isOutOfStock && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Out of Stock
            </div>
          )}
          
          {/* Sale Badge (if applicable) */}
          {product.onSale && (
            <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
              Sale
            </div>
          )}
          
          {/* Quick View Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
            <button className="opacity-0 group-hover:opacity-100 bg-white text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-gray-100">
              Quick View
            </button>
          </div>
        </div>
      </Link>

      <div className="p-4">
        {/* Category */}
        {product.category && (
          <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">
            {product.category}
          </div>
        )}

        {/* Product Name */}
        <Link to={`/products/${product.id}`} className="block">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-emerald-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-gray-500 mb-2">
            by {product.brand}
          </p>
        )}

        {/* Rating */}
        {(product.rating || product.reviewCount) && (
          <div className="flex items-center gap-2 mb-2">
            {renderStars(product.rating)}
            <span className="text-xs text-gray-500">
              ({product.reviewCount || 0})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(product.originalPrice, product.currency)}
              </span>
            )}
          </div>
          
          {product.savings && (
            <span className="text-xs text-emerald-600 font-medium">
              Save {formatPrice(product.savings, product.currency)}
            </span>
          )}
        </div>

        {/* Features (if available) */}
        {product.features && product.features.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {product.features.slice(0, 2).map((feature, index) => (
                <span
                  key={index}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                >
                  {feature}
                </span>
              ))}
              {product.features.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{product.features.length - 2} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            isOutOfStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isAdding
              ? 'bg-emerald-300 text-white cursor-wait'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
          }`}
        >
          {isAdding ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Adding...
            </div>
          ) : isOutOfStock ? (
            'Out of Stock'
          ) : (
            'Add to Cart'
          )}
        </button>

        {/* Wishlist Button */}
        <button className="w-full mt-2 py-1 px-4 text-sm text-gray-600 hover:text-emerald-600 transition-colors">
          <div className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Add to Wishlist
          </div>
        </button>
      </div>
    </div>
  )
}

export default ProductCard
