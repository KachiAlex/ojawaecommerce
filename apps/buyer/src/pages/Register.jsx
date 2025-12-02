import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Register = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    userType: 'buyer'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const { getIntendedDestination } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';
  const preselectedUserType = location.state?.userType;

  // Set preselected user type from login page
  useEffect(() => {
    if (preselectedUserType) {
      setFormData(prev => ({ ...prev, userType: preselectedUserType }));
    }
  }, [preselectedUserType]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters for security');
      return;
    }

    if (!formData.displayName || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await signup(formData.email, formData.password, {
        displayName: formData.displayName,
        phone: formData.phone,
        address: formData.address,
        userType: formData.userType
      });
      
      // Check for intended destination from cart context
      const intendedDestination = getIntendedDestination();
      if (intendedDestination) {
        // Navigate to the intended destination (e.g., checkout, product page)
        navigate(intendedDestination.path);
      } else if (from !== '/dashboard') {
        // Go back to intended destination (like checkout)
        navigate(from);
      } else {
        // Redirect to appropriate dashboard based on user type
        switch (formData.userType) {
          case 'buyer':
            navigate('/buyer');
            break;
          case 'vendor':
            navigate('/vendor');
            break;
          case 'logistics':
            navigate('/logistics');
            break;
          default:
            navigate('/dashboard');
        }
      }
    } catch (error) {
      setError('Failed to create account. Email might already be in use.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {preselectedUserType && (
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-900/40 border border-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">
                  {preselectedUserType === 'buyer' ? '🛒' : preselectedUserType === 'vendor' ? '🏪' : '🚚'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 bg-emerald-900/20 border border-emerald-800/60 px-3 py-1 rounded-full text-sm text-emerald-300 mb-4">
                <span>Creating {preselectedUserType === 'buyer' ? 'Buyer' : preselectedUserType === 'vendor' ? 'Vendor' : 'Logistics'} Account</span>
              </div>
            </div>
          )}
          
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            {preselectedUserType === 'buyer' ? 'Start Shopping Safely' : 
             preselectedUserType === 'vendor' ? 'Start Selling Today' :
             preselectedUserType === 'logistics' ? 'Join Our Delivery Network' :
             'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-teal-200">
            {preselectedUserType === 'buyer' ? 'Join thousands of buyers shopping with wallet protection' :
             preselectedUserType === 'vendor' ? 'Reach customers across Africa with guaranteed payments' :
             preselectedUserType === 'logistics' ? 'Provide delivery services and earn competitive rates' :
             'Join the Ojawa marketplace'}
          </p>
          <p className="mt-2 text-center text-sm text-teal-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-emerald-400 hover:text-emerald-300"
            >
              Sign in here
            </Link>
          </p>
        </div>
        
        {preselectedUserType === 'buyer' && (
          <div className="bg-slate-900 rounded-lg border border-emerald-900/60 p-4 mb-6">
            <h3 className="font-semibold text-white mb-3">Why buyers love Ojawa:</h3>
            <div className="space-y-2 text-sm text-teal-200">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Your money is protected until you confirm delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Shop from verified vendors across Africa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Free dispute resolution if something goes wrong</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Multiple delivery options with real-time tracking</span>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {!preselectedUserType && (
              <div>
                <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
                  I want to join as *
                </label>
                <select
                  id="userType"
                  name="userType"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  value={formData.userType}
                  onChange={handleChange}
                >
                  <option value="buyer">🛒 Buyer - I want to shop safely</option>
                  <option value="vendor">🏪 Vendor - I want to sell products</option>
                  <option value="logistics">🚚 Logistics Partner - I provide delivery services</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Enter your full name"
                value={formData.displayName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address {preselectedUserType === 'buyer' ? '(for deliveries)' : ''}
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder={preselectedUserType === 'buyer' ? 'Enter your delivery address (can be updated later)' : 'Enter your address'}
                value={formData.address}
                onChange={handleChange}
              />
              {preselectedUserType === 'buyer' && (
                <p className="text-xs text-gray-500 mt-1">
                  This helps us show you accurate delivery options and pricing
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 top-1 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 top-1 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
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
          </div>

          {preselectedUserType === 'buyer' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-600">🛡️</span>
                <span className="font-medium text-emerald-800">Wallet Protection Included</span>
              </div>
              <p className="text-sm text-emerald-700">
                Your payments will be held securely until you confirm delivery. Shop with confidence!
              </p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 
               preselectedUserType === 'buyer' ? 'Start Shopping Safely' :
               preselectedUserType === 'vendor' ? 'Start Selling Today' :
               preselectedUserType === 'logistics' ? 'Join Delivery Network' :
               'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
