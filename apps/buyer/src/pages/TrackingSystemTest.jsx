import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  walletTrackingService, 
  productTrackingService, 
  storeService, 
  orderTrackingService,
  trackingLookupService,
  generateWalletId,
  generateProductTrackingNumber,
  generateStoreId,
  generateOrderTrackingNumber
} from '../services/trackingService';

const TrackingSystemTest = () => {
  const { currentUser } = useAuth();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatedIds, setGeneratedIds] = useState({
    walletId: '',
    productTracking: '',
    storeId: '',
    orderTracking: ''
  });

  const addTestResult = (test, status, details, data = null) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      details,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const generateSampleIds = () => {
    const newIds = {
      walletId: generateWalletId(),
      productTracking: generateProductTrackingNumber(),
      storeId: generateStoreId(),
      orderTracking: generateOrderTrackingNumber()
    };
    setGeneratedIds(newIds);
    addTestResult(
      'ID Generation',
      'PASS',
      'Generated sample tracking IDs',
      newIds
    );
  };

  const testWalletTracking = async () => {
    try {
      setLoading(true);
      addTestResult('Wallet Tracking', 'INFO', 'Testing wallet creation with tracking ID...');

      if (!currentUser) {
        addTestResult('Wallet Tracking', 'SKIP', 'User not authenticated');
        return;
      }

      // Test wallet creation
      const walletData = await walletTrackingService.createWallet(currentUser.uid, 'buyer');
      addTestResult(
        'Wallet Creation',
        'PASS',
        `Wallet created with ID: ${walletData.walletId}`,
        walletData
      );

      // Test wallet retrieval by tracking ID
      const retrievedWallet = await walletTrackingService.getWalletByTrackingId(walletData.walletId);
      if (retrievedWallet) {
        addTestResult(
          'Wallet Retrieval by Tracking ID',
          'PASS',
          `Successfully retrieved wallet: ${retrievedWallet.walletId}`
        );
      } else {
        addTestResult('Wallet Retrieval by Tracking ID', 'FAIL', 'Could not retrieve wallet');
      }

      // Test wallet stats update
      await walletTrackingService.updateWalletStats(walletData.walletId, 'credit', 1000);
      addTestResult(
        'Wallet Stats Update',
        'PASS',
        'Updated wallet statistics with credit transaction'
      );

    } catch (error) {
      addTestResult('Wallet Tracking', 'FAIL', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testProductTracking = async () => {
    try {
      setLoading(true);
      addTestResult('Product Tracking', 'INFO', 'Testing product creation with tracking number...');

      if (!currentUser) {
        addTestResult('Product Tracking', 'SKIP', 'User not authenticated');
        return;
      }

      // Create a sample product
      const sampleProduct = {
        name: 'Test Product for Tracking',
        description: 'This is a test product to demonstrate tracking functionality',
        price: 25000,
        category: 'electronics',
        stock: 10,
        inStock: true,
        currency: 'NGN'
      };

      const productData = await productTrackingService.createProduct(sampleProduct, currentUser.uid);
      addTestResult(
        'Product Creation',
        'PASS',
        `Product created with tracking number: ${productData.trackingNumber}`,
        productData
      );

      // Test product retrieval by tracking number
      const retrievedProduct = await productTrackingService.getProductByTrackingNumber(productData.trackingNumber);
      if (retrievedProduct) {
        addTestResult(
          'Product Retrieval by Tracking Number',
          'PASS',
          `Successfully retrieved product: ${retrievedProduct.trackingNumber}`
        );
      } else {
        addTestResult('Product Retrieval by Tracking Number', 'FAIL', 'Could not retrieve product');
      }

      // Test product view tracking
      await productTrackingService.trackProductView(productData.id);
      addTestResult('Product View Tracking', 'PASS', 'Tracked product view');

      // Test product order tracking
      await productTrackingService.trackProductOrder(productData.id, 25000);
      addTestResult('Product Order Tracking', 'PASS', 'Tracked product order');

    } catch (error) {
      addTestResult('Product Tracking', 'FAIL', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testStoreManagement = async () => {
    try {
      setLoading(true);
      addTestResult('Store Management', 'INFO', 'Testing store creation and management...');

      if (!currentUser) {
        addTestResult('Store Management', 'SKIP', 'User not authenticated');
        return;
      }

      // Create a sample store
      const sampleStore = {
        name: 'Test Store for Tracking',
        description: 'This is a test store to demonstrate store management functionality',
        category: 'electronics',
        contactInfo: {
          email: 'test@example.com',
          phone: '+234 800 000 0000',
          address: 'Test Address, Lagos, Nigeria'
        },
        settings: {
          isPublic: true,
          allowReviews: true,
          showContactInfo: true
        }
      };

      const storeData = await storeService.createStore(currentUser.uid, sampleStore);
      addTestResult(
        'Store Creation',
        'PASS',
        `Store created with ID: ${storeData.storeId}`,
        storeData
      );

      // Test store retrieval by tracking ID
      const retrievedStore = await storeService.getStoreByTrackingId(storeData.storeId);
      if (retrievedStore) {
        addTestResult(
          'Store Retrieval by Tracking ID',
          'PASS',
          `Successfully retrieved store: ${retrievedStore.storeId}`
        );
      } else {
        addTestResult('Store Retrieval by Tracking ID', 'FAIL', 'Could not retrieve store');
      }

      // Test getting stores by vendor
      const vendorStores = await storeService.getStoresByVendor(currentUser.uid);
      addTestResult(
        'Get Stores by Vendor',
        'PASS',
        `Found ${vendorStores.length} stores for vendor`
      );

      // Test store stats update
      await storeService.updateStoreStats(storeData.storeId, 'product_added');
      addTestResult('Store Stats Update', 'PASS', 'Updated store statistics');

    } catch (error) {
      addTestResult('Store Management', 'FAIL', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testOrderTracking = async () => {
    try {
      setLoading(true);
      addTestResult('Order Tracking', 'INFO', 'Testing order creation with tracking number...');

      // Create a sample order
      const sampleOrder = {
        buyerId: currentUser?.uid || 'test-buyer',
        vendorId: 'test-vendor',
        items: [
          {
            productId: 'test-product',
            name: 'Test Product',
            price: 15000,
            quantity: 2
          }
        ],
        totalAmount: 30000,
        shippingAddress: {
          street: '123 Test Street',
          city: 'Lagos',
          state: 'Lagos',
          zipCode: '100001'
        }
      };

      const orderData = await orderTrackingService.createOrder(sampleOrder);
      addTestResult(
        'Order Creation',
        'PASS',
        `Order created with tracking number: ${orderData.trackingNumber}`,
        orderData
      );

      // Test order retrieval by tracking number
      const retrievedOrder = await orderTrackingService.getOrderByTrackingNumber(orderData.trackingNumber);
      if (retrievedOrder) {
        addTestResult(
          'Order Retrieval by Tracking Number',
          'PASS',
          `Successfully retrieved order: ${retrievedOrder.trackingNumber}`
        );
      } else {
        addTestResult('Order Retrieval by Tracking Number', 'FAIL', 'Could not retrieve order');
      }

      // Test order status update
      await orderTrackingService.updateOrderStatus(orderData.id, 'processing');
      addTestResult('Order Status Update', 'PASS', 'Updated order status to processing');

    } catch (error) {
      addTestResult('Order Tracking', 'FAIL', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testTrackingLookup = async () => {
    try {
      setLoading(true);
      addTestResult('Tracking Lookup', 'INFO', 'Testing universal tracking lookup...');

      // Use a generated ID for lookup
      const testId = generatedIds.walletId || generateWalletId();
      
      const searchResults = await trackingLookupService.searchByTrackingId(testId);
      addTestResult(
        'Universal Search',
        'PASS',
        `Search completed for ID: ${testId}`,
        searchResults
      );

      // Test tracking summary
      if (currentUser) {
        const summary = await trackingLookupService.getTrackingSummary(currentUser.uid, 'vendor');
        addTestResult(
          'Tracking Summary',
          'PASS',
          'Generated tracking summary for user',
          summary
        );
      } else {
        addTestResult('Tracking Summary', 'SKIP', 'User not authenticated');
      }

    } catch (error) {
      addTestResult('Tracking Lookup', 'FAIL', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    clearTestResults();
    addTestResult('Test Suite', 'INFO', 'Starting comprehensive tracking system tests...');

    await testWalletTracking();
    await testProductTracking();
    await testStoreManagement();
    await testOrderTracking();
    await testTrackingLookup();

    addTestResult('Test Suite', 'INFO', 'All tests completed!');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Tracking System Test Suite</h1>
        <p className="text-gray-600 mb-6">
          Comprehensive testing for the new wallet, product, store, and order tracking system
        </p>

        {/* Current User Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Authentication Status</h3>
          <p className="text-blue-700">
            {currentUser ? `Logged in as: ${currentUser.email}` : 'Not authenticated - some tests will be skipped'}
          </p>
        </div>

        {/* Generated IDs Display */}
        {Object.values(generatedIds).some(id => id) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Generated Tracking IDs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedIds.walletId && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Wallet ID:</p>
                  <p className="font-mono text-blue-600">{generatedIds.walletId}</p>
                </div>
              )}
              {generatedIds.productTracking && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Product Tracking:</p>
                  <p className="font-mono text-green-600">{generatedIds.productTracking}</p>
                </div>
              )}
              {generatedIds.storeId && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Store ID:</p>
                  <p className="font-mono text-purple-600">{generatedIds.storeId}</p>
                </div>
              )}
              {generatedIds.orderTracking && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Order Tracking:</p>
                  <p className="font-mono text-orange-600">{generatedIds.orderTracking}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <button
          onClick={generateSampleIds}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Generate Sample IDs
        </button>
        
        <button
          onClick={testWalletTracking}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Test Wallet Tracking
        </button>
        
        <button
          onClick={testProductTracking}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          Test Product Tracking
        </button>
        
        <button
          onClick={testStoreManagement}
          disabled={loading}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          Test Store Management
        </button>
        
        <button
          onClick={testOrderTracking}
          disabled={loading}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
        >
          Test Order Tracking
        </button>
        
        <button
          onClick={testTrackingLookup}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          Test Tracking Lookup
        </button>
        
        <button
          onClick={runAllTests}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 col-span-full"
        >
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>

      {/* Test Results */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Test Results</h2>
          <button
            onClick={clearTestResults}
            className="text-slate-600 hover:text-slate-800 text-sm"
          >
            Clear Results
          </button>
        </div>

        {testResults.length === 0 ? (
          <p className="text-slate-600 text-center py-8">
            No test results yet. Click "Run All Tests" to begin.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
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
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{result.test}</h4>
                    <p className="text-sm text-slate-700 mt-1">{result.details}</p>
                    
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-slate-600 cursor-pointer">
                          View Data
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto text-slate-800">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
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
                    <span className="text-xs text-slate-600">{result.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature Overview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tracking System Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Wallet Tracking</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Unique wallet IDs (WLT-YYYY-XXXXXX)</li>
              <li>• Transaction statistics tracking</li>
              <li>• Balance and activity monitoring</li>
              <li>• User type and status tracking</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Product Tracking</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Unique product tracking numbers (PRD-YYYY-XXXXXX)</li>
              <li>• View and order count tracking</li>
              <li>• Revenue and performance metrics</li>
              <li>• Stock and availability monitoring</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Store Management</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Unique store IDs (STO-YYYY-XXXXXX)</li>
              <li>• Shareable store links</li>
              <li>• Multi-store support for vendors</li>
              <li>• Store statistics and performance</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Order Tracking</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Unique order tracking numbers (ORD-YYYY-XXXXXX)</li>
              <li>• Status and payment tracking</li>
              <li>• Shipping and delivery monitoring</li>
              <li>• Complete order lifecycle tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingSystemTest;
