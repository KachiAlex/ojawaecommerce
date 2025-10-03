import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';

const StockTest = () => {
  const { addToCart, cartItems, updateQuantity, validateCartItems, hasOutOfStockItems, removeFromCart } = useCart();
  const [message, setMessage] = useState('');

  // Mock products with different stock levels
  const testProducts = [
    {
      id: 'test-1',
      name: 'In Stock Product',
      price: 1000,
      stock: 10,
      inStock: true,
      currency: 'NGN'
    },
    {
      id: 'test-2',
      name: 'Low Stock Product',
      price: 2000,
      stock: 2,
      inStock: true,
      currency: 'NGN'
    },
    {
      id: 'test-3',
      name: 'Out of Stock Product',
      price: 3000,
      stock: 0,
      inStock: false,
      currency: 'NGN'
    },
    {
      id: 'test-4',
      name: 'No Stock Field Product',
      price: 4000,
      // No stock field
      currency: 'NGN'
    }
  ];

  const testAddToCart = (product) => {
    setMessage('');
    try {
      addToCart(product, 1);
      setMessage(`✅ ${product.name} added to cart successfully`);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  };

  const testUpdateQuantity = (productId, newQuantity) => {
    setMessage('');
    try {
      updateQuantity(productId, newQuantity);
      setMessage(`✅ Quantity updated to ${newQuantity}`);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-6">Stock Validation Test Page</h2>
      <p className="mb-6 text-gray-600">
        Use this page to test stock validation functionality for adding products to cart.
      </p>

      {/* Current Cart Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Current Cart Status</h3>
        <p className="text-sm text-gray-600 mb-2">
          Items in cart: {cartItems.length} | 
          Has out of stock items: {hasOutOfStockItems() ? 'Yes' : 'No'}
        </p>
        {cartItems.length > 0 && (
          <div className="space-y-2">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="font-medium">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Qty: {item.quantity}</span>
                  <span className="text-sm text-gray-500">
                    Stock: {item.stock || 'N/A'}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Products */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Test Products</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testProducts.map(product => (
            <div key={product.id} className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900">{product.name}</h4>
              <p className="text-gray-600">Price: ₦{product.price.toLocaleString()}</p>
              <p className="text-gray-600">
                Stock: {product.stock !== undefined ? product.stock : 'Not specified'}
              </p>
              <p className="text-gray-600">
                In Stock: {product.inStock !== undefined ? product.inStock.toString() : 'Not specified'}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => testAddToCart(product)}
                  className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700"
                >
                  Add to Cart
                </button>
                <button
                  onClick={() => testAddToCart({ ...product, quantity: 5 })}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Add 5 to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Management */}
      {cartItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Cart Management</h3>
          <div className="flex gap-4">
            <button
              onClick={() => {
                validateCartItems();
                setMessage('Cart validated - out of stock items removed');
              }}
              className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
            >
              Remove Out of Stock Items
            </button>
            <button
              onClick={() => {
                if (cartItems.length > 0) {
                  const firstItem = cartItems[0];
                  testUpdateQuantity(firstItem.id, firstItem.quantity + 1);
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Test Quantity Update
            </button>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.startsWith('✅') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Test Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Test Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Try adding "Out of Stock Product" - should fail</li>
          <li>• Try adding "Low Stock Product" multiple times - should fail when exceeding stock</li>
          <li>• Try adding "No Stock Field Product" - should work (no stock validation)</li>
          <li>• Try updating quantities to exceed available stock - should fail</li>
          <li>• Use "Remove Out of Stock Items" to clean up cart</li>
        </ul>
      </div>
    </div>
  );
};

export default StockTest;
