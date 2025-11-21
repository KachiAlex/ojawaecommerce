import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const FunctionTest = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testNotifyVendor = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const notifyVendor = httpsCallable(functions, 'notifyVendorNewOrder');
      
      const response = await notifyVendor({
        vendorId: 'test-vendor-123',
        orderId: 'test-order-456',
        buyerName: 'Test Buyer',
        totalAmount: 1000,
        items: [{ name: 'Test Item', quantity: 1 }]
      });

      setResult(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Function test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Function Test Page</h1>
      
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <button
          onClick={testNotifyVendor}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test notifyVendorNewOrder Function'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error:</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-800 font-medium">Success!</h3>
            <pre className="text-green-700 text-sm mt-2 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-800 font-medium">Instructions:</h3>
          <ul className="text-blue-700 text-sm mt-2 space-y-1">
            <li>• This tests the notifyVendorNewOrder function</li>
            <li>• If successful, it means the function is working</li>
            <li>• The order modal should now work properly</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FunctionTest;
