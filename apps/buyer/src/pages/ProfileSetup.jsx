import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const ProfileSetup = () => {
  const { currentUser, userProfile, updateUserProfile, isProfileComplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    address: ''
  });

  // Get the intended destination from location state
  const intendedDestination = location.state?.from || '/';

  useEffect(() => {
    // If profile is already complete, redirect to intended destination
    if (isProfileComplete()) {
      navigate(intendedDestination, { replace: true });
      return;
    }

    // Pre-fill form with existing data
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        phone: userProfile.phone || '',
        address: userProfile.address || ''
      });
    }
  }, [userProfile, isProfileComplete, navigate, intendedDestination]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.displayName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!formData.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!formData.address.trim()) {
      setError('Please enter your address');
      return;
    }

    try {
      setLoading(true);
      
      // Update user profile
      await updateUserProfile({
        displayName: formData.displayName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        profileCompleted: true,
        profileCompletedAt: new Date()
      });

      // Show success message
      alert('Profile completed successfully! You can now proceed with your purchase.');
      
      // Redirect to intended destination
      navigate(intendedDestination, { replace: true });
    } catch (error) {
      console.error('Profile setup error:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-emerald-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">👤</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We need a few more details to ensure a smooth shopping experience
          </p>
          {intendedDestination !== '/' && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                📦 Complete your profile to proceed to checkout
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                value={formData.displayName}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                placeholder="Enter your full name"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                placeholder="+234 800 000 0000"
              />
              <p className="mt-1 text-xs text-gray-500">
                We'll use this to contact you about your orders
              </p>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address *
              </label>
              <textarea
                id="address"
                name="address"
                required
                rows="3"
                value={formData.address}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                placeholder="Enter your full delivery address"
              />
              <p className="mt-1 text-xs text-gray-500">
                Include street, city, state, and postal code
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Complete Profile & Continue'
                )}
              </button>
            </div>
          </form>

          {/* Privacy Notice */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              🔒 Your information is secure and will only be used for order processing and delivery
            </p>
          </div>
        </div>

        {/* Skip Option (only for non-checkout pages) */}
        {intendedDestination === '/' && (
          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSetup;


