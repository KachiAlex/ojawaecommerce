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
    address: '',
    nin: '',
    dateOfBirth: '',
    gender: ''
  });

  const [ninDocument, setNinDocument] = useState(null);
  const [ninDocumentPreview, setNinDocumentPreview] = useState(null);

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
        address: userProfile.address || '',
        nin: userProfile.nin || '',
        dateOfBirth: userProfile.dateOfBirth || '',
        gender: userProfile.gender || ''
      });
      if (userProfile.ninDocument) {
        setNinDocumentPreview(userProfile.ninDocument);
      }
    }
  }, [userProfile, isProfileComplete, navigate, intendedDestination]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNinDocument(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setNinDocumentPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
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

    if (!formData.nin.trim()) {
      setError('Please enter your NIN number');
      return;
    }

    if (!formData.dateOfBirth) {
      setError('Please enter your date of birth');
      return;
    }

    if (!formData.gender) {
      setError('Please select your gender');
      return;
    }

    if (!ninDocument && !ninDocumentPreview) {
      setError('Please upload your NIN document');
      return;
    }

    try {
      setLoading(true);
      
      // Update user profile
      const profileData = {
        displayName: formData.displayName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        nin: formData.nin.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        profileCompleted: true,
        profileCompletedAt: new Date(),
        kycComplete: true
      };

      // If there's a new NIN document, add it to the profile data
      if (ninDocument) {
        profileData.ninDocument = ninDocumentPreview;
      }

      await updateUserProfile(profileData);

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

            {/* NIN Number */}
            <div>
              <label htmlFor="nin" className="block text-sm font-medium text-gray-700 mb-2">
                NIN Number *
              </label>
              <input
                id="nin"
                name="nin"
                type="text"
                required
                value={formData.nin}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                placeholder="Enter your 11-digit NIN number"
                maxLength="11"
              />
              <p className="mt-1 text-xs text-gray-500">
                Your National Identification Number (11 digits)
              </p>
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth *
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={formData.gender === 'male'}
                    onChange={handleChange}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Male</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={formData.gender === 'female'}
                    onChange={handleChange}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Female</span>
                </label>
              </div>
            </div>

            {/* NIN Document Upload */}
            <div>
              <label htmlFor="ninDocument" className="block text-sm font-medium text-gray-700 mb-2">
                NIN Document *
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  {ninDocumentPreview ? (
                    <div>
                      <img
                        src={ninDocumentPreview}
                        alt="NIN Document Preview"
                        className="mx-auto h-32 w-auto object-contain rounded-lg"
                      />
                      <p className="text-sm text-gray-600 mt-2">NIN Document uploaded</p>
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="ninDocument" className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
                          <span>Upload NIN document</span>
                          <input
                            id="ninDocument"
                            name="ninDocument"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Upload a clear photo of your NIN card or slip
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
              🔒 Your information is secure and will only be used for order processing, delivery, and KYC verification. NIN is required for dispute resolution and identity verification.
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


