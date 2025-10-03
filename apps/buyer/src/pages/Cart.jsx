import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

// Helper function to format currency with amount
const formatCurrency = (amount, currencyString) => {
  if (!currencyString) return `₦${amount.toFixed(2)}`;
  
  // Extract currency symbol and code from string like "₦ NGN"
  const parts = currencyString.trim().split(/\s+/);
  const symbol = parts[0] || '₦';
  const code = parts[1] || 'NGN';
  
  return `${symbol}${amount.toFixed(2)}`;
};

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart, validateCartItems, hasOutOfStockItems } = useCart();
  const { currentUser } = useAuth();

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Your cart is empty.</p>
          <p className="text-gray-400 mt-2">Add some products to get started!</p>
          <Link
            to="/products"
            className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <div className="flex gap-4">
          {hasOutOfStockItems() && (
            <button
              onClick={validateCartItems}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Remove Out of Stock Items
            </button>
          )}
          <button
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Clear Cart
          </button>
        </div>
      </div>

      {/* Out of Stock Warning */}
      {hasOutOfStockItems() && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-orange-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-orange-800">
              Some items in your cart are out of stock. Please remove them or update quantities before proceeding to checkout.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-4">
                  <img
                    src={item.image || (Array.isArray(item.images) && item.images[0]) || '/placeholder.png'}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-gray-600">{formatCurrency(item.price, item.currency)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => {
                        try {
                          updateQuantity(item.id, item.quantity + 1);
                        } catch (error) {
                          alert(error.message);
                        }
                      }}
                      disabled={item.quantity >= (item.stock || item.stockQuantity || 999)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                  {/* Stock Status */}
                  {item.stock !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      {item.stock <= 0 ? (
                        <span className="text-red-500">Out of Stock</span>
                      ) : (
                        <span>{item.stock} available</span>
                      )}
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(item.price * item.quantity, item.currency)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatCurrency(getCartTotal(), cartItems[0]?.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">{formatCurrency(0, cartItems[0]?.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-semibold">{formatCurrency(0, cartItems[0]?.currency)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-blue-600">{formatCurrency(getCartTotal(), cartItems[0]?.currency)}</span>
              </div>
            </div>
            {!currentUser && (
              <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-600">🛡️</span>
                  <span className="font-medium text-emerald-800">Secure Checkout with Wallet Protection</span>
                </div>
                <p className="text-sm text-emerald-700">
                  Sign in or create an account to complete your purchase with full wallet protection.
                </p>
              </div>
            )}
            <Link
              to="/checkout"
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg text-center font-semibold hover:bg-emerald-700 transition-colors block"
            >
              {currentUser ? 'Proceed to Secure Checkout' : 'Sign In to Checkout Securely'}
            </Link>
            {!currentUser && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Your cart will be saved while you sign in
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
