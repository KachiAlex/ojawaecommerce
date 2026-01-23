import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import { openWalletTopUpCheckout } from '../utils/paystack';

const WalletManager = ({ userType = 'buyer' }) => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferData, setTransferData] = useState({
    amount: '',
    accountType: 'bank', // 'bank' or 'mobile_money'
    accountNumber: '',
    accountName: '',
    bankName: '',
    provider: '' // For mobile money (MTN, Airtel, etc.)
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchWalletData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch user's wallet
        let walletData = await firebaseService.wallet.getUserWallet(currentUser.uid);
        
        // Create wallet if it doesn't exist
        if (!walletData) {
          const walletId = await firebaseService.wallet.createWallet(currentUser.uid, userType);
          walletData = await firebaseService.wallet.getUserWallet(currentUser.uid);
        }
        
        setWallet(walletData);
        
        // Fetch wallet transactions
        const transactionsData = await firebaseService.wallet.getUserTransactions(currentUser.uid);
        setTransactions(transactionsData);
        
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        // Fallback wallet for demo
        setWallet({ balance: 0, currency: 'NGN', status: 'active' });
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [currentUser, userType]);

  const handleTopUp = async () => {
    if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const amount = parseFloat(topUpAmount);
      // Launch Paystack Checkout
      await openWalletTopUpCheckout({ user: currentUser, amount, currency: wallet?.currency || 'NGN' });
      
      // Refresh wallet data
      const updatedWallet = await firebaseService.wallet.getUserWallet(currentUser.uid);
      setWallet(updatedWallet);
      
      // Refresh transactions
      const updatedTransactions = await firebaseService.wallet.getUserTransactions(currentUser.uid);
      setTransactions(updatedTransactions);
      
      setShowTopUp(false);
      setTopUpAmount('');
      alert('Wallet topped up successfully!');
      
    } catch (error) {
      console.error('Error topping up wallet:', error);
      alert('Failed to top up wallet. Please try again.');
    }
  };

  const handleTransfer = async () => {
    if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!transferData.accountNumber || !transferData.accountName) {
      alert('Please fill in all account details');
      return;
    }

    if (transferData.accountType === 'bank' && !transferData.bankName) {
      alert('Please select a bank');
      return;
    }

    if (transferData.accountType === 'mobile_money' && !transferData.provider) {
      alert('Please select a mobile money provider');
      return;
    }

    if (!wallet || !wallet.id) {
      alert('Wallet not found. Please refresh the page.');
      return;
    }

    const amount = parseFloat(transferData.amount);
    const processingFee = Math.max(100, amount * 0.015);
    const netAmount = amount - processingFee;

    if (amount > wallet.balance) {
      alert('Insufficient wallet balance');
      return;
    }

    if (amount < 1000) {
      alert('Minimum transfer amount is ₦1,000');
      return;
    }

    try {
      const accountDetails = {
        type: transferData.accountType,
        accountNumber: transferData.accountNumber,
        accountName: transferData.accountName,
        bankName: transferData.accountType === 'bank' ? transferData.bankName : null,
        provider: transferData.accountType === 'mobile_money' ? transferData.provider : null
      };

      const result = await firebaseService.wallet.transferToExternalAccount(
        wallet.id,
        amount,
        accountDetails,
        `Transfer to ${transferData.accountType === 'bank' ? transferData.bankName : transferData.provider}`
      );

      // Refresh wallet data
      const updatedWallet = await firebaseService.wallet.getUserWallet(currentUser.uid);
      setWallet(updatedWallet);

      // Refresh transactions
      const updatedTransactions = await firebaseService.wallet.getUserTransactions(currentUser.uid);
      setTransactions(updatedTransactions);

      setShowTransfer(false);
      setTransferData({
        amount: '',
        accountType: 'bank',
        accountNumber: '',
        accountName: '',
        bankName: '',
        provider: ''
      });

      alert(`Transfer initiated successfully!\nAmount: ₦${amount.toLocaleString()}\nFee: ₦${processingFee.toLocaleString()}\nNet Amount: ₦${netAmount.toLocaleString()}\n\nFunds will be credited within 1-3 business days.`);

    } catch (error) {
      console.error('Error transferring funds:', error);
      alert('Failed to transfer funds. Please try again.');
    }
  };

  const resetTransferForm = () => {
    setTransferData({
      amount: '',
      accountType: 'bank',
      accountNumber: '',
      accountName: '',
      bankName: '',
      provider: ''
    });
  };

  const formatCurrency = (amount, currency = 'NGN') => {
    const symbol = currency === 'NGN' ? '₦' : currency === 'GHS' ? '₵' : currency === 'KES' ? 'KSh' : currency === 'ETB' ? 'Br' : '$';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'credit': return '💰';
      case 'debit': return '📤';
      case 'wallet_funding': return '🔒';
      case 'wallet_release': return '✅';
      case 'withdrawal': return '🏦';
      default: return '💳';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'credit': return 'text-green-600';
      case 'debit': return 'text-red-600';
      case 'wallet_funding': return 'text-yellow-600';
      case 'wallet_release': return 'text-blue-600';
      case 'withdrawal': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm font-medium">
              {userType === 'buyer' ? 'Buyer' : userType === 'vendor' ? 'Vendor' : 'Logistics'} Wallet
            </p>
            <p className="text-3xl font-bold">
              {formatCurrency(wallet?.balance || 0, wallet?.currency)}
            </p>
            <p className="text-emerald-100 text-sm mt-1">
              Available Balance
            </p>
          </div>
          <div className="text-right">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2 bg-white/10 border border-white/30 backdrop-blur">
              <span className="text-2xl">💳</span>
            </div>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              wallet?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {wallet?.status || 'Unknown'}
            </span>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6 flex-wrap">
          <button
            onClick={() => setShowTopUp(true)}
            className="ojawa-pill text-sm font-semibold px-4 py-2 rounded-lg hover:-translate-y-0.5"
          >
            💰 Top Up Wallet
          </button>
          <button
            onClick={() => setShowTransfer(true)}
            className="ojawa-pill text-sm font-semibold px-4 py-2 rounded-lg hover:-translate-y-0.5"
          >
            🏦 Transfer Funds
          </button>
        </div>
      </div>

      {/* Top Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Up Wallet</h3>
              <button 
                onClick={() => setShowTopUp(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₦</span>
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="0.00"
                    min="100"
                    step="100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum: ₦100</p>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setTopUpAmount('1000')}
                  className="p-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  ₦1,000
                </button>
                <button 
                  onClick={() => setTopUpAmount('5000')}
                  className="p-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  ₦5,000
                </button>
                <button 
                  onClick={() => setTopUpAmount('10000')}
                  className="p-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  ₦10,000
                </button>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleTopUp}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700"
                >
                  Add Funds
                </button>
                <button
                  onClick={() => setShowTopUp(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Transfer Funds</h3>
              <button 
                onClick={() => {
                  setShowTransfer(false);
                  resetTransferForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₦</span>
                  <input
                    type="number"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="0.00"
                    min="1000"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Minimum: ₦1,000</span>
                  <span>Available: {formatCurrency(wallet?.balance || 0)}</span>
                </div>
                {transferData.amount && (
                  <div className="text-xs text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                    <div className="flex justify-between">
                      <span>Transfer Amount:</span>
                      <span>₦{parseFloat(transferData.amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing Fee (1.5%):</span>
                      <span>₦{Math.max(100, parseFloat(transferData.amount || 0) * 0.015).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1 mt-1">
                      <span>You'll receive:</span>
                      <span>₦{(parseFloat(transferData.amount || 0) - Math.max(100, parseFloat(transferData.amount || 0) * 0.015)).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transfer To</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferData({...transferData, accountType: 'bank', provider: '', bankName: ''})}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      transferData.accountType === 'bank' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    🏦<br />
                    <span className="text-sm font-medium">Bank Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferData({...transferData, accountType: 'mobile_money', bankName: ''})}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      transferData.accountType === 'mobile_money' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    📱<br />
                    <span className="text-sm font-medium">Mobile Money</span>
                  </button>
                </div>
              </div>

              {/* Bank Selection */}
              {transferData.accountType === 'bank' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Bank</label>
                  <select
                    value={transferData.bankName}
                    onChange={(e) => setTransferData({...transferData, bankName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Choose your bank</option>
                    <option value="Access Bank">Access Bank</option>
                    <option value="GTBank">GTBank</option>
                    <option value="First Bank">First Bank</option>
                    <option value="UBA">UBA</option>
                    <option value="Zenith Bank">Zenith Bank</option>
                    <option value="Fidelity Bank">Fidelity Bank</option>
                    <option value="FCMB">FCMB</option>
                    <option value="Sterling Bank">Sterling Bank</option>
                    <option value="Union Bank">Union Bank</option>
                    <option value="Wema Bank">Wema Bank</option>
                    <option value="Polaris Bank">Polaris Bank</option>
                    <option value="Ecobank">Ecobank</option>
                    <option value="Stanbic IBTC">Stanbic IBTC</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {/* Mobile Money Provider */}
              {transferData.accountType === 'mobile_money' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Provider</label>
                  <select
                    value={transferData.provider}
                    onChange={(e) => setTransferData({...transferData, provider: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Choose provider</option>
                    <option value="MTN Mobile Money">MTN Mobile Money</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="9mobile Money">9mobile Money</option>
                    <option value="M-Pesa">M-Pesa (Safaricom)</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Tigo Cash">Tigo Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {transferData.accountType === 'bank' ? 'Account Number' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={transferData.accountNumber}
                  onChange={(e) => setTransferData({...transferData, accountNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder={transferData.accountType === 'bank' ? '0123456789' : '+234 801 234 5678'}
                />
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                <input
                  type="text"
                  value={transferData.accountName}
                  onChange={(e) => setTransferData({...transferData, accountName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Full name as registered"
                />
              </div>

              {/* Important Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600">⚠️</span>
                  <div className="text-xs text-yellow-800">
                    <p className="font-medium mb-1">Important:</p>
                    <ul className="space-y-1">
                      <li>• Transfers are processed within 1-3 business days</li>
                      <li>• Processing fee: 1.5% (minimum ₦100)</li>
                      <li>• Ensure account details are correct</li>
                      <li>• Failed transfers may incur additional charges</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleTransfer}
                  disabled={!transferData.amount || !transferData.accountNumber || !transferData.accountName || 
                           (transferData.accountType === 'bank' && !transferData.bankName) ||
                           (transferData.accountType === 'mobile_money' && !transferData.provider)}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Transfer Funds
                </button>
                <button
                  onClick={() => {
                    setShowTransfer(false);
                    resetTransferForm();
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        
        <div className="p-6">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💳</span>
              </div>
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">
                {userType === 'buyer' ? 'Make your first purchase to see transactions here' : 
                 userType === 'vendor' ? 'Start selling to see earnings here' : 
                 'Complete deliveries to see payments here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      <span className="text-lg">{getTransactionIcon(transaction.type)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description || transaction.type}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.createdAt?.toDate ? transaction.createdAt.toDate().toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${getTransactionColor(transaction.type)}`}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount, wallet?.currency)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Balance: {formatCurrency(transaction.balanceAfter || 0, wallet?.currency)}
                    </p>
                  </div>
                </div>
              ))}
              
              {transactions.length > 5 && (
                <div className="text-center pt-4">
                  <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                    View All Transactions
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Wallet Features */}
      <div className="bg-white rounded-xl border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Wallet Features</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <span className="text-emerald-600 text-xl">🛡️</span>
              <div>
                <p className="font-medium text-gray-900">Protected Payments</p>
                <p className="text-sm text-gray-600">
                  {userType === 'buyer' ? 'Your money is safe until delivery' : 
                   userType === 'vendor' ? 'Get paid when customers confirm' : 
                   'Receive payments for completed deliveries'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-600 text-xl">⚡</span>
              <div>
                <p className="font-medium text-gray-900">Instant Transfers</p>
                <p className="text-sm text-gray-600">
                  {userType === 'buyer' ? 'Quick checkout with wallet balance' : 
                   userType === 'vendor' ? 'Fast payouts to your account' : 
                   'Quick payments for delivery services'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-green-600 text-xl">📊</span>
              <div>
                <p className="font-medium text-gray-900">Transaction History</p>
                <p className="text-sm text-gray-600">Complete record of all wallet activities</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <span className="text-purple-600 text-xl">🔒</span>
              <div>
                <p className="font-medium text-gray-900">Secure & Encrypted</p>
                <p className="text-sm text-gray-600">Bank-level security for all transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletManager;
