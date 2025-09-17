import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();
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
        <button
          onClick={clearCart}
          className="text-red-600 hover:text-red-700 font-medium"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-gray-600">${item.price}</p>
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
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
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
                <span className="font-semibold">${getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-blue-600">${getCartTotal().toFixed(2)}</span>
              </div>
            </div>
            {!currentUser && (
              <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-600">🛡️</span>
                  <span className="font-medium text-emerald-800">Secure Checkout with Escrow Protection</span>
                </div>
                <p className="text-sm text-emerald-700">
                  Sign in or create an account to complete your purchase with full escrow protection.
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
