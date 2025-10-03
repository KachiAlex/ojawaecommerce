import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { openWalletTopUpCheckout } from '../utils/flutterwave';

const FlutterwaveTest = () => {
  const { currentUser } = useAuth();
  const [amount, setAmount] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleTestPayment = async () => {
    if (!currentUser) {
      setError('Please log in first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      const paymentResult = await openWalletTopUpCheckout({
        user: currentUser,
        amount: parseFloat(amount),
        currency: 'NGN'
      });

      setResult(paymentResult);
    } catch (err) {
      setError(err.message);
      console.error('Payment test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Flutterwave Integration Test</h1>
      
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Amount (NGN)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="1000"
            min="100"
          />
        </div>

        <button
          onClick={handleTestPayment}
          disabled={loading || !currentUser}
          className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Test Flutterwave Payment'}
        </button>

        {!currentUser && (
          <p className="text-red-600 text-sm">Please log in to test payments</p>
        )}

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
          <h3 className="text-blue-800 font-medium">Test Instructions:</h3>
          <ul className="text-blue-700 text-sm mt-2 space-y-1">
            <li>• Use test card: 4187427415564246</li>
            <li>• CVV: 828</li>
            <li>• Expiry: 09/32</li>
            <li>• PIN: 3310</li>
            <li>• OTP: 12345</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FlutterwaveTest;
