import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [userType, setUserType] = useState('');
  
  const { signin, signInWithGoogle } = useAuth();
  const { getIntendedDestination } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  
  const message = location.state?.message || new URLSearchParams(location.search).get('message');
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
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
      
      if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups for this site.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {!userType ? (
          /* User Type Selection */
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-emerald-600 text-2xl">👋</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Ojawa</h2>
            <p className="text-gray-600 mb-8">Choose how you'd like to join our marketplace</p>
            
            <div className="space-y-4">
              <button
                onClick={() => setUserType('buyer')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-100">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">I'm a Buyer</h3>
                    <p className="text-sm text-gray-600">Shop from trusted vendors across Africa</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Wallet Protected</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Free to Join</span>
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setUserType('vendor')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-100">
                    <span className="text-2xl">🏪</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">I'm a Vendor</h3>
                    <p className="text-sm text-gray-600">Sell products with guaranteed payments</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Instant Payouts</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">No Setup Fee</span>
                    </div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setUserType('logistics')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-100">
                    <span className="text-2xl">🚚</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">I'm a Logistics Partner</h3>
                    <p className="text-sm text-gray-600">Earn from delivery services</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Flexible Routes</span>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Weekly Payouts</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
            
            <p className="mt-6 text-sm text-gray-500">
              Already have an account? 
              <button 
                onClick={() => setUserType('existing')}
                className="text-emerald-600 hover:text-emerald-700 font-medium ml-1"
              >
                Sign in here
              </button>
            </p>
          </div>
        ) : (
          /* Login Form */
        <div>
            <div className="text-center mb-6">
              <button 
                onClick={() => setUserType('')}
                className="text-gray-500 hover:text-gray-700 text-sm mb-4"
              >
                ← Back to user type selection
              </button>
              <h2 className="text-3xl font-extrabold text-gray-900">
                {userType === 'existing' ? 'Sign in to your account' : `Join as ${userType === 'buyer' ? 'Buyer' : userType === 'vendor' ? 'Vendor' : 'Logistics Partner'}`}
          </h2>
              {message && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-center text-sm text-emerald-800">{message}</p>
                </div>
              )}
          <p className="mt-2 text-center text-sm text-gray-600">
                {userType === 'existing' ? 'Welcome back!' : 'Create your account to get started'}
              </p>
            </div>
            
            {userType !== 'existing' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {userType === 'buyer' ? '🛒' : userType === 'vendor' ? '🏪' : '🚚'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {userType === 'buyer' ? 'Buyer Account' : 
                       userType === 'vendor' ? 'Vendor Account' : 
                       'Logistics Partner Account'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {userType === 'buyer' ? 'Shop with wallet protection' : 
                       userType === 'vendor' ? 'Sell with guaranteed payments' : 
                       'Provide delivery services'}
          </p>
        </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {userType && (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {/* Email/Password Submit Button */}
            <div className="flex gap-3">
              {userType === 'existing' ? (
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              ) : (
                <Link
                  to="/register"
                  state={{ from: location.state?.from, userType }}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
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
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button 
                  type="button"
                  onClick={() => setUserType('buyer')}
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Create account
                </button>
              </p>
              <p className="text-sm text-gray-600">
                Forgot your password?{' '}
                <Link
                  to="/forgot-password"
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Reset password
                </Link>
              </p>
            </div>
          )}
          
          {userType !== 'existing' && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
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
        )}
      </div>
    </div>
  );
};

export default Login;
