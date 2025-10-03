import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('');
  
  const { signin } = useAuth();
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
      await signin(email, password);
      
      // Check for intended destination from cart context
      const intendedDestination = getIntendedDestination();
      if (intendedDestination) {
        // Navigate to the intended destination (e.g., checkout, product page)
        navigate(intendedDestination.path);
      } else {
        // Use the standard redirect from location state
        navigate(from);
      }
    } catch (error) {
      setError('Failed to sign in. Please check your credentials.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
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

          <div className="flex gap-3">
            {userType === 'existing' ? (
              <button
                type="submit"
                disabled={loading}
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
