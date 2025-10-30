import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const RoleAuthModal = ({ role, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [mode, setMode] = useState('choose'); // 'choose', 'signin', 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    businessName: '',
    phone: '',
    address: ''
  });

  const roleInfo = {
    vendor: {
      title: 'Vendor Account',
      icon: '🏪',
      description: 'Start selling your products on Ojawa',
      benefits: ['List unlimited products', 'Access vendor dashboard', 'Track sales & analytics', 'Manage orders & inventory']
    },
    logistics: {
      title: 'Logistics Partner',
      icon: '🚚',
      description: 'Deliver packages and earn money',
      benefits: ['Access delivery requests', 'Manage routes', 'Track earnings', 'Build your reputation']
    }
  };

  const currentRoleInfo = roleInfo[role];

  // Handle using current account
  const handleUseCurrentAccount = async () => {
    setLoading(true);
    setError('');

    try {
      // Update user profile to add the new role
      const updates = {
        [`is${role.charAt(0).toUpperCase() + role.slice(1)}`]: true
      };

      if (role === 'vendor') {
        updates.role = 'vendor';
        updates.isVendor = true;
      } else if (role === 'logistics') {
        updates.role = 'logistics';
        updates.isLogisticsPartner = true;
      }

      await firebaseService.users.update(currentUser.uid, updates);
      console.log('✅ User profile updated with role:', role);

      // Create role-specific profile if needed
      if (role === 'vendor') {
        // Note: Store creation is now handled by VendorStoreManager component
        // to prevent duplicate store creation
        console.log('Vendor role assigned - store will be created by VendorStoreManager');
      } else if (role === 'logistics') {
        // Create logistics profile
        await firebaseService.logistics.createProfile({
          userId: currentUser.uid,
          name: currentUser.displayName || currentUser.email,
          phone: formData.phone || '',
          address: formData.address || '',
          vehicleType: 'motorcycle',
          status: 'active',
          rating: 0,
          totalDeliveries: 0,
          createdAt: new Date()
        });
      }

      onSuccess(role);
    } catch (err) {
      console.error('Error creating role:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle sign in with different account
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // This would require separate authentication
      // For now, we'll just show a message
      setError('Please use the main login to switch accounts, then access this dashboard.');
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle sign up with new account
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // This would create a new account
      // For now, we'll suggest using current account
      setError('Please use the current account option or sign up from the main registration page.');
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{currentRoleInfo.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{currentRoleInfo.title}</h2>
              <p className="text-sm text-gray-600">{currentRoleInfo.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {mode === 'choose' && (
            <div className="space-y-6">
              {/* Benefits */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Benefits:</h3>
                <ul className="space-y-2">
                  {currentRoleInfo.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      <span className="text-sm text-gray-600">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <button
                  onClick={handleUseCurrentAccount}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    <>Use Current Account ({currentUser.email})</>
                  )}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                  </div>
                </div>

                <button
                  onClick={() => setMode('signin')}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Sign In with Different Account
                </button>

                <button
                  onClick={() => setMode('signup')}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Create New Account
                </button>
              </div>
            </div>
          )}

          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back
              </button>

              <p className="text-sm text-gray-600 mb-4">
                To create a separate {role} account, please use the main registration page.
                Or use your current account by going back and selecting "Use Current Account".
              </p>

              <button
                type="button"
                onClick={() => setMode('choose')}
                className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Use Current Account Instead
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleAuthModal;

