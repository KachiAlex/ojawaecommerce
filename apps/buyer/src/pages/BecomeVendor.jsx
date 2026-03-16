import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AddressInput from '../components/AddressInput';

const BecomeVendor = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const { completeVendorOnboarding, currentUser, signup } = useAuth();
  const navigate = useNavigate();

  // Ensure component renders immediately without auth checks
  useEffect(() => {
    setReady(true);
  }, []);

  const [formData, setFormData] = useState({
    // Account registration fields (if not logged in)
    email: '',
    password: '',
    passwordConfirm: '',
    displayName: '',
    // Vendor onboarding fields
    nin: '',
    businessName: '',
    businessAddress: '', // Keep for backward compatibility
    structuredAddress: { street: '', city: '', state: '', country: 'Nigeria' },
    businessPhone: '',
    businessType: 'retail',
    storeName: '',
    storeDescription: ''
  });

  // Determine the starting step based on login status
  const needsAccountCreation = !currentUser;
  const accountStepOffset = needsAccountCreation ? 1 : 0;
  const totalSteps = needsAccountCreation ? 4 : 3;

  const businessTypes = [
    { value: 'retail', label: 'Retail Store' },
    { value: 'fashion', label: 'Fashion & Clothing' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'food', label: 'Food & Beverages' },
    { value: 'beauty', label: 'Beauty & Personal Care' },
    { value: 'crafts', label: 'Arts & Crafts' },
    { value: 'services', label: 'Services' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'other', label: 'Other' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleNext = () => {
    setError('');
    
    if (step === 1 && needsAccountCreation) {
      // Validate account creation
      if (!formData.email || !formData.password || !formData.passwordConfirm || !formData.displayName) {
        setError('Please fill in all account fields');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (formData.password !== formData.passwordConfirm) {
        setError('Passwords do not match');
        return;
      }
      if (!formData.email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }
    }
    
    if ((step === 2 && needsAccountCreation) || (step === 1 && !needsAccountCreation)) {
      // Validate NIN and business info (Step 2 if account creation, Step 1 if already logged in)
      if (!formData.nin || !formData.businessName || !formData.structuredAddress.city || !formData.structuredAddress.state || !formData.businessPhone) {
        setError('Please fill in all required fields including complete business address');
        return;
      }
      if (formData.nin.length !== 11) {
        setError('NIN must be 11 digits');
        return;
      }
    }
    
    if ((step === 3 && needsAccountCreation) || (step === 2 && !needsAccountCreation)) {
      // Validate store info (Step 3 if account creation, Step 2 if already logged in)
      if (!formData.storeName || !formData.storeDescription) {
        setError('Please fill in all store information');
        return;
      }
    }
    
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      // If user needs account creation, do that first
      if (needsAccountCreation) {
        await signup(formData.email, formData.password, {
          displayName: formData.displayName,
          role: 'buyer'
        });
        
        // Wait for currentUser to be updated in auth context
        // The auth state listener will update currentUser automatically
        let retries = 0;
        const maxRetries = 20; // 10 seconds max
        while (!currentUser && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        }
        
        if (!currentUser) {
          throw new Error('Failed to initialize user account. Please try signing in.');
        }
      }
      
      // Build full address string from structured address
      const fullAddress = formData.structuredAddress.city ? 
        `${formData.structuredAddress.street}, ${formData.structuredAddress.city}, ${formData.structuredAddress.state}, ${formData.structuredAddress.country}` :
        formData.businessAddress;
      
      const vendorData = {
        ...formData,
        businessAddress: fullAddress,
        structuredAddress: formData.structuredAddress
      };
      
      await completeVendorOnboarding(vendorData);
      
      // Redirect to success page
      navigate('/vendor-registration-success', { 
        state: { 
          vendorRegistrationSuccess: true, 
          requiresEmailVerification: needsAccountCreation,
          userEmail: needsAccountCreation ? formData.email : currentUser?.email
        },
        replace: true
      });
    } catch (error) {
      console.error('Vendor onboarding error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (error.message?.includes('Failed to initialize user account')) {
        setError('Account creation succeeded, but we had trouble setting up your vendor profile. Please try signing in and complete vendor registration again.');
      } else {
        setError(error.message || 'Failed to complete vendor registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while component initializes
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏪</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Vendor</h1>
          <p className="text-gray-600">Start selling on Ojawa and reach customers across Africa</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {Array.from({ length: totalSteps }).map((_, index) => {
              const stepNumber = index + 1;
              return (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stepNumber}
                  </div>
                  {stepNumber < totalSteps && (
                    <div className={`w-16 h-1 mx-2 ${
                      step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            {needsAccountCreation ? (
              <>
                <span>Account</span>
                <span>Business Info</span>
                <span>Store Setup</span>
                <span>Review</span>
              </>
            ) : (
              <>
                <span>Business Info</span>
                <span>Store Setup</span>
                <span>Review</span>
              </>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Account Registration (if not logged in) */}
          {step === 1 && needsAccountCreation && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Your Account</h2>
                <p className="text-gray-600 mb-6">Let's get you set up as a vendor on Ojawa</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="At least 6 characters"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters required</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Re-enter your password"
                />
              </div>

              {/* Google Sign-In Alternative */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  // TODO: Implement Google Sign-In
                  setError('Google Sign-In coming soon! Use email/password for now.');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <image href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%234285F4' d='M10.5 19.5c4.41 0 8-2.238 8-5s-3.59-5-8-5-8 2.238-8 5 3.59 5 8 5zm0-8c2.21 0 4 1.34 4 3s-1.79 3-4 3-4-1.34-4-3 1.79-3 4-3z'/%3E%3C/svg%3E" />
                  <g transform="translate(4,4)">
                    <rect fill="#4285F4" width="4" height="4" x="0" y="0" rx="1"/>
                  </g>
                </svg>
                <span>Sign up with Google</span>
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Already have an account? <a href="/login" className="font-semibold text-blue-600 hover:text-blue-700">Sign in here</a>
                </p>
              </div>
            </div>
          )}

          {/* Step 1/2: Business Information */}
          {((step === 2 && needsAccountCreation) || (step === 1 && !needsAccountCreation)) && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Information</h2>
                <p className="text-gray-600 mb-6">We need to verify your business details for security and compliance.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  National Identification Number (NIN) *
                </label>
                <input
                  type="text"
                  name="nin"
                  value={formData.nin}
                  onChange={handleChange}
                  maxLength="11"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your 11-digit NIN"
                />
                <p className="text-xs text-gray-500 mt-1">Required for identity verification</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your registered business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type *
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {businessTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <AddressInput
                  value={formData.structuredAddress}
                  onChange={(address) => setFormData({ ...formData, structuredAddress: address })}
                  label="Business Address"
                  required={true}
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 This address will be used for delivery logistics and customer pickups
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Phone *
                </label>
                <input
                  type="tel"
                  name="businessPhone"
                  value={formData.businessPhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your business phone number"
                />
              </div>
            </div>
          )}

          {/* Step 2/3: Store Setup */}
          {((step === 3 && needsAccountCreation) || (step === 2 && !needsAccountCreation)) && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Store Setup</h2>
                <p className="text-gray-600 mb-6">Create your store identity that customers will see.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Name *
                </label>
                <input
                  type="text"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your store name"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Store URL: ojawa.com/store/{formData.storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') || 'your-store-name'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Description *
                </label>
                <textarea
                  name="storeDescription"
                  value={formData.storeDescription}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe what you sell and what makes your store unique..."
                />
                <p className="text-xs text-gray-500 mt-1">This will be shown to customers visiting your store</p>
              </div>

              {/* Store Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Store Preview</h3>
                <div className="bg-white rounded-lg border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🏪</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{formData.storeName || 'Your Store Name'}</h4>
                      <p className="text-sm text-gray-600">{businessTypes.find(t => t.value === formData.businessType)?.label}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{formData.storeDescription || 'Your store description will appear here...'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3/4: Review */}
          {((step === 4 && needsAccountCreation) || (step === 3 && !needsAccountCreation)) && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Review & Submit</h2>
                <p className="text-gray-600 mb-6">Please review your information before submitting.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Business Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">NIN:</span>
                      <span className="ml-2 font-medium">***-***-{formData.nin.slice(-4)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Business Name:</span>
                      <span className="ml-2 font-medium">{formData.businessName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Business Type:</span>
                      <span className="ml-2 font-medium">{businessTypes.find(t => t.value === formData.businessType)?.label}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <span className="ml-2 font-medium">{formData.businessPhone}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-gray-600 text-sm">Address:</span>
                    <p className="text-sm font-medium mt-1">{formData.businessAddress}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Store Information</h3>
                  <div className="text-sm">
                    <div className="mb-2">
                      <span className="text-gray-600">Store Name:</span>
                      <span className="ml-2 font-medium">{formData.storeName}</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-gray-600">Store URL:</span>
                      <span className="ml-2 font-medium text-blue-600">
                        ojawa.com/store/{formData.storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Description:</span>
                      <p className="mt-1 font-medium">{formData.storeDescription}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">ℹ️</span>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">What happens next?</p>
                      <ul className="space-y-1 text-blue-700">
                        <li>• Your vendor application will be reviewed (usually within 24-48 hours)</li>
                        <li>• You'll receive an email confirmation once approved</li>
                        <li>• You can start adding products to your store immediately</li>
                        <li>• Your vendor wallet will be created for receiving payments</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <div>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  ← Previous
                </button>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/buyer')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              
              {step < totalSteps ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : '🚀 Become a Vendor'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BecomeVendor;
