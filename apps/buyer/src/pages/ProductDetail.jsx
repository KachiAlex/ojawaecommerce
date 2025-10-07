import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const { addToCart, saveIntendedDestination } = useCart();
  const { currentUser } = useAuth();

  const getCurrencyCode = (currencyValue) => {
    if (!currencyValue) return 'USD'
    const parts = String(currencyValue).trim().split(/\s+/)
    const maybeCode = parts[parts.length - 1]
    if (/^[A-Za-z]{3}$/.test(maybeCode)) return maybeCode.toUpperCase()
    if (/^[A-Za-z]{3}$/.test(currencyValue)) return String(currencyValue).toUpperCase()
    return 'USD'
  }

  const formatPrice = (price, currencyValue) => {
    const numPrice = parseFloat(price) || 0
    const currencyCode = getCurrencyCode(currencyValue)
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(numPrice)
    } catch {
      return `${numPrice.toLocaleString()} ${currencyCode}`
    }
  }

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productRef = doc(db, 'products', id);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          setProduct({ id: productSnap.id, ...productSnap.data() });
        } else {
          // Mock data for demo
          setProduct({
            id: id,
            name: 'Sample Product',
            price: 29.99,
            image: 'https://via.placeholder.com/500x400',
            category: 'electronics',
            description: 'This is a detailed product description. It includes all the features and specifications of the product.',
            stock: 10
          });
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Fetch product reviews
  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      
      try {
        setLoadingReviews(true);
        const productReviews = await firebaseService.reviews.getByProduct(id);
        setReviews(productReviews || []);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    
    // Check if user is logged in
    if (!currentUser) {
      // Save intended destination for post-authentication redirect
      saveIntendedDestination(`/products/${product.id}`, product.id);
      // Redirect to login with a specific message
      window.location.href = `/login?message=${encodeURIComponent('Please sign in to add this product to your cart and complete your purchase.')}`;
      return;
    }
    
    try {
      // Check stock availability
      const isOutOfStock = product.inStock === false || (product.stock || 0) <= 0;
      if (isOutOfStock) {
        alert('This product is currently out of stock.');
        return;
      }

      // Check if requested quantity exceeds available stock
      if (quantity > (product.stock || 0)) {
        alert(`Only ${product.stock} items available in stock.`);
        return;
      }

      addToCart(product, quantity);
      alert(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} of ${product.name} to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert(error.message || 'Failed to add product to cart.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
          <p className="text-gray-600">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const availableStock = product.stock || product.stockQuantity || 0
  const isOutOfStock = product.inStock === false || availableStock <= 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div>
          <img
            src={product.image || (Array.isArray(product.images) && product.images[0]) || '/placeholder.png'}
            alt={product.name}
            className="w-full h-96 object-cover rounded-lg shadow-lg"
          />
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
          <p className="text-3xl font-bold text-blue-600 mb-4">{formatPrice(product.price, product.currency)}</p>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600">{product.description}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Category</h3>
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {product.category}
            </span>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Stock</h3>
            {isOutOfStock ? (
              <p className="text-red-600 font-medium">Out of Stock</p>
            ) : (
              <p className="text-gray-600">{availableStock} item{availableStock === 1 ? '' : 's'} available</p>
            )}
          </div>

          {/* Quantity and Add to Cart */}
          <div className="mb-6">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
              >
                -
              </button>
              <span className="text-lg font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(availableStock || 999, quantity + 1))}
                disabled={quantity >= (availableStock || 0)}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {isOutOfStock ? 'No units available' : `Maximum: ${availableStock} items`}
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`w-full py-3 px-6 rounded-lg text-lg font-semibold transition-colors ${
              isOutOfStock
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} out of 5 ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
        </div>

        {loadingReviews ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <div className="text-gray-400 text-4xl mb-3">⭐</div>
            <p className="text-gray-600">No reviews yet</p>
            <p className="text-sm text-gray-500 mt-1">Be the first to review this product!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{review.userName || 'Anonymous'}</span>
                      {review.verified && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                          ✓ Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(review.createdAt?.toDate?.() || review.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                {review.reviewText && (
                  <p className="text-gray-700 leading-relaxed">{review.reviewText}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
