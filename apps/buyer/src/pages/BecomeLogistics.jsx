import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const BecomeLogistics = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    serviceAreas: [],
    deliveryTypes: [],
    vehicleTypes: [],
    maxWeight: '',
    maxDistance: '',
    baseRate: '',
    perKmRate: '',
    estimatedDeliveryDays: '',
    workingHours: '',
    insurance: false,
    tracking: false,
    signatureRequired: false,
    description: '',
    terms: false
  });

  const serviceAreas = [
    'Lagos', 'Abuja', 'Kano', 'Port Harcourt', 'Ibadan', 'Kaduna', 'Maiduguri', 'Enugu', 'Aba', 'Jos'
  ];

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.terms) {
        throw new Error('Please accept the terms and conditions');
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
        baseRate: parseFloat(formData.baseRate),
        perKmRate: parseFloat(formData.perKmRate),
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Areas *</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {serviceAreas.map(area => (
                  <label key={area} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.serviceAreas.includes(area)}
                      onChange={() => handleArrayChange('serviceAreas', area)}
                      className="mr-2"
                    />
                    <span className="text-sm">{area}</span>
                  </label>
                ))}
              </div>
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

            {/* Pricing */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Rate (₦) *</label>
                  <input
                    type="number"
                    name="baseRate"
                    value={formData.baseRate}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Per KM Rate (₦) *</label>
                  <input
                    type="number"
                    name="perKmRate"
                    value={formData.perKmRate}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Weight (kg) *</label>
                  <input
                    type="number"
                    name="maxWeight"
                    value={formData.maxWeight}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
    </div>
  );
};

export default BecomeLogistics;
