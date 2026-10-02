import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { usePageTracking, useUserTracking, useClickTracking } from '../hooks/useAnalytics';

// Helper function to map user type to dashboard URL
const getDashboardUrl = (userType) => {
  const dashboardMap = {
    'buyer': '/buyer',
    'vendor': '/vendor',
    'logistics': '/logistics',
    'admin': '/admin'
  };
  return dashboardMap[userType] || '/dashboard';
};

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
  
  // Analytics tracking
  usePageTracking('Login');
  useUserTracking();
  useClickTracking();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Default to role selection (centralized login/signup chooser)
  const [userType, setUserType] = useState(testModeEnabled ? 'existing' : '');
  const autoLoginTriggeredRef = useRef(false);
  
  const { 
    signin, 
    signInWithGoogle, 
    currentUser,
    userProfile
  } = useAuth();
  const { getIntendedDestination } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Memoize location data to prevent re-renders
  const locationData = useMemo(() => ({
    message: location.state?.message || new URLSearchParams(location.search).get('message'),
    from: location.state?.from?.pathname || null,
    preselectedUserType: location.state?.userType
  }), [location.state, location.search]);

  // Display OAuth error from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlError = params.get('error');
    if (urlError) {
      const msg = params.get('message') || 'Google sign-in failed. Please try again.';
      setError(msg);
    }
  }, [location.search]);

  // Set preselected user type from navigation state
  useEffect(() => {
    if (locationData.preselectedUserType && !userType) {
      setUserType(locationData.preselectedUserType);
    }
  }, [locationData.preselectedUserType, userType]);

  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      console.log('🔐 Attempting login for:', email);
      const user = await signin(email, password);
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
      const returnTo = intendedDestination?.path || locationData.from;
      if (returnTo) {
        console.log('📍 Navigating to intended destination:', returnTo);
        // Navigate to the intended destination (e.g., checkout, product page)
        navigate(returnTo);
      } else {
        // Get user role and redirect to role-specific dashboard
        const userRole = user?.userType || userProfile?.userType || user?.role || userProfile?.role;
        const dashboardUrl = getDashboardUrl(userRole);
        console.log('📍 Navigating to role-based dashboard:', dashboardUrl, 'for user type:', userRole);
        navigate(dashboardUrl);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', error);
      
      // Display more specific error messages
      let errorMessage = 'Failed to sign in. Please check your credentials.';

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
  }, [email, password, signin, getIntendedDestination, navigate, locationData.from]);

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
        const returnTo = intendedDestination?.path || locationData.from;
        if (returnTo) {
          console.log('📍 Navigating to intended destination:', returnTo);
          navigate(returnTo);
        } else {
          // Get user role and redirect to role-specific dashboard
          const userRole = user?.userType || userProfile?.userType || user?.role || userProfile?.role;
          const dashboardUrl = getDashboardUrl(userRole);
          console.log('📍 Navigating to role-based dashboard:', dashboardUrl, 'for user type:', userRole);
          navigate(dashboardUrl);
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
    if (!testModeEnabled) return;
    if (autoLoginTriggeredRef.current) return;
    if (userType !== 'existing') return;
    if (!testCredentials?.email || !testCredentials?.password) return;

    setEmail(testCredentials.email);
    setPassword(testCredentials.password);

    const timer = setTimeout(() => {
      autoLoginTriggeredRef.current = true;
      handleSubmit({ preventDefault: () => {} });
    }, 150);

    return () => clearTimeout(timer);
  }, [userType, setEmail, setPassword, handleSubmit]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#F4EEDE] py-10 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-[#E8A33D]/20 blur-3xl" aria-hidden="true"></div>
      <div className="absolute -bottom-44 -left-28 h-96 w-96 rounded-full bg-[#2E9E6D]/20 blur-3xl" aria-hidden="true"></div>
      <div className="max-w-xl mx-auto w-full relative z-10">
        {!userType ? (
          /* User Type Selection */
          <div className="bg-[#161F38] rounded-[2rem] shadow-[0_30px_80px_rgba(22,31,56,0.28)] border border-[#E8A33D]/30 p-6 sm:p-9">
            <div className="text-center">
              <img src="/logos/ojawa-brand-lockup-light.svg" alt="Ojawa" className="h-14 w-auto object-contain mx-auto mb-7" />
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E8A33D]/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E8A33D] mb-4"><span className="h-1.5 w-1.5 rounded-full bg-[#2E9E6D]"></span>Escrow-protected marketplace</span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F4EEDE] mb-2">Welcome to Ojawa</h2>
              <p className="text-sm text-[#F4EEDE]/70 mb-7">Choose how you want to trade across Africa</p>
            
            <div className="space-y-4">
              <button
                onClick={() => setUserType('buyer')}
                className="w-full p-4 border border-[#F4EEDE]/20 bg-white/5 rounded-2xl hover:border-[#E8A33D] hover:bg-[#F4EEDE] transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 mb-3">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <h3 className="font-semibold text-slate-100 group-hover:text-slate-900 mb-1">I'm a Buyer</h3>
                  <p className="text-sm text-slate-300 group-hover:text-slate-700 mb-2">Shop from trusted vendors across Africa</p>
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Wallet Protected</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Free to Join</span>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setUserType('vendor')}
                className="w-full p-4 border border-[#F4EEDE]/20 bg-white/5 rounded-2xl hover:border-[#E8A33D] hover:bg-[#F4EEDE] transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 mb-3">
                    <span className="text-2xl">🏪</span>
                  </div>
                  <h3 className="font-semibold text-slate-100 group-hover:text-slate-900 mb-1">I'm a Vendor</h3>
                  <p className="text-sm text-slate-300 group-hover:text-slate-700 mb-2">Sell products with guaranteed payments</p>
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Instant Payouts</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">No Setup Fee</span>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setUserType('logistics')}
                className="w-full p-4 border border-[#F4EEDE]/20 bg-white/5 rounded-2xl hover:border-[#E8A33D] hover:bg-[#F4EEDE] transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 mb-3">
                    <span className="text-2xl">🚚</span>
                  </div>
                  <h3 className="font-semibold text-slate-100 group-hover:text-slate-900 mb-1">I'm a Logistics Partner</h3>
                  <p className="text-sm text-slate-300 group-hover:text-slate-700 mb-2">Earn from delivery services</p>
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Flexible Routes</span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Weekly Payouts</span>
                  </div>
                </div>
              </button>
            </div>
            
              <div className="mt-6 text-center">
                <p className="text-sm text-[#F4EEDE]/60">
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
          <div className="bg-[#FFFDF7] rounded-[2rem] shadow-[0_30px_80px_rgba(22,31,56,0.18)] border border-[#161F38]/10 p-6 sm:p-9">
            <div className="text-center mb-6">
              <img src="/logos/ojawa-brand-lockup.svg" alt="Ojawa" className="h-12 w-auto object-contain mx-auto mb-5" />
              <button 
                onClick={() => setUserType('')}
                className="text-slate-600 hover:text-slate-800 text-xs mb-3 block text-center mx-auto"
              >
                ← Back to user type selection
              </button>
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
                {userType === 'existing' ? 'Sign in to your account' : `Join as ${userType === 'buyer' ? 'Buyer' : userType === 'vendor' ? 'Vendor' : 'Logistics Partner'}`}
              </h2>
              {locationData.message && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 mx-auto max-w-xs">
                  {locationData.message}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-600">
                {userType === 'existing' ? 'Welcome back!' : 'Create your account to get started'}
              </p>
            </div>

          
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
                      className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-[#161F38] bg-[#E8A33D] hover:bg-[#F0B158] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E8A33D] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                  ) : (
                    <Link
                      to="/register"
                      state={{ from: location.state?.from, userType }}
                      className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-[#161F38] bg-[#E8A33D] hover:bg-[#F0B158] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E8A33D]"
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
                    <span className="px-2 bg-[#FFFDF7] text-gray-500">Or continue with</span>
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
