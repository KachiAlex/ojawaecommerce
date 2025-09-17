import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BecomeVendor = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { completeVendorOnboarding, currentUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nin: '',
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessType: 'retail',
    storeName: '',
    storeDescription: ''
  });

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
    
    if (step === 1) {
      // Validate NIN and business info
      if (!formData.nin || !formData.businessName || !formData.businessAddress || !formData.businessPhone) {
        setError('Please fill in all required fields');
        return;
      }
      if (formData.nin.length !== 11) {
        setError('NIN must be 11 digits');
        return;
      }
    }
    
    if (step === 2) {
      // Validate store info
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
      
      await completeVendorOnboarding(formData);
      
      // Redirect to vendor dashboard
      navigate('/vendor');
    } catch (error) {
      console.error('Vendor onboarding error:', error);
      setError('Failed to complete vendor onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to become a vendor</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700"
          >
            Sign In
          </button>
        </div>
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
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNumber 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Business Info</span>
            <span>Store Setup</span>
            <span>Review</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Business Information */}
          {step === 1 && (
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address *
                </label>
                <textarea
                  name="businessAddress"
                  value={formData.businessAddress}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your complete business address"
                />
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

          {/* Step 2: Store Setup */}
          {step === 2 && (
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

          {/* Step 3: Review */}
          {step === 3 && (
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
              
              {step < 3 ? (
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
