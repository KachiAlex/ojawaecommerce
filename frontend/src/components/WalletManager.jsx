import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { openWalletTopUpCheckout } from '../utils/paystack';

const NIGERIAN_BANKS = [
  'Access Bank', 'GTBank', 'First Bank', 'UBA', 'Zenith Bank', 'Fidelity Bank',
  'FCMB', 'Sterling Bank', 'Union Bank', 'Wema Bank', 'Polaris Bank', 'Ecobank',
  'Stanbic IBTC', 'Unity Bank', 'Keystone Bank', 'Titan Trust Bank', 'Kuda Bank',
  'Opay', 'VFD Microfinance Bank', 'Globus Bank', 'Premium Trust Bank', 'Other'
];

const MOBILE_MONEY_PROVIDERS = [
  'MTN Mobile Money', 'Airtel Money', '9mobile Money', 'M-Pesa (Safaricom)',
  'Orange Money', 'Tigo Cash', 'Other'
];

const loadSavedBankDetails = (userId) => {
  try {
    const raw = localStorage.getItem(`ojawa_saved_bank_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveBankDetails = (userId, details) => {
  try { localStorage.setItem(`ojawa_saved_bank_${userId}`, JSON.stringify(details)); } catch {}
};

const WalletManager = ({ userType = 'buyer' }) => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferStep, setTransferStep] = useState('form');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferResult, setTransferResult] = useState(null);
  const [transferError, setTransferError] = useState('');
  const [savedBankDetails, setSavedBankDetails] = useState(null);
  const [useSavedDetails, setUseSavedDetails] = useState(false);
  const [transferData, setTransferData] = useState({
    amount: '',
    accountType: 'bank',
    accountNumber: '',
    accountName: '',
    bankName: '',
    provider: ''
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchWalletData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch user's wallet
        let walletData = await apiService.wallet.getUserWallet(currentUser.uid);
        
        // Create wallet if it doesn't exist
        if (!walletData) {
          const walletId = await apiService.wallet.createWallet(currentUser.uid, userType);
          walletData = await apiService.wallet.getUserWallet(currentUser.uid);
        }
        
        setWallet(walletData);
        
        // Fetch wallet transactions
        const transactionsData = await apiService.wallet.getUserTransactions(currentUser.uid);
        setTransactions(transactionsData);

        // Load saved bank details
        setSavedBankDetails(loadSavedBankDetails(currentUser.uid));
        
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

  const refreshWalletData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const walletData = await apiService.wallet.getUserWallet(currentUser.uid);
      setWallet(walletData);
      const transactionsData = await apiService.wallet.getUserTransactions(currentUser.uid);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
    }
  }, [currentUser]);

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
      const updatedWallet = await apiService.wallet.getUserWallet(currentUser.uid);
      setWallet(updatedWallet);
      
      // Refresh transactions
      const updatedTransactions = await apiService.wallet.getUserTransactions(currentUser.uid);
      setTransactions(updatedTransactions);
      
      setShowTopUp(false);
      setTopUpAmount('');
      alert('Wallet topped up successfully!');
      
    } catch (error) {
      console.error('Error topping up wallet:', error);
      alert('Failed to top up wallet. Please try again.');
    }
  };

  const resetTransferForm = () => {
    setTransferData({ amount: '', accountType: 'bank', accountNumber: '', accountName: '', bankName: '', provider: '' });
    setTransferStep('form');
    setTransferResult(null);
    setTransferError('');
    setUseSavedDetails(false);
  };

  const handleUseSavedDetails = () => {
    if (!savedBankDetails) return;
    setTransferData({
      amount: transferData.amount,
      accountType: savedBankDetails.accountType || 'bank',
      accountNumber: savedBankDetails.accountNumber || '',
      accountName: savedBankDetails.accountName || '',
      bankName: savedBankDetails.bankName || '',
      provider: savedBankDetails.provider || ''
    });
    setUseSavedDetails(true);
  };

  const handleTransferSubmit = () => {
    setTransferStep('confirm');
  };

  const handleTransferConfirm = async () => {
    const amount = parseFloat(transferData.amount);
    const walletBalance = parseFloat(wallet?.balance) || 0;

    if (!amount || amount <= 0) { setTransferError('Please enter a valid amount'); setTransferStep('error'); return; }
    if (amount < 1000) { setTransferError('Minimum transfer amount is ₦1,000'); setTransferStep('error'); return; }
    if (amount > walletBalance) { setTransferError(`Insufficient balance. Available: ₦${walletBalance.toLocaleString()}`); setTransferStep('error'); return; }
    if (!transferData.accountNumber || !transferData.accountName) { setTransferError('Please fill in all account details'); setTransferStep('error'); return; }
    if (transferData.accountType === 'bank' && !transferData.bankName) { setTransferError('Please select a bank'); setTransferStep('error'); return; }
    if (transferData.accountType === 'mobile_money' && !transferData.provider) { setTransferError('Please select a mobile money provider'); setTransferStep('error'); return; }

    setTransferLoading(true);
    try {
      const accountDetails = {
        type: transferData.accountType,
        accountNumber: transferData.accountNumber,
        accountName: transferData.accountName,
        bankName: transferData.accountType === 'bank' ? transferData.bankName : null,
        provider: transferData.accountType === 'mobile_money' ? transferData.provider : null
      };

      const transferLabel = transferData.accountType === 'bank' ? transferData.bankName : transferData.provider;

      const result = await apiService.wallet.transferToExternalAccount(
        wallet.id, amount, accountDetails,
        `Transfer to ${transferLabel}`
      );

      // Save bank details for future use
      if (currentUser?.uid) {
        const detailsToSave = {
          accountType: transferData.accountType,
          accountNumber: transferData.accountNumber,
          accountName: transferData.accountName,
          bankName: transferData.bankName,
          provider: transferData.provider
        };
        saveBankDetails(currentUser.uid, detailsToSave);
        setSavedBankDetails(detailsToSave);
      }

      setTransferResult({
        amount,
        reference: result?.data?.reference || 'N/A',
        newBalance: result?.data?.newBalance,
        transferLabel
      });
      setTransferStep('success');
      await refreshWalletData();
    } catch (error) {
      console.error('Error transferring funds:', error);
      setTransferError(error.message || 'Failed to transfer funds. Please try again.');
      setTransferStep('error');
    } finally {
      setTransferLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'NGN') => {
    const num = parseFloat(amount) || 0;
    const cur = String(currency || 'NGN').trim();
    const symbol = cur.includes('₦') ? '₦' : cur === 'NGN' ? '₦' : cur === 'GHS' ? '₵' : cur === 'KES' ? 'KSh' : cur === 'ETB' ? 'Br' : '$';
    return `${symbol}${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getTransactionIcon = (type) => {
    const map = { credit: '💰', debit: '📤', wallet_funding: '🔒', escrow_release: '✅', withdrawal: '🏦', payment: '🛒' };
    return map[type] || '💳';
  };

  const getTransactionColor = (type) => {
    const map = { credit: 'text-green-600', debit: 'text-red-600', wallet_funding: 'text-yellow-600', escrow_release: 'text-blue-600', withdrawal: 'text-purple-600', payment: 'text-orange-600' };
    return map[type] || 'text-gray-600';
  };

  const getTransactionLabel = (type) => {
    const map = { credit: 'Credit', debit: 'Debit', wallet_funding: 'Wallet Funding', escrow_release: 'Escrow Release', withdrawal: 'Withdrawal', payment: 'Payment' };
    return map[type] || type;
  };

  const formatDate = (date) => {
    if (!date) return 'Recent';
    try {
      const d = date?.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'Recent'; }
  };

  const walletBalance = parseFloat(wallet?.balance) || 0;
  const isFormValid = transferData.amount && transferData.accountNumber && transferData.accountName &&
    (transferData.accountType === 'bank' ? transferData.bankName : transferData.provider);

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
            <p className="text-3xl font-bold">{formatCurrency(wallet?.balance || 0, wallet?.currency)}</p>
            <p className="text-emerald-100 text-sm mt-1">Available Balance</p>
          </div>
          <div className="text-right">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2 bg-white/10 border border-white/30 backdrop-blur">
              <span className="text-2xl">💳</span>
            </div>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${wallet?.status === 'active' || wallet?.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {wallet?.status || (wallet?.isActive ? 'active' : 'Unknown')}
            </span>
          </div>
        </div>
        <div className="flex gap-3 mt-6 flex-wrap">
          <button onClick={() => setShowTopUp(true)} className="ojawa-pill text-sm font-semibold px-4 py-2 rounded-lg hover:-translate-y-0.5">
            💰 Top Up Wallet
          </button>
          <button onClick={() => { setShowTransfer(true); resetTransferForm(); }} className="ojawa-pill text-sm font-semibold px-4 py-2 rounded-lg hover:-translate-y-0.5">
            🏦 Transfer to Bank
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

      {/* Transfer Modal - Multi-step */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            {/* Step indicator */}
            {transferStep !== 'success' && transferStep !== 'error' && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className={`h-2 w-12 rounded-full ${transferStep === 'form' ? 'bg-emerald-500' : 'bg-emerald-300'}`}></div>
                <div className={`h-2 w-12 rounded-full ${transferStep === 'confirm' ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
              </div>
            )}

            {/* FORM STEP */}
            {transferStep === 'form' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Transfer to Bank</h3>
                  <button onClick={() => { setShowTransfer(false); resetTransferForm(); }} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="space-y-4">
                  {/* Saved bank details quick-fill */}
                  {savedBankDetails && !useSavedDetails && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600">💾</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Use saved details</p>
                            <p className="text-xs text-gray-500">
                              {savedBankDetails.bankName || savedBankDetails.provider} • {savedBankDetails.accountNumber}
                            </p>
                          </div>
                        </div>
                        <button onClick={handleUseSavedDetails} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                          Use
                        </button>
                      </div>
                    </div>
                  )}

                  {useSavedDetails && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700 flex items-center justify-between">
                      <span>✓ Using saved account details</span>
                      <button onClick={() => setUseSavedDetails(false)} className="text-blue-600 hover:underline">Change</button>
                    </div>
                  )}

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">₦</span>
                      <input type="number" value={transferData.amount}
                        onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="0.00" min="1000" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Min: ₦1,000</span>
                      <span>Available: {formatCurrency(wallet?.balance || 0)}</span>
                    </div>
                    {/* Quick amount buttons */}
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[1000, 5000, 10000, 50000].map(v => (
                        <button key={v} type="button" onClick={() => setTransferData({ ...transferData, amount: String(v) })}
                          className={`p-1.5 border rounded-lg text-xs hover:bg-gray-50 ${transferData.amount === String(v) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300'}`}>
                          ₦{v >= 1000 ? `${v / 1000}k` : v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Account Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transfer To</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button"
                        onClick={() => setTransferData({ ...transferData, accountType: 'bank', provider: '', bankName: '' })}
                        className={`p-3 border rounded-lg text-center transition-colors ${transferData.accountType === 'bank' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300 hover:bg-gray-50'}`}>
                        🏦<br /><span className="text-sm font-medium">Bank Account</span>
                      </button>
                      <button type="button"
                        onClick={() => setTransferData({ ...transferData, accountType: 'mobile_money', bankName: '' })}
                        className={`p-3 border rounded-lg text-center transition-colors ${transferData.accountType === 'mobile_money' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300 hover:bg-gray-50'}`}>
                        📱<br /><span className="text-sm font-medium">Mobile Money</span>
                      </button>
                    </div>
                  </div>

                  {/* Bank Selection */}
                  {transferData.accountType === 'bank' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Bank</label>
                      <select value={transferData.bankName}
                        onChange={(e) => setTransferData({ ...transferData, bankName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option value="">Choose your bank</option>
                        {NIGERIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Mobile Money Provider */}
                  {transferData.accountType === 'mobile_money' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Provider</label>
                      <select value={transferData.provider}
                        onChange={(e) => setTransferData({ ...transferData, provider: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option value="">Choose provider</option>
                        {MOBILE_MONEY_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Account Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {transferData.accountType === 'bank' ? 'Account Number' : 'Phone Number'}
                    </label>
                    <input type="text" value={transferData.accountNumber}
                      onChange={(e) => setTransferData({ ...transferData, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder={transferData.accountType === 'bank' ? '0123456789' : '+234 801 234 5678'} />
                  </div>

                  {/* Account Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                    <input type="text" value={transferData.accountName}
                      onChange={(e) => setTransferData({ ...transferData, accountName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Full name as registered" />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button onClick={handleTransferSubmit} disabled={!isFormValid}
                      className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      Continue
                    </button>
                    <button onClick={() => { setShowTransfer(false); resetTransferForm(); }}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* CONFIRM STEP */}
            {transferStep === 'confirm' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Transfer</h3>
                  <button onClick={() => setTransferStep('form')} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Amount</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(transferData.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Transfer To</span>
                      <span className="text-sm font-medium text-gray-900">
                        {transferData.accountType === 'bank' ? transferData.bankName : transferData.provider}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Account Number</span>
                      <span className="text-sm font-medium text-gray-900">{transferData.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Account Name</span>
                      <span className="text-sm font-medium text-gray-900">{transferData.accountName}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-sm text-gray-500">Current Balance</span>
                      <span className="text-sm text-gray-700">{formatCurrency(wallet?.balance || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Balance After Transfer</span>
                      <span className="text-sm font-medium text-emerald-600">
                        {formatCurrency((parseFloat(wallet?.balance) || 0) - (parseFloat(transferData.amount) || 0))}
                      </span>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600">⚠️</span>
                      <div className="text-xs text-yellow-800">
                        <p>Please verify all details are correct. Transfers are processed within 1-3 business days.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button onClick={handleTransferConfirm} disabled={transferLoading}
                      className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50">
                      {transferLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Processing...
                        </span>
                      ) : 'Confirm Transfer'}
                    </button>
                    <button onClick={() => setTransferStep('form')} disabled={transferLoading}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50">
                      Back
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* SUCCESS STEP */}
            {transferStep === 'success' && transferResult && (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">✅</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Transfer Successful!</h3>
                <p className="text-sm text-gray-500 mb-4">Your withdrawal request has been submitted.</p>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-left mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Amount</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(transferResult.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Transfer To</span>
                    <span className="text-sm font-medium text-gray-900">{transferResult.transferLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Reference</span>
                    <span className="text-sm font-mono text-gray-700">{transferResult.reference}</span>
                  </div>
                  {transferResult.newBalance !== undefined && transferResult.newBalance !== null && (
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm text-gray-500">New Balance</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(transferResult.newBalance)}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-400 mb-4">Funds will be credited within 1-3 business days. You'll be notified when the transfer is completed.</p>

                <button onClick={() => { setShowTransfer(false); resetTransferForm(); }}
                  className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                  Done
                </button>
              </div>
            )}

            {/* ERROR STEP */}
            {transferStep === 'error' && (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">❌</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Transfer Failed</h3>
                <p className="text-sm text-red-600 mb-4">{transferError}</p>
                <div className="flex gap-3">
                  <button onClick={() => setTransferStep('form')}
                    className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                    Try Again
                  </button>
                  <button onClick={() => { setShowTransfer(false); resetTransferForm(); }}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50">
                    Close
                  </button>
                </div>
              </div>
            )}
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
                      <p className="font-medium text-gray-900">{transaction.description || getTransactionLabel(transaction.type)}</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${getTransactionColor(transaction.type)}`}>
                      {transaction.type === 'credit' || transaction.type === 'escrow_release' ? '+' : '-'}{formatCurrency(transaction.amount, wallet?.currency)}
                    </p>
                    {transaction.status && (
                      <p className="text-xs text-gray-500 capitalize">{transaction.status}</p>
                    )}
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
