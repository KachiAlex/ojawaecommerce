import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MobileBottomSheet from './MobileBottomSheet';

const CryptoPayment = ({ isOpen, onClose, amount, onSuccess, onError }) => {
  const { currentUser } = useAuth();
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [cryptoAmount, setCryptoAmount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [walletAddress, setWalletAddress] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [loading, setLoading] = useState(false);

  const cryptocurrencies = [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      icon: '₿',
      color: 'bg-orange-500'
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      icon: 'Ξ',
      color: 'bg-blue-500'
    },
    {
      id: 'usdt',
      name: 'Tether',
      symbol: 'USDT',
      icon: '₮',
      color: 'bg-green-500'
    },
    {
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      icon: '💵',
      color: 'bg-blue-600'
    }
  ];

  useEffect(() => {
    if (isOpen && amount) {
      fetchExchangeRate();
      generateWalletAddress();
    }
  }, [isOpen, amount, selectedCrypto]);

  const fetchExchangeRate = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from a crypto API
      const rates = {
        bitcoin: 0.000025,
        ethereum: 0.0004,
        usdt: 1,
        usdc: 1
      };
      
      const rate = rates[selectedCrypto] || 0;
      setExchangeRate(rate);
      setCryptoAmount(amount * rate);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      onError('Failed to fetch exchange rate');
    } finally {
      setLoading(false);
    }
  };

  const generateWalletAddress = () => {
    // In a real implementation, this would generate a unique wallet address
    const addresses = {
      bitcoin: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      ethereum: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      usdt: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
      usdc: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
    };
    
    setWalletAddress(addresses[selectedCrypto] || '');
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setPaymentStatus('processing');
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // In a real implementation, this would verify the transaction on the blockchain
      setPaymentStatus('completed');
      onSuccess({
        transactionId: `crypto_${Date.now()}`,
        amount: cryptoAmount,
        currency: selectedCrypto,
        walletAddress
      });
      
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      onError('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Show success message
  };

  const generateQRCode = () => {
    // In a real implementation, this would generate a QR code
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  };

  const isMobile = window.innerWidth < 768;

  const content = (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Crypto Payment</h3>
        <p className="text-gray-600">Pay with cryptocurrency</p>
      </div>

      {/* Amount Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">Amount to Pay</p>
          <p className="text-2xl font-bold text-gray-900">₦{amount?.toLocaleString()}</p>
        </div>
      </div>

      {/* Cryptocurrency Selection */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Select Cryptocurrency</h4>
        <div className="grid grid-cols-2 gap-3">
          {cryptocurrencies.map((crypto) => (
            <button
              key={crypto.id}
              onClick={() => setSelectedCrypto(crypto.id)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                selectedCrypto === crypto.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 ${crypto.color} rounded-full flex items-center justify-center text-white font-bold`}>
                  {crypto.icon}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{crypto.name}</p>
                  <p className="text-xs text-gray-500">{crypto.symbol}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Details */}
      {selectedCrypto && (
        <div className="space-y-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Amount to Send</span>
              <span className="text-sm text-gray-900">{cryptoAmount.toFixed(8)} {cryptocurrencies.find(c => c.id === selectedCrypto)?.symbol}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Exchange Rate</span>
              <span className="text-sm text-gray-900">1 {cryptocurrencies.find(c => c.id === selectedCrypto)?.symbol} = ₦{(1/exchangeRate).toLocaleString()}</span>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Send to Address</h4>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={walletAddress}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(walletAddress)}
                className="px-3 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
              >
                Copy
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-2">QR Code</h4>
            <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
              <img
                src={generateQRCode()}
                alt="Payment QR Code"
                className="w-32 h-32"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Scan to pay</p>
          </div>
        </div>
      )}

      {/* Payment Status */}
      {paymentStatus === 'processing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-800">Processing payment...</span>
          </div>
        </div>
      )}

      {paymentStatus === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-800">Payment completed successfully!</span>
          </div>
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm text-red-800">Payment failed. Please try again.</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handlePayment}
          disabled={loading || paymentStatus === 'processing'}
          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Confirm Payment'}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">Payment Instructions</h4>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• Send exactly {cryptoAmount.toFixed(8)} {cryptocurrencies.find(c => c.id === selectedCrypto)?.symbol}</li>
          <li>• Use the provided wallet address</li>
          <li>• Payment will be confirmed automatically</li>
          <li>• Transaction may take 10-30 minutes to confirm</li>
        </ul>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Crypto Payment"
        snapPoints={[0.8, 0.95]}
      >
        {content}
      </MobileBottomSheet>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative ml-auto mr-auto mt-20 max-w-md bg-white rounded-lg shadow-xl">
        {content}
      </div>
    </div>
  );
};

export default CryptoPayment;
