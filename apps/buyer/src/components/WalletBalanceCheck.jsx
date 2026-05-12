import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const WalletBalanceCheck = ({ totalAmount, onBalanceCheck, onInsufficientFunds }) => {
  const { currentUser } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        console.log('Fetching wallet balance for user:', currentUser.uid);
        const wallet = await firebaseService.wallet.getUserWallet(currentUser.uid);
        console.log('Wallet data received:', wallet);
        
        const balance = wallet?.balance || 0;
        setWalletBalance(balance);
        console.log('Setting wallet balance to:', balance);
        
        // Check if balance is sufficient
        if (balance >= totalAmount) {
          onBalanceCheck(true);
        } else {
          onInsufficientFunds(balance);
        }
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
        setError('Failed to check wallet balance');
        onBalanceCheck(false);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletBalance();
  }, [currentUser, totalAmount, onBalanceCheck, onInsufficientFunds]);

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-blue-800">Checking wallet balance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <span className="text-red-600 mr-2">⚠️</span>
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  const isSufficient = walletBalance >= totalAmount;
  const shortfall = totalAmount - walletBalance;

  return (
    <div className={`border rounded-lg p-4 mb-6 ${
      isSufficient 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className={`text-2xl mr-3 ${isSufficient ? 'text-green-600' : 'text-red-600'}`}>
            {isSufficient ? '✅' : '⚠️'}
          </span>
          <div>
            <h3 className={`font-medium ${isSufficient ? 'text-green-800' : 'text-red-800'}`}>
              {isSufficient ? 'Wallet Balance Sufficient' : 'Insufficient Funds'}
            </h3>
            <p className={`text-sm ${isSufficient ? 'text-green-700' : 'text-red-700'}`}>
              Current Balance: ₦{walletBalance.toLocaleString()}
            </p>
            {!isSufficient && (
              <p className="text-sm text-red-700">
                Shortfall: ₦{shortfall.toLocaleString()}
              </p>
            )}
          </div>
        </div>
        
        {!isSufficient && (
          <div className="text-right">
            <p className="text-sm text-red-700 mb-2">
              Please fund your wallet to continue
            </p>
            <button
              onClick={() => window.location.href = '/wallet'}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Fund Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletBalanceCheck;
