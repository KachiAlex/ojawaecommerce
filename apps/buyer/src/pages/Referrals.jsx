import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const Referrals = () => {
  const { currentUser } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadReferralData();
    }
  }, [currentUser, loadReferralData]);

  const loadReferralData = useCallback(async () => {
    try {
      setLoading(true);
      // Generate or get referral code
      const code = await firebaseService.referrals.generateReferralCode(currentUser.uid);
      setReferralCode(code);

      // Get referral stats
      const stats = await firebaseService.referrals.getReferralStats(currentUser.uid);
      setReferralStats(stats);
    } catch (error) {
      console.error('Error loading referral data:', error);
      setMessage('Failed to load referral data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const handleApplyReferralCode = async (e) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      setMessage('Please enter a referral code');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const result = await firebaseService.referrals.applyReferralCode(currentUser.uid, inputCode.trim().toUpperCase());
      
      if (result.success) {
        setMessage('Referral code applied successfully!');
        setInputCode('');
        // Reload stats
        await loadReferralData();
      } else {
        setMessage(result.message || 'Failed to apply referral code');
      }
    } catch (error) {
      console.error('Error applying referral code:', error);
      setMessage('Failed to apply referral code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    
    try {
      const shareText = `Join Ojawa E-commerce using my referral code: ${referralCode}\n\n${window.location.origin}/register?ref=${referralCode}`;
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const shareLink = referralCode ? `${window.location.origin}/register?ref=${referralCode}` : '';

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🎁</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access your referral program</p>
          <a
            href="/login"
            className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Program</h1>
          <p className="text-gray-600">Invite friends and earn rewards!</p>
        </div>

        {loading && !referralCode ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        ) : (
          <>
            {/* Your Referral Code */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Referral Code</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-100 rounded-lg p-4 border-2 border-emerald-500">
                  <p className="text-sm text-gray-600 mb-1">Share this code with friends:</p>
                  <p className="text-2xl font-bold text-emerald-600">{referralCode || 'Loading...'}</p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                  disabled={!referralCode}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>

              {shareLink && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Or share this link:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 bg-gray-100 rounded-lg px-4 py-2 text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareLink);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Referral Stats */}
            {referralStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-3xl font-bold text-gray-900">{referralStats.totalReferrals || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Referrals</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                  <div className="text-4xl mb-2">💰</div>
                  <p className="text-3xl font-bold text-gray-900">₦{referralStats.totalRewards?.toLocaleString() || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Rewards</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                  <div className="text-4xl mb-2">🎯</div>
                  <p className="text-3xl font-bold text-gray-900">
                    {referralStats.referrals?.filter(r => r.status === 'completed').length || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Completed</p>
                </div>
              </div>
            )}

            {/* Apply Referral Code */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Apply Referral Code</h2>
              <p className="text-sm text-gray-600 mb-4">
                Have a referral code? Enter it below to support a friend and earn rewards!
              </p>
              <form onSubmit={handleApplyReferralCode} className="flex gap-4">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Enter referral code"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !inputCode.trim()}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Applying...' : 'Apply'}
                </button>
              </form>
              {message && (
                <div className={`mt-4 p-3 rounded-lg ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {message}
                </div>
              )}
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">How It Works</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Share Your Code</h3>
                    <p className="text-sm text-gray-600">Share your unique referral code with friends and family</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">They Sign Up</h3>
                    <p className="text-sm text-gray-600">Your friends sign up using your referral code</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">You Earn Rewards</h3>
                    <p className="text-sm text-gray-600">Earn rewards when your referrals make their first purchase</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Referrals;

