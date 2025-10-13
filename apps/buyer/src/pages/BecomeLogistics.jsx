import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import ServiceAreaModal from '../components/ServiceAreaModal';
import { ROUTE_CATEGORY_INFO, DEFAULT_PLATFORM_PRICING, RECOMMENDED_PRICING } from '../data/logisticsPricingModel';

const BecomeLogistics = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showServiceAreaModal, setShowServiceAreaModal] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    businessLicense: '',
    taxId: '',
    serviceAreas: [], // Array of {country, state, id}
    deliveryTypes: [],
    vehicleTypes: [],
    maxWeight: '',
    maxDistance: '',
    // Simplified pricing
    ratePerKm: '',
    estimatedDeliveryDays: '',
    workingHours: '',
    insurance: false,
    tracking: false,
    signatureRequired: false,
    description: '',
    terms: false
  });

  const deliveryTypes = [
    'Same Day', 'Next Day', '2-3 Days', 'Express', 'Standard', 'Economy'
  ];

  const vehicleTypes = [
    'Motorcycle', 'Van', 'Truck', 'Car', 'Bicycle'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleArrayChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: prev[name].includes(value) 
        ? prev[name].filter(item => item !== value)
        : [...prev[name], value]
    }));
  };

  const handleAddServiceAreas = (newAreas) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: [...prev.serviceAreas, ...newAreas]
    }));
  };

  const handleRemoveServiceArea = (areaId) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter(area => area.id !== areaId)
    }));
  };

  // Group service areas by country for display
  const groupedServiceAreas = formData.serviceAreas.reduce((acc, area) => {
    if (!acc[area.country]) {
      acc[area.country] = [];
    }
    acc[area.country].push(area.state);
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.terms) {
        throw new Error('Please accept the terms and conditions');
      }

      if (formData.serviceAreas.length === 0) {
        throw new Error('Please add at least one service area');
      }

      // Create logistics profile
      const logisticsData = {
        userId: currentUser.uid,
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        businessLicense: formData.businessLicense,
        taxId: formData.taxId,
        serviceAreas: formData.serviceAreas,
        deliveryTypes: formData.deliveryTypes,
        vehicleTypes: formData.vehicleTypes,
        maxWeight: parseFloat(formData.maxWeight),
        maxDistance: parseFloat(formData.maxDistance),
        // Simplified pricing structure (follows platform defaults)
        ratePerKm: parseFloat(formData.ratePerKm) || DEFAULT_PLATFORM_PRICING.ratePerKm,
        pricing: {
          intracity: {
            minCharge: DEFAULT_PLATFORM_PRICING.intracity.minCharge,
            maxCharge: DEFAULT_PLATFORM_PRICING.intracity.maxCharge
          },
          intercity: {
            minCharge: DEFAULT_PLATFORM_PRICING.intercity.minCharge,
            maxCharge: DEFAULT_PLATFORM_PRICING.intercity.maxCharge
          }
        },
        estimatedDeliveryDays: parseInt(formData.estimatedDeliveryDays),
        workingHours: formData.workingHours,
        features: {
          insurance: formData.insurance,
          tracking: formData.tracking,
          signatureRequired: formData.signatureRequired
        },
        description: formData.description,
        status: 'pending', // pending, approved, rejected
        verificationStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save logistics profile
      await firebaseService.logistics.createProfile(logisticsData);

      // Update user profile to mark as logistics partner
      await firebaseService.users.updateProfile(currentUser.uid, {
        isLogisticsPartner: true,
        logisticsProfile: {
          status: 'pending',
          companyName: formData.companyName
        }
      });

      alert('Logistics partner application submitted successfully! You will be notified once approved.');
      navigate('/logistics');
    } catch (error) {
      console.error('Error creating logistics profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Logistics Partner</h1>
            <p className="text-gray-600">Join Ojawa's logistics network and start earning from deliveries</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person *</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business License *</label>
                  <input
                    type="text"
                    name="businessLicense"
                    value={formData.businessLicense}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID *</label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Service Areas */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Service Areas * ({formData.serviceAreas.length} state{formData.serviceAreas.length !== 1 ? 's' : ''})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowServiceAreaModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add More States
                </button>
              </div>

              {/* Display Selected Service Areas Grouped by Country */}
              {formData.serviceAreas.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedServiceAreas).map(([country, states]) => (
                    <div key={country} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🌍</span>
                        <h4 className="font-semibold text-gray-900">{country}</h4>
                        <span className="text-sm text-gray-500">({states.length} state{states.length !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {states.map(state => {
                          const areaId = `${country}-${state}`.replace(/\s+/g, '-').toLowerCase();
                          return (
                            <div
                              key={areaId}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200"
                            >
                              <span>{state}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveServiceArea(areaId)}
                                className="hover:text-blue-900 transition-colors"
                                title="Remove"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-gray-400 text-4xl mb-3">🗺️</div>
                  <p className="text-gray-600 mb-4">No service areas added yet</p>
                  <button
                    type="button"
                    onClick={() => setShowServiceAreaModal(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Click "Add More States" to get started
                  </button>
                </div>
              )}
            </div>

            {/* Delivery Capabilities */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Capabilities</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Types *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {deliveryTypes.map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.deliveryTypes.includes(type)}
                          onChange={() => handleArrayChange('deliveryTypes', type)}
                          className="mr-2"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Types *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {vehicleTypes.map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.vehicleTypes.includes(type)}
                          onChange={() => handleArrayChange('vehicleTypes', type)}
                          className="mr-2"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Simplified Pricing */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delivery Pricing</h3>
              <p className="text-sm text-gray-600 mb-6">
                Distance is calculated using Google Maps. Set your rate per kilometer.
              </p>
              
              {/* Platform Default Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">ℹ️</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Platform Default Pricing</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        <span className="font-medium">Base Rate:</span> ₦{DEFAULT_PLATFORM_PRICING.ratePerKm}/km
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{ROUTE_CATEGORY_INFO.intracity.icon}</span>
                            <span className="font-medium text-gray-900">Intracity (0-50km)</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Min: ₦{DEFAULT_PLATFORM_PRICING.intracity.minCharge.toLocaleString()} • 
                            Max: ₦{DEFAULT_PLATFORM_PRICING.intracity.maxCharge.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{ROUTE_CATEGORY_INFO.intercity.icon}</span>
                            <span className="font-medium text-gray-900">Intercity (50km+)</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Min: ₦{DEFAULT_PLATFORM_PRICING.intercity.minCharge.toLocaleString()} • 
                            Max: ₦{DEFAULT_PLATFORM_PRICING.intercity.maxCharge.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate Per KM Input */}
              <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Rate per Kilometer (₦) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500 text-lg">₦</span>
                  <input
                    type="number"
                    name="ratePerKm"
                    value={formData.ratePerKm}
                    onChange={handleInputChange}
                    required
                    min={RECOMMENDED_PRICING.ratePerKm.min}
                    max={RECOMMENDED_PRICING.ratePerKm.max}
                    step="10"
                    placeholder={DEFAULT_PLATFORM_PRICING.ratePerKm.toString()}
                    className="w-full pl-8 pr-3 py-3 text-lg font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Recommended range: ₦{RECOMMENDED_PRICING.ratePerKm.min} - ₦{RECOMMENDED_PRICING.ratePerKm.max}
                  </span>
                  <span className="text-blue-600 font-medium">
                    Platform default: ₦{DEFAULT_PLATFORM_PRICING.ratePerKm}
                  </span>
                </div>
              </div>

              {/* Pricing Examples */}
              <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 text-sm">How Pricing Works:</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">5km trip (intracity):</span>
                    <span className="font-medium">5 × ₦{formData.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm} = ₦{((formData.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm) * 5).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">2km trip (below minimum):</span>
                    <span className="font-medium text-orange-600">₦{DEFAULT_PLATFORM_PRICING.intracity.minCharge.toLocaleString()} (minimum applied)</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">40km trip (intracity):</span>
                    <span className="font-medium">{(formData.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm) * 40 > DEFAULT_PLATFORM_PRICING.intracity.maxCharge ? `₦${DEFAULT_PLATFORM_PRICING.intracity.maxCharge.toLocaleString()} (max applied)` : `₦${((formData.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm) * 40).toLocaleString()}`}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">60km trip (intercity):</span>
                    <span className="font-medium text-blue-600">₦{DEFAULT_PLATFORM_PRICING.intercity.maxCharge.toLocaleString()} (max applied)</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 text-lg">💡</span>
                  <div className="text-sm text-amber-900">
                    <p className="font-medium mb-1">Pricing Tips:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Distance is automatically calculated via Google Maps</li>
                      <li>Min/max charges ensure fair pricing for all trips</li>
                      <li>Competitive rates attract more customers</li>
                      <li>You can update your rate anytime from your dashboard</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Max Weight */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Weight Capacity (kg) *</label>
                <input
                  type="number"
                  name="maxWeight"
                  value={formData.maxWeight}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum weight your vehicles can transport per trip
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Features</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="insurance"
                    checked={formData.insurance}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm">Insurance Coverage</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="tracking"
                    checked={formData.tracking}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm">Real-time Tracking</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="signatureRequired"
                    checked={formData.signatureRequired}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm">Signature Required</span>
                </label>
              </div>
            </div>

            {/* Terms */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="terms"
                  checked={formData.terms}
                  onChange={handleInputChange}
                  required
                  className="mr-2 mt-1"
                />
                <span className="text-sm text-gray-700">
                  I agree to the <a href="#" className="text-blue-600 hover:underline">Terms and Conditions</a> and 
                  <a href="#" className="text-blue-600 hover:underline ml-1">Privacy Policy</a> for logistics partners.
                </span>
              </label>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Service Area Modal */}
      <ServiceAreaModal
        isOpen={showServiceAreaModal}
        onClose={() => setShowServiceAreaModal(false)}
        onAdd={handleAddServiceAreas}
        existingAreas={formData.serviceAreas}
      />
    </div>
  );
};

export default BecomeLogistics;
