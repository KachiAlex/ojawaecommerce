import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, getDoc, setDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

const LogisticsBusinessProfileManager = () => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [businessSettings, setBusinessSettings] = useState({
    businessName: '',
    businessDescription: '',
    businessSlug: '',
    contactEmail: '',
    contactPhone: '',
    businessAddress: '',
    businessCity: '',
    businessState: '',
    businessCountry: '',
    businessLicense: '',
    taxId: '',
    showContactInfo: true,
    isPublic: true,
    allowReviews: true,
    serviceAreas: [],
    deliveryTypes: [],
    vehicleTypes: [],
    maxWeight: 0,
    maxDistance: 0,
    workingHours: {
      monday: { start: '08:00', end: '18:00', isOpen: true },
      tuesday: { start: '08:00', end: '18:00', isOpen: true },
      wednesday: { start: '08:00', end: '18:00', isOpen: true },
      thursday: { start: '08:00', end: '18:00', isOpen: true },
      friday: { start: '08:00', end: '18:00', isOpen: true },
      saturday: { start: '09:00', end: '17:00', isOpen: true },
      sunday: { start: '10:00', end: '16:00', isOpen: false }
    },
    features: {
      insurance: false,
      tracking: true,
      signatureRequired: false,
      sameDayDelivery: false,
      overnightDelivery: false
    },
    pricing: {
      baseFare: 500,
      ratePerKm: 50,
      ratePerKg: 20,
      expressMultiplier: 1.5,
      intercityRate: 40
    }
  });

  useEffect(() => {
    if (userProfile?.logisticsProfile) {
      loadBusinessProfile();
    } else {
      setLoading(false);
    }
  }, [userProfile]);

  const loadBusinessProfile = async () => {
    if (!currentUser || !userProfile?.logisticsProfile) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Check if business profile exists
      const businessProfileQuery = query(
        collection(db, 'logistics_business_profiles'),
        where('userId', '==', currentUser.uid)
      );
      const businessProfileSnapshot = await getDocs(businessProfileQuery);
      
      if (!businessProfileSnapshot.empty) {
        const profile = businessProfileSnapshot.docs[0].data();
        setBusinessProfile({ id: businessProfileSnapshot.docs[0].id, ...profile });
        
        // Load settings into form
        setBusinessSettings({
          businessName: profile.businessName || '',
          businessDescription: profile.businessDescription || '',
          businessSlug: profile.businessSlug || '',
          contactEmail: profile.contactEmail || userProfile.email || '',
          contactPhone: profile.contactPhone || userProfile.phone || '',
          businessAddress: profile.businessAddress || '',
          businessCity: profile.businessCity || '',
          businessState: profile.businessState || '',
          businessCountry: profile.businessCountry || '',
          businessLicense: profile.businessLicense || '',
          taxId: profile.taxId || '',
          showContactInfo: profile.showContactInfo !== false,
          isPublic: profile.isPublic !== false,
          allowReviews: profile.allowReviews !== false,
          serviceAreas: profile.serviceAreas || [],
          deliveryTypes: profile.deliveryTypes || [],
          vehicleTypes: profile.vehicleTypes || [],
          maxWeight: profile.maxWeight || 0,
          maxDistance: profile.maxDistance || 0,
          workingHours: profile.workingHours || businessSettings.workingHours,
          features: profile.features || businessSettings.features,
          pricing: profile.pricing || businessSettings.pricing
        });
      } else {
        // Create default business profile
        await createBusinessProfile();
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBusinessProfile = async () => {
    if (!currentUser || !userProfile?.logisticsProfile) return;

    try {
      const businessSlug = userProfile.logisticsProfile.companyName
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-') || `logistics-${currentUser.uid.slice(-8)}`;

      const newBusinessProfile = {
        userId: currentUser.uid,
        businessName: userProfile.logisticsProfile.companyName || 'My Logistics Business',
        businessDescription: 'Professional logistics and delivery services',
        businessSlug,
        contactEmail: userProfile.email || '',
        contactPhone: userProfile.logisticsProfile.phone || '',
        businessAddress: userProfile.logisticsProfile.address || '',
        businessCity: userProfile.logisticsProfile.city || '',
        businessState: userProfile.logisticsProfile.state || '',
        businessCountry: userProfile.logisticsProfile.country || '',
        businessLicense: userProfile.logisticsProfile.businessLicense || '',
        taxId: userProfile.logisticsProfile.taxId || '',
        showContactInfo: true,
        isPublic: true,
        allowReviews: true,
        serviceAreas: userProfile.logisticsProfile.serviceAreas || [],
        deliveryTypes: userProfile.logisticsProfile.deliveryTypes || ['standard'],
        vehicleTypes: userProfile.logisticsProfile.vehicleTypes || ['motorcycle'],
        maxWeight: userProfile.logisticsProfile.maxWeight || 50,
        maxDistance: userProfile.logisticsProfile.maxDistance || 100,
        workingHours: businessSettings.workingHours,
        features: businessSettings.features,
        pricing: businessSettings.pricing,
        shareableLink: `https://ojawa-ecommerce.web.app/logistics/${businessSlug}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Tracking fields
        totalDeliveries: 0,
        totalRevenue: 0,
        rating: 0,
        reviewCount: 0,
        isActive: true
      };

      const docRef = await addDoc(collection(db, 'logistics_business_profiles'), newBusinessProfile);
      setBusinessProfile({ id: docRef.id, ...newBusinessProfile });
      
      // Update settings form
      setBusinessSettings(prev => ({
        ...prev,
        businessName: newBusinessProfile.businessName,
        businessDescription: newBusinessProfile.businessDescription,
        businessSlug: newBusinessProfile.businessSlug,
        contactEmail: newBusinessProfile.contactEmail,
        contactPhone: newBusinessProfile.contactPhone,
        businessAddress: newBusinessProfile.businessAddress,
        businessCity: newBusinessProfile.businessCity,
        businessState: newBusinessProfile.businessState,
        businessCountry: newBusinessProfile.businessCountry,
        businessLicense: newBusinessProfile.businessLicense,
        taxId: newBusinessProfile.taxId,
        serviceAreas: newBusinessProfile.serviceAreas,
        deliveryTypes: newBusinessProfile.deliveryTypes,
        vehicleTypes: newBusinessProfile.vehicleTypes,
        maxWeight: newBusinessProfile.maxWeight,
        maxDistance: newBusinessProfile.maxDistance
      }));
    } catch (error) {
      console.error('Error creating business profile:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!businessProfile || !currentUser) return;

    try {
      setSaving(true);
      
      const updatedProfile = {
        businessName: businessSettings.businessName,
        businessDescription: businessSettings.businessDescription,
        businessSlug: businessSettings.businessSlug,
        contactEmail: businessSettings.contactEmail,
        contactPhone: businessSettings.contactPhone,
        businessAddress: businessSettings.businessAddress,
        businessCity: businessSettings.businessCity,
        businessState: businessSettings.businessState,
        businessCountry: businessSettings.businessCountry,
        businessLicense: businessSettings.businessLicense,
        taxId: businessSettings.taxId,
        showContactInfo: businessSettings.showContactInfo,
        isPublic: businessSettings.isPublic,
        allowReviews: businessSettings.allowReviews,
        serviceAreas: businessSettings.serviceAreas,
        deliveryTypes: businessSettings.deliveryTypes,
        vehicleTypes: businessSettings.vehicleTypes,
        maxWeight: businessSettings.maxWeight,
        maxDistance: businessSettings.maxDistance,
        workingHours: businessSettings.workingHours,
        features: businessSettings.features,
        pricing: businessSettings.pricing,
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'logistics_business_profiles', businessProfile.id), updatedProfile);
      setBusinessProfile(prev => ({ ...prev, ...updatedProfile }));
      
      alert('Business profile updated successfully!');
    } catch (error) {
      console.error('Error saving business profile:', error);
      alert('Failed to save business profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setBusinessSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field, value) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setBusinessSettings(prev => ({
      ...prev,
      [field]: array
    }));
  };

  const handleWorkingHoursChange = (day, field, value) => {
    setBusinessSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value
        }
      }
    }));
  };

  const handleFeatureChange = (feature, value) => {
    setBusinessSettings(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: value
      }
    }));
  };

  const handlePricingChange = (field, value) => {
    setBusinessSettings(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [field]: parseFloat(value) || 0
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!userProfile?.logisticsProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Logistics Profile Required</h2>
          <p className="text-gray-600 mb-4">You need to complete your logistics partner onboarding first.</p>
          <a href="/become-logistics" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">
            Complete Onboarding
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
              <p className="text-gray-600">Manage your logistics business information and settings</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'business-info', label: 'Business Info', icon: '🏢' },
                { id: 'service-areas', label: 'Service Areas', icon: '📍' },
                { id: 'pricing', label: 'Pricing', icon: '💰' },
                { id: 'settings', label: 'Settings', icon: '⚙️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Business Overview</h2>
              {businessProfile && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-emerald-600">{businessProfile.totalDeliveries || 0}</div>
                    <div className="text-sm text-gray-600">Total Deliveries</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-emerald-600">₦{(businessProfile.totalRevenue || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Revenue</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-emerald-600">{businessProfile.rating || 0}/5</div>
                    <div className="text-sm text-gray-600">Average Rating</div>
                  </div>
                </div>
              )}
              
              {businessProfile?.shareableLink && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Public Business Link</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={businessProfile.shareableLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-blue-200 rounded-md bg-white text-sm"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(businessProfile.shareableLink)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'business-info' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <input
                    type="text"
                    value={businessSettings.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter your business name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Slug</label>
                  <input
                    type="text"
                    value={businessSettings.businessSlug}
                    onChange={(e) => handleInputChange('businessSlug', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="business-name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
                <textarea
                  value={businessSettings.businessDescription}
                  onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Describe your logistics business"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={businessSettings.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                  <input
                    type="tel"
                    value={businessSettings.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
                <input
                  type="text"
                  value={businessSettings.businessAddress}
                  onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter your business address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={businessSettings.businessCity}
                    onChange={(e) => handleInputChange('businessCity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={businessSettings.businessState}
                    onChange={(e) => handleInputChange('businessState', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={businessSettings.businessCountry}
                    onChange={(e) => handleInputChange('businessCountry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business License</label>
                  <input
                    type="text"
                    value={businessSettings.businessLicense}
                    onChange={(e) => handleInputChange('businessLicense', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter business license number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID</label>
                  <input
                    type="text"
                    value={businessSettings.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter tax identification number"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'service-areas' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Service Areas & Capabilities</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Areas (comma-separated)</label>
                <input
                  type="text"
                  value={businessSettings.serviceAreas.join(', ')}
                  onChange={(e) => handleArrayInputChange('serviceAreas', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Lagos, Abuja, Port Harcourt"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Types (comma-separated)</label>
                <input
                  type="text"
                  value={businessSettings.deliveryTypes.join(', ')}
                  onChange={(e) => handleArrayInputChange('deliveryTypes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="standard, express, same-day"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Types (comma-separated)</label>
                <input
                  type="text"
                  value={businessSettings.vehicleTypes.join(', ')}
                  onChange={(e) => handleArrayInputChange('vehicleTypes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="motorcycle, van, truck"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Weight (kg)</label>
                  <input
                    type="number"
                    value={businessSettings.maxWeight}
                    onChange={(e) => handleInputChange('maxWeight', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Distance (km)</label>
                  <input
                    type="number"
                    value={businessSettings.maxDistance}
                    onChange={(e) => handleInputChange('maxDistance', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Pricing Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Fare (₦)</label>
                  <input
                    type="number"
                    value={businessSettings.pricing.baseFare}
                    onChange={(e) => handlePricingChange('baseFare', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rate per KM (₦)</label>
                  <input
                    type="number"
                    value={businessSettings.pricing.ratePerKm}
                    onChange={(e) => handlePricingChange('ratePerKm', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rate per KG (₦)</label>
                  <input
                    type="number"
                    value={businessSettings.pricing.ratePerKg}
                    onChange={(e) => handlePricingChange('ratePerKg', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Express Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={businessSettings.pricing.expressMultiplier}
                    onChange={(e) => handlePricingChange('expressMultiplier', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Intercity Rate per KM (₦)</label>
                <input
                  type="number"
                  value={businessSettings.pricing.intercityRate}
                  onChange={(e) => handlePricingChange('intercityRate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Business Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Show Contact Information</h3>
                    <p className="text-sm text-gray-500">Display your contact details on your business profile</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={businessSettings.showContactInfo}
                    onChange={(e) => handleInputChange('showContactInfo', e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Public Business Profile</h3>
                    <p className="text-sm text-gray-500">Make your business profile visible to customers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={businessSettings.isPublic}
                    onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Allow Reviews</h3>
                    <p className="text-sm text-gray-500">Let customers leave reviews for your business</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={businessSettings.allowReviews}
                    onChange={(e) => handleInputChange('allowReviews', e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Service Features</h3>
                <div className="space-y-4">
                  {Object.entries(businessSettings.features).map(([feature, enabled]) => (
                    <div key={feature} className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 capitalize">{feature.replace(/([A-Z])/g, ' $1')}</h4>
                        <p className="text-sm text-gray-500">Enable {feature.replace(/([A-Z])/g, ' $1').toLowerCase()} service</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => handleFeatureChange(feature, e.target.checked)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogisticsBusinessProfileManager;
