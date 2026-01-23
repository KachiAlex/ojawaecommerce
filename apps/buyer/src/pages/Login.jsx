import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const testModeEnabled = import.meta.env?.VITE_TEST_MODE === 'true';
const defaultTestEmail = 'onyedika.akoma@gmail.com';
const defaultTestPassword = 'dikaoliver2660';
const testCredentials = testModeEnabled
  ? {
      email: import.meta.env?.VITE_E2E_TEST_EMAIL || defaultTestEmail,
      password: import.meta.env?.VITE_E2E_TEST_PASSWORD || defaultTestPassword,
    }
  : null;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Default to role selection (centralized login/signup chooser)
  const [userType, setUserType] = useState(testModeEnabled ? 'existing' : '');
  const [autoLoginTriggered, setAutoLoginTriggered] = useState(false);
  const [verificationState, setVerificationState] = useState({
    pending: false,
    email: '',
    provider: null
  });
  const [resendStatus, setResendStatus] = useState('idle');
  const [lastAttemptCredentials, setLastAttemptCredentials] = useState({
    email: '',
    password: ''
  });
  
  const { 
    signin, 
    signInWithGoogle, 
    resendVerificationEmailWithPassword,
    lastVerificationEmailSentAt
  } = useAuth();
  const { getIntendedDestination } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  
  const message = location.state?.message || new URLSearchParams(location.search).get('message');
  const from = location.state?.from?.pathname || '/dashboard';
  const preselectedUserType = location.state?.userType;

  // Set preselected user type from navigation state
  useEffect(() => {
    if (preselectedUserType && !userType) {
      setUserType(preselectedUserType);
    }
  }, [preselectedUserType]);

  const canResendVerification = () => {
    if (!lastVerificationEmailSentAt) return true;
    const lastSent = new Date(lastVerificationEmailSentAt).getTime();
    if (Number.isNaN(lastSent)) return true;
    return Date.now() - lastSent > 60000; // 1 minute cooldown
  };

  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setVerificationState({ pending: false, email: '', provider: null });
    setResendStatus('idle');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      setLastAttemptCredentials({ email, password });
      
      console.log('🔐 Attempting login for:', email);
      await signin(email, password);
      console.log('✅ Login successful');
      
      // Check for pending vendor message first (highest priority)
      try {
        const pendingMessage = sessionStorage.getItem('pendingVendorMessage');
        if (pendingMessage) {
          const { vendorId, timestamp } = JSON.parse(pendingMessage);
          // Only redirect to messages if less than 5 minutes old
          if (Date.now() - timestamp < 300000 && vendorId) {
            console.log('📍 Redirecting to messages with vendor:', vendorId);
            navigate('/messages');
            return;
          }
        }
      } catch (err) {
        console.error('Error checking pending vendor message:', err);
      }
      
      // Check for intended destination from cart context
      const intendedDestination = getIntendedDestination();
      if (intendedDestination) {
        console.log('📍 Navigating to intended destination:', intendedDestination.path);
        // Navigate to the intended destination (e.g., checkout, product page)
        navigate(intendedDestination.path);
      } else {
        console.log('📍 Navigating to:', from);
        // Use the standard redirect from location state
        navigate(from);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', error);
      
      // Display more specific error messages
      let errorMessage = 'Failed to sign in. Please check your credentials.';

      if (error.code === 'auth/email-not-verified') {
        setVerificationState({ pending: true, email: error.email || email, provider: 'password' });
        errorMessage = 'Please verify your email address before signing in.';
      }
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address. Please register first.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again or reset your password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Contact support.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials or register a new account.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [email, password, signin, getIntendedDestination, navigate, from]);

  const handleResendVerification = async () => {
    if (!verificationState.pending || resendStatus === 'sending') return;
    
    if (!canResendVerification()) {
      setResendStatus('cooldown');
      return;
    }

    if (verificationState.provider !== 'password') {
      setResendStatus('unsupported');
      setError('Please re-attempt sign in to trigger another verification email.');
      return;
    }

    const credentials = lastAttemptCredentials.email ? lastAttemptCredentials : { email, password };
    if (!credentials.email || !credentials.password) {
      setResendStatus('error');
      setError('Please enter your email and password, then click Sign In before resending.');
      return;
    }

    try {
      setResendStatus('sending');
      const result = await resendVerificationEmailWithPassword(credentials.email, credentials.password);
      if (result?.alreadyVerified) {
        setVerificationState({ pending: false, email: '', provider: null });
        setResendStatus('verified');
        setError('Email already verified. Please sign in again.');
        return;
      }
      setResendStatus('sent');
    } catch (err) {
      console.error('Failed to resend verification email:', err);
      setResendStatus('error');
      setError(err.message || 'Failed to resend verification email. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setGoogleLoading(true);
      
      console.log('🔐 Starting Google Sign-In with userType:', userType);
      const user = await signInWithGoogle(userType === 'existing' ? 'buyer' : userType);
      
      if (user) {
        console.log('✅ Google Sign-In successful');
        
        // Check for pending vendor message first (highest priority)
        try {
          const pendingMessage = sessionStorage.getItem('pendingVendorMessage');
          if (pendingMessage) {
            const { vendorId, timestamp } = JSON.parse(pendingMessage);
            // Only redirect to messages if less than 5 minutes old
            if (Date.now() - timestamp < 300000 && vendorId) {
              console.log('📍 Redirecting to messages with vendor:', vendorId);
              navigate('/messages');
              return;
            }
          }
        } catch (err) {
          console.error('Error checking pending vendor message:', err);
        }
        
        // Check for intended destination from cart context
        const intendedDestination = getIntendedDestination();
        if (intendedDestination) {
          console.log('📍 Navigating to intended destination:', intendedDestination.path);
          navigate(intendedDestination.path);
        } else {
          console.log('📍 Navigating to:', from);
          navigate(from);
        }
      }
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', error);
      
      let errorMessage = 'Failed to sign in with Google. Please try again.';
      
      // Handle specific error codes
      if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked by your browser. Please allow popups for this site or try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email. Please sign in with email/password.';
      } else if (error.code === 'auth/email-not-verified') {
        setVerificationState({ pending: true, email: error.email || email, provider: 'google' });
        setError('Please verify your Google email address via the link we just sent.');
        return;
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.log('User cancelled Google Sign-In');
        // Don't show error for user cancellation
        return;
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('Google Sign-In was cancelled');
        // Don't show error for user cancellation
        return;
      } else if (error.code === 'auth/timeout') {
        errorMessage = 'Sign-in timed out. Please try again or check your connection.';
      } else if (error.message) {
        // Use the provided error message if available
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.verificationEmail) {
      setVerificationState({
        pending: true,
        email: location.state.verificationEmail,
        provider: 'password'
      });
    }
  }, [location.state?.verificationEmail]);

  const verificationDescription = verificationState.provider === 'google'
    ? 'Open the inbox for this Google account and click the verification link to continue.'
    : 'Open your inbox and click the link we sent to activate wallet protection.';

  const resendButtonLabel = (() => {
    if (resendStatus === 'sent') return 'Verification email re-sent!';
    if (resendStatus === 'sending') return 'Sending...';
    if (resendStatus === 'cooldown') return 'Please wait a minute before resending';
    if (resendStatus === 'verified') return 'Email verified! Sign in again.';
    return 'Resend verification email';
  })();

  useEffect(() => {
    if (!testModeEnabled || autoLoginTriggered) return;
    if (userType !== 'existing') return;
    if (!testCredentials?.email || !testCredentials?.password) return;

    setEmail(testCredentials.email);
    setPassword(testCredentials.password);

    const timer = setTimeout(() => {
      setAutoLoginTriggered(true);
      handleSubmit({ preventDefault: () => {} });
    }, 150);

    return () => clearTimeout(timer);
  }, [autoLoginTriggered, userType, setEmail, setPassword, handleSubmit]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-8 px-4">
      <div className="max-w-lg mx-auto w-full">
        {!userType ? (
          /* User Type Selection */
          <div className="bg-slate-900 rounded-xl shadow-lg border border-emerald-900/60 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-900/40 border border-emerald-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-emerald-400 text-2xl">👋</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Ojawa</h2>
              <p className="text-sm text-teal-200 mb-6">Choose how you'd like to join our marketplace</p>
            
            <div className="space-y-4">
              <button
                onClick={() => setUserType('buyer')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 mb-3">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">I'm a Buyer</h3>
                  <p className="text-sm text-gray-600 mb-2">Shop from trusted vendors across Africa</p>
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Wallet Protected</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Free to Join</span>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setUserType('vendor')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 mb-3">
                    <span className="text-2xl">🏪</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">I'm a Vendor</h3>
                  <p className="text-sm text-gray-600 mb-2">Sell products with guaranteed payments</p>
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Instant Payouts</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">No Setup Fee</span>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setUserType('logistics')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 mb-3">
                    <span className="text-2xl">🚚</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">I'm a Logistics Partner</h3>
                  <p className="text-sm text-gray-600 mb-2">Earn from delivery services</p>
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Flexible Routes</span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Weekly Payouts</span>
                  </div>
                </div>
              </button>
            </div>
            
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Already have an account? 
                  <button 
                    onClick={() => setUserType('existing')}
                    className="text-emerald-600 hover:text-emerald-700 font-medium ml-1"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="bg-white rounded-xl shadow-lg border p-6">
            <div className="text-center mb-5">
              <button 
                onClick={() => setUserType('')}
                className="text-gray-500 hover:text-gray-700 text-xs mb-3 block text-center mx-auto"
              >
                ← Back to user type selection
              </button>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {userType === 'existing' ? 'Sign in to your account' : `Join as ${userType === 'buyer' ? 'Buyer' : userType === 'vendor' ? 'Vendor' : 'Logistics Partner'}`}
              </h2>
              {message && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 mx-auto max-w-xs">
                  {message}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-600">
                {userType === 'existing' ? 'Welcome back!' : 'Create your account to get started'}
              </p>
            </div>

            {verificationState.pending && (
              <div className="mb-4 border border-amber-200 bg-amber-50 text-amber-900 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-amber-500 text-xl">📧</span>
                  <div>
                    <p className="font-semibold text-sm">Verify your email</p>
                    <p className="text-xs text-amber-800">
                      We sent a verification link to{' '}
                      <strong>{verificationState.email || email}</strong>.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-amber-800 mb-3">{verificationDescription}</p>
                {verificationState.provider === 'password' && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={
                      resendStatus === 'sending' ||
                      resendStatus === 'cooldown' ||
                      resendStatus === 'verified' ||
                      !canResendVerification()
                    }
                    className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 bg-white hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {resendButtonLabel}
                  </button>
                )}
                {verificationState.provider === 'google' && (
                  <p className="text-[11px] text-amber-700 italic">
                    If you need another email, click "Sign in with Google" again and we’ll resend automatically.
                  </p>
                )}
              </div>
            )}
          
            {userType !== 'existing' && (
              <div className="mb-4 p-2 bg-gray-50 rounded-lg">
                <div className="flex flex-col items-center text-center">
                  <span className="text-lg mb-1">
                    {userType === 'buyer' ? '🛒' : userType === 'vendor' ? '🏪' : '🚚'}
                  </span>
                  <p className="font-medium text-gray-900 text-xs mb-1">
                    {userType === 'buyer' ? 'Buyer Account' : 
                     userType === 'vendor' ? 'Vendor Account' : 
                     'Logistics Partner Account'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {userType === 'buyer' ? 'Shop with wallet protection' : 
                     userType === 'vendor' ? 'Sell with guaranteed payments' : 
                     'Provide delivery services'}
                  </p>
                </div>
              </div>
            )}
            
            <form className="space-y-3" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm text-center">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {/* Email/Password Submit Button */}
                <div>
                  {userType === 'existing' ? (
                    <button
                      type="submit"
                      disabled={loading || googleLoading}
                      className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                  ) : (
                    <Link
                      to="/register"
                      state={{ from: location.state?.from, userType }}
                      className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                      Create {userType === 'buyer' ? 'Buyer' : userType === 'vendor' ? 'Vendor' : 'Logistics'} Account
                    </Link>
                  )}
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                {/* Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {googleLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-emerald-600 rounded-full animate-spin"></div>
                      <span>Signing in with Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>Sign in with Google</span>
                    </>
                  )}
                </button>
              </div>
              
              {userType === 'existing' && (
                <div className="text-center space-y-1">
                  <p className="text-xs text-gray-600">
                    Don't have an account?{' '}
                    <button 
                      type="button"
                      onClick={() => setUserType('buyer')}
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Create account
                    </button>
                  </p>
                  <p className="text-xs text-gray-600">
                    <Link
                      to="/forgot-password"
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Forgot your password?
                    </Link>
                  </p>
                </div>
              )}
              
              {userType !== 'existing' && (
                <div className="text-center">
                  <p className="text-xs text-gray-600">
                    Already have an account?{' '}
                    <button 
                      type="button"
                      onClick={() => setUserType('existing')}
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Sign in instead
                    </button>
                  </p>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
