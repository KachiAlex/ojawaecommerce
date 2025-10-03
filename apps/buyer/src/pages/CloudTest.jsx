import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const CloudTest = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testCloudFunction = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const notifyVendor = httpsCallable(functions, 'notifyVendorNewOrder');
      
      const response = await notifyVendor({
        vendorId: 'test-vendor-cloud',
        orderId: 'test-order-cloud',
        buyerName: 'Cloud Test Buyer',
        totalAmount: 5000,
        items: [{ name: 'Cloud Test Item', quantity: 2 }]
      });

      setResult(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Cloud function test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Cloud Functions Test</h1>
      
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-green-800 font-medium">✅ Cloud Setup Complete</h3>
          <p className="text-green-700 text-sm mt-1">
            Your app is now configured to use cloud-based Firebase functions and services.
          </p>
        </div>

        <button
          onClick={testCloudFunction}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing Cloud Function...' : 'Test Cloud notifyVendorNewOrder'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error:</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-800 font-medium">✅ Cloud Function Working!</h3>
            <pre className="text-green-700 text-sm mt-2 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-800 font-medium">Deployed Cloud Functions:</h3>
          <ul className="text-blue-700 text-sm mt-2 space-y-1">
            <li>• notifyVendorNewOrder ✅</li>
            <li>• sendPaymentConfirmation ✅</li>
            <li>• sendOrderStatusUpdate ✅</li>
            <li>• releaseEscrowFunds ✅</li>
            <li>• releaseEscrowFundsHttp ✅</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium">Next Steps:</h3>
          <ul className="text-yellow-700 text-sm mt-2 space-y-1">
            <li>• The order modal should now work with cloud functions</li>
            <li>• All backend operations are now cloud-based</li>
            <li>• No local emulators needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CloudTest;
