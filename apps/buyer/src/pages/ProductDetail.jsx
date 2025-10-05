import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
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
    </div>
  );
};

export default ProductDetail;
