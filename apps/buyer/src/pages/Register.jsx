import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
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
      // Redirect based on user type after registration
      if (from !== '/dashboard') {
        navigate(from); // Go back to intended destination (like checkout)
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {preselectedUserType && (
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">
                  {preselectedUserType === 'buyer' ? '🛒' : preselectedUserType === 'vendor' ? '🏪' : '🚚'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full text-sm text-emerald-700 mb-4">
                <span>Creating {preselectedUserType === 'buyer' ? 'Buyer' : preselectedUserType === 'vendor' ? 'Vendor' : 'Logistics'} Account</span>
              </div>
            </div>
          )}
          
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {preselectedUserType === 'buyer' ? 'Start Shopping Safely' : 
             preselectedUserType === 'vendor' ? 'Start Selling Today' :
             preselectedUserType === 'logistics' ? 'Join Our Delivery Network' :
             'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {preselectedUserType === 'buyer' ? 'Join thousands of buyers shopping with wallet protection' :
             preselectedUserType === 'vendor' ? 'Reach customers across Africa with guaranteed payments' :
             preselectedUserType === 'logistics' ? 'Provide delivery services and earn competitive rates' :
             'Join the Ojawa marketplace'}
          </p>
          <p className="mt-2 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-emerald-600 hover:text-emerald-500"
            >
              Sign in here
            </Link>
          </p>
        </div>
        
        {preselectedUserType === 'buyer' && (
          <div className="bg-white rounded-lg border p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Why buyers love Ojawa:</h3>
            <div className="space-y-2 text-sm text-gray-600">
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
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
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
