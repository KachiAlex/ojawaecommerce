import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import googleMapsService from '../services/googleMapsService';
import WalletManager from '../components/WalletManager';
import LogisticsPerformanceDashboard from '../components/LogisticsPerformanceDashboard';
import DashboardSwitcher from '../components/DashboardSwitcher';
import ServiceAreaModal from '../components/ServiceAreaModal';
import { calculateDeliveryPrice, determineRouteCategory, DEFAULT_PLATFORM_PRICING, ROUTE_CATEGORY_INFO, RECOMMENDED_PRICING } from '../data/logisticsPricingModel';

const Logistics = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddRouteForm, setShowAddRouteForm] = useState(false);
  const [showEditRouteForm, setShowEditRouteForm] = useState(false);
  const [showServiceAreaModal, setShowServiceAreaModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [routeAnalytics, setRouteAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // Form state for adding new route
  const [routeForm, setRouteForm] = useState({
    from: '',
    to: '',
    distance: '',
    price: '',
    currency: '₦ NGN',
    estimatedTime: '',
    serviceType: 'Standard Delivery',
    ratePerKm: DEFAULT_PLATFORM_PRICING.ratePerKm,
    serviceAreas: [], // Array of {country, state, id}
    deliveryTypes: [],
    vehicleTypes: [],
    maxWeight: '',
    maxDistance: ''
  });
  const [submittingRoute, setSubmittingRoute] = useState(false);
  
  // Route analysis state
  const [routeAnalysis, setRouteAnalysis] = useState(null);
  const [analyzingRoute, setAnalyzingRoute] = useState(false);
  const [suggestedPricing, setSuggestedPricing] = useState(null);
  const [calculatedPricing, setCalculatedPricing] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadLogisticsData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'routes' && profile?.id) {
      loadRouteAnalytics();
    }
  }, [activeTab, profile?.id]);

  const loadLogisticsData = async () => {
    try {
      setLoading(true);
      
      // Load logistics profile
      const profileData = await firebaseService.logistics.getProfile(currentUser.uid);
      setProfile(profileData);
      
      // Load deliveries and routes if profile exists
      if (profileData?.id) {
        await Promise.all([
          loadDeliveries(profileData.id),
          loadRoutes(profileData.id)
        ]);
      } else {
        // Clear existing data if no profile
        setDeliveries([]);
        setRoutes([]);
      }
      
    } catch (error) {
      console.error('Error loading logistics data:', error);
      // Clear data on error
      setDeliveries([]);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async (profileId) => {
    try {
      const logisticsId = profileId || profile?.id;
      if (!logisticsId) {
        console.warn('No logistics profile ID available');
        return;
      }
      const deliveriesData = await firebaseService.logistics.getDeliveriesByPartner(logisticsId);
      setDeliveries(deliveriesData);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    }
  };

  const loadRoutes = async (profileId) => {
    try {
      const logisticsId = profileId || profile?.id;
      if (!logisticsId) {
        console.warn('No logistics profile ID available');
        return;
      }
      const routesData = await firebaseService.logistics.getRoutesByPartner(logisticsId);
      setRoutes(routesData);
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };

  const loadRouteAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const analyticsData = await firebaseService.logistics.getRouteAnalytics(profile.id);
      setRouteAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading route analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleRouteFormChange = (field, value) => {
    setRouteForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayChange = (name, value) => {
    setRouteForm(prev => ({
      ...prev,
      [name]: prev[name].includes(value) 
        ? prev[name].filter(item => item !== value)
        : [...prev[name], value]
    }));
  };

  const handleAddServiceAreas = (newAreas) => {
    setRouteForm(prev => ({
      ...prev,
      serviceAreas: [...prev.serviceAreas, ...newAreas]
    }));
  };

  const handleRemoveServiceArea = (areaId) => {
    setRouteForm(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter(area => area.id !== areaId)
    }));
  };

  // Group service areas by country for display
  const groupedServiceAreas = routeForm.serviceAreas.reduce((acc, area) => {
    if (!acc[area.country]) {
      acc[area.country] = [];
    }
    acc[area.country].push(area.state);
    return acc;
  }, {});

  // Analyze route when both pickup and delivery locations are entered
  const analyzeRoute = async (from, to) => {
    if (!from || !to || from.trim() === '' || to.trim() === '') {
      setRouteAnalysis(null);
      setSuggestedPricing(null);
      setCalculatedPricing(null);
      return;
    }

    try {
      setAnalyzingRoute(true);
      
      // Use Google Maps service to analyze the route
      const analysis = await googleMapsService.analyzeRouteType(from, to);

      // Only update state if we got valid data
      if (analysis && analysis.distanceKm) {
        setRouteAnalysis(analysis);
        
        // Calculate pricing using our new model
        const pricing = calculateDeliveryPrice({
          distance: analysis.distanceKm,
          ratePerKm: routeForm.ratePerKm
        });
        
        setCalculatedPricing(pricing);
        
        // Auto-fill distance and estimated time
        setRouteForm(prev => ({
          ...prev,
          distance: Math.round(analysis.distanceKm * 10) / 10, // Round to 1 decimal
          estimatedTime: analysis.duration?.text || prev.estimatedTime,
          price: pricing.finalPrice.toString()
        }));
      } else {
        console.warn('Route analysis returned null or incomplete data');
        setRouteAnalysis(null);
        setCalculatedPricing(null);
      }

      // Keep Google Maps pricing as fallback (optional)
      try {
        const googlePricing = await googleMapsService.getOptimizedPricing(from, to, {
          deliveryType: routeForm.serviceType.toLowerCase().replace(' delivery', '').replace(' ', '_'),
          weight: 1
        });
        
        if (googlePricing && googlePricing.cost) {
          setSuggestedPricing(googlePricing);
        } else {
          setSuggestedPricing(null);
        }
      } catch (error) {
        console.warn('Google Maps pricing failed, using calculated pricing only:', error);
        setSuggestedPricing(null);
      }

    } catch (error) {
      console.error('Error analyzing route:', error);
      // Don't show error to user, just don't update the analysis
      setRouteAnalysis(null);
      setSuggestedPricing(null);
      setCalculatedPricing(null);
    } finally {
      setAnalyzingRoute(false);
    }
  };

  // Debounced route analysis
  useEffect(() => {
    const timer = setTimeout(() => {
      if (routeForm.from && routeForm.to) {
        analyzeRoute(routeForm.from, routeForm.to);
      }
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
  }, [routeForm.from, routeForm.to]);

  // Recalculate pricing when rate per km changes
  useEffect(() => {
    if (routeAnalysis?.distanceKm && routeForm.ratePerKm) {
      const pricing = calculateDeliveryPrice({
        distance: routeAnalysis.distanceKm,
        ratePerKm: routeForm.ratePerKm
      });
      
      setCalculatedPricing(pricing);
      setRouteForm(prev => ({
        ...prev,
        price: pricing.finalPrice.toString()
      }));
    }
  }, [routeForm.ratePerKm, routeAnalysis?.distanceKm]);

  const handleSubmitRoute = async (e) => {
    e.preventDefault();
    
    if (!profile?.id) {
      const shouldCreateProfile = confirm(
        'You need to create a logistics profile first to add routes. Would you like to set up your logistics profile now?'
      );
      if (shouldCreateProfile) {
        // Navigate to become logistics page
        window.location.href = '/become-logistics';
      }
      return;
    }

    try {
      setSubmittingRoute(true);
      
      const routeData = {
        from: routeForm.from.trim(),
        to: routeForm.to.trim(),
        distance: parseFloat(routeForm.distance) || 0,
        price: parseFloat(routeForm.price) || 0,
        currency: routeForm.currency,
        estimatedTime: routeForm.estimatedTime.trim(),
        serviceType: routeForm.serviceType,
        ratePerKm: routeForm.ratePerKm,
        serviceAreas: routeForm.serviceAreas,
        deliveryTypes: routeForm.deliveryTypes,
        vehicleTypes: routeForm.vehicleTypes,
        maxWeight: routeForm.maxWeight ? parseFloat(routeForm.maxWeight) : null,
        maxDistance: routeForm.maxDistance ? parseFloat(routeForm.maxDistance) : null
      };

      // Validate required fields
      if (!routeData.from || !routeData.to || !routeData.distance || !routeData.price || !routeData.estimatedTime) {
        alert('Please fill in all required fields.');
        return;
      }

      if (routeForm.serviceAreas.length === 0) {
        alert('Please add at least one service area.');
        return;
      }

      if (editingRoute) {
        // Update existing route
        await firebaseService.logistics.updateRoute(editingRoute.id, routeData);
        setShowEditRouteForm(false);
        setEditingRoute(null);
        alert('Route updated successfully!');
      } else {
        // Create new route
        await firebaseService.logistics.addRoute(profile.id, routeData);
        setShowAddRouteForm(false);
        alert('Route added successfully!');
      }
      
      // Reset form
      setRouteForm({
        from: '',
        to: '',
        distance: '',
        price: '',
        currency: '₦ NGN',
        estimatedTime: '',
        serviceType: 'Standard Delivery',
        ratePerKm: DEFAULT_PLATFORM_PRICING.ratePerKm,
        serviceAreas: [],
        deliveryTypes: [],
        vehicleTypes: [],
        maxWeight: '',
        maxDistance: ''
      });
      
      // Reload routes
      await loadRoutes(profile?.id);
      
    } catch (error) {
      console.error('Error saving route:', error);
      alert('Error saving route. Please try again.');
    } finally {
      setSubmittingRoute(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'picked_up':
        return 'bg-blue-100 text-blue-800';
      case 'in_transit':
        return 'bg-purple-100 text-purple-800';
      case 'out_for_delivery':
        return 'bg-orange-100 text-orange-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading logistics dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg relative">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Logistics Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your delivery operations</p>
          </div>
          
          <div className="p-4 space-y-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'overview' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              📊 Overview
            </button>
            <button 
              onClick={() => setActiveTab('routes')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'routes' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              🛣️ Routes
            </button>
            <button 
              onClick={() => setActiveTab('deliveries')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'deliveries' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              📦 Deliveries
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'analytics' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              📈 Analytics
            </button>
            <button 
              onClick={() => setActiveTab('wallet')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'wallet' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              💳 My Wallet
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'settings' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              ⚙️ Settings
            </button>
          </div>
          
          <div className="absolute bottom-4 left-4">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to Home</Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Add Route Modal */}
          {showAddRouteForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Add New Route</h2>
                    <button 
                      onClick={() => setShowAddRouteForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <form onSubmit={handleSubmitRoute} className="p-6 space-y-6">
                  {/* Basic Route Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 Route Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From (Pickup Location)</label>
                        <input 
                          type="text" 
                          value={routeForm.from}
                          onChange={(e) => handleRouteFormChange('from', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                          placeholder="City, Country" 
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To (Delivery Location)</label>
                        <input 
                          type="text" 
                          value={routeForm.to}
                          onChange={(e) => handleRouteFormChange('to', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                          placeholder="City, Country" 
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Service Areas */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Service Areas ({routeForm.serviceAreas.length} state{routeForm.serviceAreas.length !== 1 ? 's' : ''})
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
                    {routeForm.serviceAreas.length > 0 ? (
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
                                      className="text-blue-500 hover:text-blue-700"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300 text-center">
                        <div className="text-gray-400 text-4xl mb-2">🌍</div>
                        <p className="text-gray-500 text-sm">No service areas selected yet</p>
                        <p className="text-gray-400 text-xs mt-1">Click "Add More States" to select countries and states you serve</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Pricing Section */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Pricing Configuration</h3>
                    
                    {/* Platform Default Pricing Info */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3 text-sm">Platform Default Pricing Structure</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{ROUTE_CATEGORY_INFO.intracity.icon}</span>
                            <span className="font-medium text-gray-900">Intracity (≤50km)</span>
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

                    {/* Rate Per KM Input */}
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Rate per Kilometer (₦) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500 text-lg">₦</span>
                        <input
                          type="number"
                          value={routeForm.ratePerKm}
                          onChange={(e) => handleRouteFormChange('ratePerKm', parseFloat(e.target.value) || DEFAULT_PLATFORM_PRICING.ratePerKm)}
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
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 text-sm">How Pricing Works:</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-600">5km trip (intracity):</span>
                          <span className="font-medium">5 × ₦{routeForm.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm} = ₦{((routeForm.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm) * 5).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-600">2km trip (below minimum):</span>
                          <span className="font-medium text-orange-600">₦{DEFAULT_PLATFORM_PRICING.intracity.minCharge.toLocaleString()} (minimum applied)</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-600">40km trip (intracity):</span>
                          <span className="font-medium">{(routeForm.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm) * 40 > DEFAULT_PLATFORM_PRICING.intracity.maxCharge ? `₦${DEFAULT_PLATFORM_PRICING.intracity.maxCharge.toLocaleString()} (max applied)` : `₦${((routeForm.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm) * 40).toLocaleString()}`}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">60km trip (intercity):</span>
                          <span className="font-medium text-blue-600">₦{DEFAULT_PLATFORM_PRICING.intercity.maxCharge.toLocaleString()} (max applied)</span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    {calculatedPricing && (
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-blue-900 mb-3">📊 Live Pricing Breakdown</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-blue-700">
                              <span className="font-medium">Category:</span> {calculatedPricing.category}
                            </p>
                            <p className="text-blue-700">
                              <span className="font-medium">Base Calculation:</span> {calculatedPricing.breakdown.baseCalculation}
                            </p>
                          </div>
                          <div>
                            <p className="text-blue-700">
                              <span className="font-medium">Applied Rule:</span> {calculatedPricing.breakdown.appliedRule}
                            </p>
                            <p className="text-blue-900 font-bold text-lg">
                              Final Price: ₦{calculatedPricing.finalPrice.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tips */}
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
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
                  </div>

                  {/* Route Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🚚 Route Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Distance (km)</label>
                        <input 
                          type="number" 
                          value={routeForm.distance}
                          onChange={(e) => handleRouteFormChange('distance', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                          placeholder="0" 
                          min="0"
                          step="0.1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Price (₦)</label>
                        <input 
                          type="number" 
                          value={routeForm.price}
                          onChange={(e) => handleRouteFormChange('price', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                          placeholder="0.00" 
                          min="0"
                          step="1"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {calculatedPricing ? 'Auto-calculated based on distance and rate' : 'Enter manually or wait for auto-calculation'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Delivery Time</label>
                        <input 
                          type="text" 
                          value={routeForm.estimatedTime}
                          onChange={(e) => handleRouteFormChange('estimatedTime', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                          placeholder="e.g., 1-2 days" 
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                        <select 
                          value={routeForm.currency}
                          onChange={(e) => handleRouteFormChange('currency', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option>₦ NGN</option>
                          <option>₵ GHS</option>
                          <option>KSh KES</option>
                          <option>Br ETB</option>
                          <option>$ USD</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                      <select 
                        value={routeForm.serviceType}
                        onChange={(e) => handleRouteFormChange('serviceType', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option>Standard Delivery</option>
                        <option>Express Delivery</option>
                        <option>Same Day Delivery</option>
                        <option>Next Day Delivery</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowAddRouteForm(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={submittingRoute}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {submittingRoute ? 'Adding...' : 'Add Route'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Dashboard Overview</h2>
                
                {!profile ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-6xl mb-4">🚚</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Logistics Profile</h3>
                    <p className="text-gray-500 mb-4">You need to create a logistics profile to start managing deliveries.</p>
                    <Link 
                      to="/become-logistics"
                      className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Create Logistics Profile
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-emerald-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <div className="text-emerald-600 text-2xl mr-3">📦</div>
                        <div>
                          <p className="text-sm text-emerald-600">Total Deliveries</p>
                          <p className="text-2xl font-bold text-emerald-900">{deliveries.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <div className="text-blue-600 text-2xl mr-3">🛣️</div>
                        <div>
                          <p className="text-sm text-blue-600">Active Routes</p>
                          <p className="text-2xl font-bold text-blue-900">{routes.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <div className="text-purple-600 text-2xl mr-3">💰</div>
                        <div>
                          <p className="text-sm text-purple-600">Success Rate</p>
                          <p className="text-2xl font-bold text-purple-900">0%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Manage Routes</h2>
                {profile?.id ? (
                  <button 
                    onClick={() => setShowAddRouteForm(true)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Add New Route
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      const shouldCreateProfile = confirm(
                        'You need to create a logistics profile first to add routes. Would you like to set up your logistics profile now?'
                      );
                      if (shouldCreateProfile) {
                        window.location.href = '/become-logistics';
                      }
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed"
                  >
                    Add New Route
                  </button>
                )}
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/km</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {routes.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                          {profile?.id ? (
                            <>No routes found. Click "Add New Route" to create your first route.</>
                          ) : (
                            <>
                              No routes found. You need to create a logistics profile first.
                              <br />
                              <button 
                                onClick={() => window.location.href = '/become-logistics'}
                                className="mt-2 text-emerald-600 hover:text-emerald-700 underline"
                              >
                                Create your logistics profile here
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ) : (
                      routes.map((route) => (
                        <tr key={route.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{route.from}</p>
                              <p className="text-sm text-gray-500">→ {route.to}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.distance} km</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.currency} {route.price}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₦{route.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm}/km</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.serviceType}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.estimatedTime}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button 
                              onClick={() => {
                                setEditingRoute(route);
                                setRouteForm({
                                  from: route.from,
                                  to: route.to,
                                  distance: route.distance.toString(),
                                  price: route.price.toString(),
                                  currency: route.currency,
                                  estimatedTime: route.estimatedTime,
                                  serviceType: route.serviceType,
                                  ratePerKm: route.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm
                                });
                                setShowEditRouteForm(true);
                              }}
                              className="text-emerald-600 hover:text-emerald-700 font-medium mr-3"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this route?')) {
                                  try {
                                    await firebaseService.logistics.deleteRoute(route.id);
                                    await loadRoutes(profile?.id);
                                    alert('Route deleted successfully!');
                                  } catch (error) {
                                    console.error('Error deleting route:', error);
                                    alert('Error deleting route. Please try again.');
                                  }
                                }
                              }}
                              className="text-red-600 hover:text-red-700 font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'deliveries' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Manage Deliveries</h2>
              
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Delivery</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{delivery.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.orderId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <p className="font-medium">{delivery.pickup}</p>
                            <p className="text-xs text-gray-400">→ {delivery.delivery}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.customer}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                            {delivery.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{delivery.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.estimatedDelivery}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => window.location.href = `/tracking/${delivery.trackingId || delivery.orderId}`}
                              className="text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              Track
                            </button>
                            <button 
                              onClick={async () => {
                                const newStatus = prompt('Enter new status (picked_up, in_transit, out_for_delivery, delivered):');
                                if (newStatus) {
                                  try {
                                    await firebaseService.logistics.updateDeliveryStatus(delivery.id, newStatus, {
                                      updatedBy: currentUser.uid,
                                      location: 'Current Location',
                                      notes: 'Status updated by logistics partner'
                                    });
                                    
                                    // Notify buyer about delivery update
                                    if (delivery.buyerId) {
                                      await firebaseService.notifications.create({
                                        userId: delivery.buyerId,
                                        title: 'Delivery Status Updated',
                                        message: `Your delivery status has been updated to: ${newStatus}`,
                                        type: 'delivery_update',
                                        data: {
                                          deliveryId: delivery.id,
                                          status: newStatus,
                                          orderId: delivery.orderId
                                        }
                                      });
                                    }
                                    
                                    await loadDeliveries(profile?.id);
                                    alert('Delivery status updated successfully!');
                                  } catch (error) {
                                    console.error('Error updating delivery status:', error);
                                    alert('Error updating delivery status. Please try again.');
                                  }
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Update Status
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
              
              {loadingAnalytics ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading analytics...</p>
                  </div>
                </div>
              ) : (
                <LogisticsPerformanceDashboard 
                  profile={profile}
                  deliveries={deliveries}
                  routes={routes}
                  analytics={routeAnalytics}
                />
              )}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">My Wallet</h2>
              <WalletManager />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500">Settings panel coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Service Area Modal */}
      <ServiceAreaModal
        isOpen={showServiceAreaModal}
        onClose={() => setShowServiceAreaModal(false)}
        onAddAreas={handleAddServiceAreas}
        existingAreas={routeForm.serviceAreas}
      />
    </div>
  );
};

export default Logistics;
