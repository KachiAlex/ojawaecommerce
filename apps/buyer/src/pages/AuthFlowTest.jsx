import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const AuthFlowTest = () => {
  const { currentUser, signout } = useAuth();
  const { 
    cartItems, 
    addToCart, 
    clearCart, 
    saveIntendedDestination, 
    getIntendedDestination,
    hasOutOfStockItems,
    validateCartItems
  } = useCart();
  
  const [testResults, setTestResults] = useState([]);
  const [intendedDestination, setIntendedDestination] = useState(null);

  // Mock product for testing
  const mockProduct = {
    id: 'test-product-1',
    name: 'Test Product',
    price: 15000,
    stock: 10,
    inStock: true,
    currency: 'NGN',
    description: 'A test product for authentication flow testing'
  };

  const addTestResult = (test, status, details) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runComprehensiveTest = async () => {
    setTestResults([]);
    
    // Test 1: Check current authentication status
    addTestResult(
      'Authentication Status',
      currentUser ? 'PASS' : 'INFO',
      currentUser ? `User logged in: ${currentUser.email}` : 'No user logged in'
    );

    // Test 2: Check cart state
    addTestResult(
      'Cart State',
      'PASS',
      `Cart has ${cartItems.length} items`
    );

    // Test 3: Test intended destination functionality
    const testPath = '/test-checkout';
    const testProductId = 'test-product-123';
    
    try {
      saveIntendedDestination(testPath, testProductId);
      const saved = getIntendedDestination();
      
      if (saved && saved.path === testPath && saved.productId === testProductId) {
        addTestResult(
          'Intended Destination Save/Retrieve',
          'PASS',
          `Successfully saved and retrieved: ${saved.path}`
        );
        setIntendedDestination(saved);
      } else {
        addTestResult(
          'Intended Destination Save/Retrieve',
          'FAIL',
          'Failed to save or retrieve intended destination'
        );
      }
    } catch (error) {
      addTestResult(
        'Intended Destination Save/Retrieve',
        'FAIL',
        `Error: ${error.message}`
      );
    }

    // Test 4: Test adding product to cart (if user is logged in)
    if (currentUser) {
      try {
        const initialCartSize = cartItems.length;
        addToCart(mockProduct, 1);
        
        if (cartItems.length > initialCartSize) {
          addTestResult(
            'Add to Cart (Logged In)',
            'PASS',
            `Product added successfully. Cart now has ${cartItems.length} items`
          );
        } else {
          addTestResult(
            'Add to Cart (Logged In)',
            'FAIL',
            'Product was not added to cart'
          );
        }
      } catch (error) {
        addTestResult(
          'Add to Cart (Logged In)',
          'FAIL',
          `Error: ${error.message}`
        );
      }
    } else {
      addTestResult(
        'Add to Cart (Logged In)',
        'SKIP',
        'User not logged in - this test requires authentication'
      );
    }

    // Test 5: Test stock validation
    try {
      const outOfStockProduct = { ...mockProduct, stock: 0, inStock: false };
      addToCart(outOfStockProduct, 1);
      addTestResult(
        'Stock Validation',
        'FAIL',
        'Should have prevented adding out-of-stock product'
      );
    } catch (error) {
      addTestResult(
        'Stock Validation',
        'PASS',
        `Correctly prevented adding out-of-stock product: ${error.message}`
      );
    }

    // Test 6: Test cart validation
    try {
      const hasOutOfStock = hasOutOfStockItems();
      addTestResult(
        'Cart Validation',
        'PASS',
        `Cart validation check completed. Has out of stock items: ${hasOutOfStock}`
      );
    } catch (error) {
      addTestResult(
        'Cart Validation',
        'FAIL',
        `Error during cart validation: ${error.message}`
      );
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const signOutAndTest = async () => {
    try {
      await signout();
      addTestResult(
        'Sign Out',
        'PASS',
        'Successfully signed out'
      );
    } catch (error) {
      addTestResult(
        'Sign Out',
        'FAIL',
        `Error signing out: ${error.message}`
      );
    }
  };

  const clearCartAndTest = () => {
    try {
      clearCart();
      addTestResult(
        'Clear Cart',
        'PASS',
        'Cart cleared successfully'
      );
    } catch (error) {
      addTestResult(
        'Clear Cart',
        'FAIL',
        `Error clearing cart: ${error.message}`
      );
    }
  };

  const simulateAuthFlow = () => {
    // Simulate the complete authentication flow
    addTestResult(
      'Authentication Flow Simulation',
      'INFO',
      'Starting authentication flow simulation...'
    );

    // Step 1: Save intended destination (simulating user trying to checkout)
    saveIntendedDestination('/checkout', mockProduct.id);
    addTestResult(
      'Step 1: Save Intended Destination',
      'PASS',
      'Saved intended destination for checkout'
    );

    // Step 2: Check if user needs authentication
    if (!currentUser) {
      addTestResult(
        'Step 2: Authentication Check',
        'PASS',
        'User needs to authenticate - would redirect to login'
      );
    } else {
      addTestResult(
        'Step 2: Authentication Check',
        'PASS',
        'User is already authenticated'
      );
    }

    // Step 3: Simulate post-authentication redirect
    const destination = getIntendedDestination();
    if (destination) {
      addTestResult(
        'Step 3: Post-Auth Redirect',
        'PASS',
        `Would redirect to: ${destination.path}`
      );
    } else {
      addTestResult(
        'Step 3: Post-Auth Redirect',
        'FAIL',
        'No intended destination found'
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Authentication Flow Test
        </h1>

        {/* Current State Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Current Authentication State
            </h3>
            <p className="text-sm text-gray-600">
              Status: {currentUser ? 'Logged In' : 'Not Logged In'}
            </p>
            {currentUser && (
              <p className="text-sm text-gray-600">
                User: {currentUser.email}
              </p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Cart State
            </h3>
            <p className="text-sm text-gray-600">
              Items: {cartItems.length}
            </p>
            <p className="text-sm text-gray-600">
              Has Out of Stock: {hasOutOfStockItems() ? 'Yes' : 'No'}
            </p>
          </div>
        </div>

        {/* Intended Destination Display */}
        {intendedDestination && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              Saved Intended Destination
            </h3>
            <p className="text-sm text-blue-600">
              Path: {intendedDestination.path}
            </p>
            <p className="text-sm text-blue-600">
              Product ID: {intendedDestination.productId}
            </p>
            <p className="text-sm text-blue-600">
              Timestamp: {new Date(intendedDestination.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={runComprehensiveTest}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Run Full Test
          </button>
          
          <button
            onClick={simulateAuthFlow}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Simulate Auth Flow
          </button>
          
          <button
            onClick={signOutAndTest}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign Out & Test
          </button>
          
          <button
            onClick={clearCartAndTest}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Clear Cart & Test
          </button>
        </div>

        {/* Test Results */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Test Results
            </h2>
            <button
              onClick={clearTestResults}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Clear Results
            </button>
          </div>

          {testResults.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No test results yet. Click "Run Full Test" to begin.
            </p>
          ) : (
            <div className="space-y-3">
              {testResults.map((result) => (
                <div
                  key={result.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    result.status === 'PASS'
                      ? 'bg-green-50 border-green-400'
                      : result.status === 'FAIL'
                      ? 'bg-red-50 border-red-400'
                      : result.status === 'SKIP'
                      ? 'bg-yellow-50 border-yellow-400'
                      : 'bg-blue-50 border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {result.test}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {result.details}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.status === 'PASS'
                            ? 'bg-green-100 text-green-800'
                            : result.status === 'FAIL'
                            ? 'bg-red-100 text-red-800'
                            : result.status === 'SKIP'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {result.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {result.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            How to Test the Complete Flow
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Sign out if currently logged in</li>
            <li>Go to the home page and try to add a product to cart</li>
            <li>You should be redirected to login with a message</li>
            <li>Sign in or register</li>
            <li>You should be redirected back to the product page</li>
            <li>The product should be automatically added to your cart</li>
            <li>Proceed to checkout to complete the flow</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AuthFlowTest;
