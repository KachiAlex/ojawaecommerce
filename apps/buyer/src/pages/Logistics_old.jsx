import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import googleMapsService from '../services/googleMapsService';
import WalletManager from '../components/WalletManager';
import LogisticsPerformanceDashboard from '../components/LogisticsPerformanceDashboard';
import DashboardSwitcher from '../components/DashboardSwitcher';
import { calculateDeliveryPrice, DEFAULT_PLATFORM_PRICING } from '../data/logisticsPricingModel';

const Logistics = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddRouteForm, setShowAddRouteForm] = useState(false);
  const [showEditRouteForm, setShowEditRouteForm] = useState(false);
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
    ratePerKm: DEFAULT_PLATFORM_PRICING.ratePerKm
  });
  const [submittingRoute, setSubmittingRoute] = useState(false);
  
  // Route analysis state
  const [routeAnalysis, setRouteAnalysis] = useState(null);
  const [analyzingRoute, setAnalyzingRoute] = useState(false);
  const [suggestedPricing, setSuggestedPricing] = useState(null);
  const [, _calculatedPricing] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadLogisticsData();
    }
  }, [currentUser, loadLogisticsData]);

  useEffect(() => {
    if (activeTab === 'routes' && profile?.id) {
      loadRouteAnalytics();
    }
  }, [activeTab, profile?.id, loadRouteAnalytics]);

  const loadLogisticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get logistics profile
      const logisticsProfile = await firebaseService.logistics.getProfileByUserId(currentUser.uid);
      setProfile(logisticsProfile);

      if (logisticsProfile) {
        // Get deliveries
        const deliveriesData = await firebaseService.logistics.getDeliveriesByPartner(logisticsProfile.id);
        setDeliveries(deliveriesData);

        // Get routes
        await loadRoutes();

        // Get analytics for last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        const analyticsData = await firebaseService.logistics.getAnalytics(
          logisticsProfile.id, 
          startDate, 
          endDate
        );
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error loading logistics data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadRoutes, currentUser]);

  // Route form handlers
  const handleRouteFormChange = (field, value) => {
    setRouteForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Analyze route when both pickup and delivery locations are entered
  const analyzeRoute = useCallback(async (from, to) => {
    if (!from || !to || from.trim() === '' || to.trim() === '') {
      setRouteAnalysis(null);
      setSuggestedPricing(null);
      _calculatedPricing(null);
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
        
        _calculatedPricing(pricing);
        
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
        _calculatedPricing(null);
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
      _calculatedPricing(null);
    } finally {
      setAnalyzingRoute(false);
    }
  }, []);

  // Debounced route analysis
  useEffect(() => {
    const timer = setTimeout(() => {
      if (routeForm.from && routeForm.to) {
        analyzeRoute(routeForm.from, routeForm.to);
      }
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
  }, [routeForm.from, routeForm.to, routeForm.serviceType, routeForm.ratePerKm, analyzeRoute, routeForm]);

  // Recalculate pricing when rate per km changes
  useEffect(() => {
    if (routeAnalysis?.distanceKm && routeForm.ratePerKm) {
      const pricing = calculateDeliveryPrice({
        distance: routeAnalysis.distanceKm,
        ratePerKm: routeForm.ratePerKm
      });
      
      _calculatedPricing(pricing);
      setRouteForm(prev => ({
        ...prev,
        price: pricing.finalPrice.toString()
      }));
    }
  }, [routeForm.ratePerKm, routeAnalysis?.distanceKm, routeForm.from, routeForm.to, routeForm.serviceType]);

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
        serviceType: routeForm.serviceType
      };

      // Validate required fields
      if (!routeData.from || !routeData.to || !routeData.distance || !routeData.price || !routeData.estimatedTime) {
        alert('Please fill in all required fields.');
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
        serviceType: 'Standard Delivery'
      });
      
      // Reload routes
      await loadRoutes();
      
    } catch (error) {
      console.error('Error saving route:', error);
      alert('Failed to save route. Please try again.');
    } finally {
      setSubmittingRoute(false);
    }
  };

  const loadRoutes = async () => {
    if (profile?.id) {
      const routesData = await firebaseService.logistics.getRoutesByPartner(profile.id);
      setRoutes(routesData);
    }
  };

  const handleEditRoute = (route) => {
    setEditingRoute(route);
    setRouteForm({
      from: route.from,
      to: route.to,
      distance: route.distance.toString(),
      price: route.price.toString(),
      currency: route.currency,
      estimatedTime: route.estimatedTime,
      serviceType: route.serviceType
    });
    setShowEditRouteForm(true);
  };

  const handleToggleRouteStatus = async (route) => {
    try {
      const newStatus = await firebaseService.logistics.toggleRouteStatus(route.id, route.status);
      alert(`Route ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      await loadRoutes();
    } catch (error) {
      console.error('Error toggling route status:', error);
      alert('Failed to update route status. Please try again.');
    }
  };

  const handleDeleteRoute = async (route) => {
    if (!confirm(`Are you sure you want to delete the route from "${route.from}" to "${route.to}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await firebaseService.logistics.deleteRoute(route.id);
      alert('Route deleted successfully!');
      await loadRoutes();
    } catch (error) {
      console.error('Error deleting route:', error);
      alert('Failed to delete route. Please try again.');
    }
  };

  const loadRouteAnalytics = useCallback(async (timeRange = 30) => {
    if (!profile?.id) return;
    
    try {
      setLoadingAnalytics(true);
      const analytics = await firebaseService.logistics.getRouteAnalytics(profile.id, timeRange);
      setRouteAnalytics(analytics);
    } catch (error) {
      console.error('Error loading route analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [profile?.id]);

  // Helper function to get route type display information
  const getRouteTypeInfo = (routeType) => {
    const routeTypes = {
      intracity_short: {
        label: 'Intracity (Short)',
        description: 'Within city, 0-10km',
        color: 'bg-blue-100 text-blue-800',
        icon: '🏙️'
      },
      intracity_long: {
        label: 'Intracity (Long)',
        description: 'Within city, 10-30km',
        color: 'bg-blue-100 text-blue-800',
        icon: '🏙️'
      },
      intracity_extended: {
        label: 'Intracity (Extended)',
        description: 'Within city, 30km+',
        color: 'bg-blue-100 text-blue-800',
        icon: '🏙️'
      },
      intercity: {
        label: 'Intercity',
        description: 'Different cities, same state',
        color: 'bg-green-100 text-green-800',
        icon: '🚗'
      },
      interstate: {
        label: 'Interstate',
        description: 'Different states/countries',
        color: 'bg-red-100 text-red-800',
        icon: '✈️'
      }
    };
    
    return routeTypes[routeType] || {
      label: 'Unknown',
      description: 'Route type not determined',
      color: 'bg-gray-100 text-gray-800',
      icon: '❓'
    };
  };

  const earnings = [
    { id: 'ERN-001', month: 'September 2025', deliveries: 45, revenue: '₦225,000', commission: '₦33,750', payout: 'Pending' },
    { id: 'ERN-002', month: 'August 2025', deliveries: 38, revenue: '₦190,000', commission: '₦28,500', payout: 'Completed' },
    { id: 'ERN-003', month: 'July 2025', deliveries: 52, revenue: '₦260,000', commission: '₦39,000', payout: 'Completed' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'In Transit': return 'bg-blue-100 text-blue-800';
      case 'Picked Up': return 'bg-yellow-100 text-yellow-800';
      case 'Pending Pickup': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <Link to="/" className="flex items-center mb-8">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Ojawa Logistics</span>
            </Link>
            
            {/* Dashboard Switcher */}
            <div className="mb-8">
              <DashboardSwitcher />
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">LOGISTICS MENU</p>
              <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'overview' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📊 Overview
              </button>
              <button 
                onClick={() => setActiveTab('deliveries')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'deliveries' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                🚚 Deliveries
              </button>
              <button 
                onClick={() => setActiveTab('routes')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'routes' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                🗺️ Routes & Pricing
              </button>
              <button 
                onClick={() => setActiveTab('tracking')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'tracking' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📍 Tracking
              </button>
              <button 
                onClick={() => setActiveTab('earnings')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'earnings' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💰 Earnings
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Price</label>
                      <input 
                        type="number" 
                        value={routeForm.price}
                        onChange={(e) => handleRouteFormChange('price', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                        placeholder="0.00" 
                        min="0"
                        step="0.01"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                    <select 
                      value={routeForm.serviceType}
                      onChange={(e) => handleRouteFormChange('serviceType', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option>Standard Delivery</option>
                      <option>Express Delivery</option>
                      <option>Same Day Delivery</option>
                      <option>Overnight Delivery</option>
                    </select>
                  </div>

                  {/* Route Analysis Section */}
                  {(routeAnalysis || analyzingRoute) && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Analysis</h3>
                      
                      {analyzingRoute ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
                          <span className="text-gray-600">Analyzing route...</span>
                        </div>
                      ) : routeAnalysis ? (
                        <div className="space-y-4">
                          {/* Route Type */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">Route Type</h4>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRouteTypeInfo(routeAnalysis.routeType).color}`}>
                                {getRouteTypeInfo(routeAnalysis.routeType).icon} {getRouteTypeInfo(routeAnalysis.routeType).label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{getRouteTypeInfo(routeAnalysis.routeType).description}</p>
                          </div>

                          {/* Route Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm font-medium text-blue-600">Distance</p>
                              <p className="text-lg font-bold text-blue-900">{routeAnalysis.distance.text}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-sm font-medium text-green-600">Duration</p>
                              <p className="text-lg font-bold text-green-900">{routeAnalysis.duration.text}</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-sm font-medium text-purple-600">Route Complexity</p>
                              <p className="text-lg font-bold text-purple-900">
                                {routeAnalysis.isSameCity ? 'Same City' : routeAnalysis.isSameState ? 'Same State' : 'Cross-State'}
                              </p>
                            </div>
                          </div>

                          {/* Suggested Pricing */}
                          {suggestedPricing && (
                            <div className="bg-emerald-50 p-4 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-emerald-900">Suggested Pricing</h4>
                                <span className="text-lg font-bold text-emerald-900">
                                  ₦{suggestedPricing.cost.toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-emerald-700 mb-2">
                                Based on {getRouteTypeInfo(routeAnalysis.routeType).label.toLowerCase()} route analysis
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-xs text-emerald-600">
                                <div>Base Rate: ₦{suggestedPricing.pricing.baseRate}</div>
                                <div>Per KM: ₦{suggestedPricing.pricing.perKmRate}</div>
                                <div>Min Cost: ₦{suggestedPricing.pricing.minCost}</div>
                                <div>Max Cost: ₦{suggestedPricing.pricing.maxCost}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setRouteForm(prev => ({
                                    ...prev,
                                    price: suggestedPricing.cost.toString()
                                  }));
                                }}
                                className="mt-2 bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700"
                              >
                                Use Suggested Price
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">Enter pickup and delivery locations to analyze the route</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={submittingRoute}
                      className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingRoute ? 'Adding Route...' : 'Add Route'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowAddRouteForm(false)}
                      disabled={submittingRoute}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Route Modal */}
          {showEditRouteForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Edit Route</h2>
                    <button 
                      onClick={() => {
                        setShowEditRouteForm(false);
                        setEditingRoute(null);
                        setRouteForm({
                          from: '',
                          to: '',
                          distance: '',
                          price: '',
                          currency: '₦ NGN',
                          estimatedTime: '',
                          serviceType: 'Standard Delivery'
                        });
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <form onSubmit={handleSubmitRoute} className="p-6 space-y-6">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Price</label>
                      <input 
                        type="number" 
                        value={routeForm.price}
                        onChange={(e) => handleRouteFormChange('price', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
                        placeholder="0.00" 
                        min="0"
                        step="0.01"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                    <select 
                      value={routeForm.serviceType}
                      onChange={(e) => handleRouteFormChange('serviceType', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option>Standard Delivery</option>
                      <option>Express Delivery</option>
                      <option>Same Day Delivery</option>
                      <option>Overnight Delivery</option>
                    </select>
                  </div>

                  {/* Route Analysis Section for Edit Form */}
                  {(routeAnalysis || analyzingRoute) && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Analysis</h3>
                      
                      {analyzingRoute ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
                          <span className="text-gray-600">Analyzing route...</span>
                        </div>
                      ) : routeAnalysis ? (
                        <div className="space-y-4">
                          {/* Route Type */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">Route Type</h4>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRouteTypeInfo(routeAnalysis.routeType).color}`}>
                                {getRouteTypeInfo(routeAnalysis.routeType).icon} {getRouteTypeInfo(routeAnalysis.routeType).label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{getRouteTypeInfo(routeAnalysis.routeType).description}</p>
                          </div>

                          {/* Route Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm font-medium text-blue-600">Distance</p>
                              <p className="text-lg font-bold text-blue-900">{routeAnalysis.distance.text}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-sm font-medium text-green-600">Duration</p>
                              <p className="text-lg font-bold text-green-900">{routeAnalysis.duration.text}</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-sm font-medium text-purple-600">Route Complexity</p>
                              <p className="text-lg font-bold text-purple-900">
                                {routeAnalysis.isSameCity ? 'Same City' : routeAnalysis.isSameState ? 'Same State' : 'Cross-State'}
                              </p>
                            </div>
                          </div>

                          {/* Suggested Pricing */}
                          {suggestedPricing && (
                            <div className="bg-emerald-50 p-4 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-emerald-900">Suggested Pricing</h4>
                                <span className="text-lg font-bold text-emerald-900">
                                  ₦{suggestedPricing.cost.toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-emerald-700 mb-2">
                                Based on {getRouteTypeInfo(routeAnalysis.routeType).label.toLowerCase()} route analysis
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-xs text-emerald-600">
                                <div>Base Rate: ₦{suggestedPricing.pricing.baseRate}</div>
                                <div>Per KM: ₦{suggestedPricing.pricing.perKmRate}</div>
                                <div>Min Cost: ₦{suggestedPricing.pricing.minCost}</div>
                                <div>Max Cost: ₦{suggestedPricing.pricing.maxCost}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setRouteForm(prev => ({
                                    ...prev,
                                    price: suggestedPricing.cost.toString()
                                  }));
                                }}
                                className="mt-2 bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700"
                              >
                                Use Suggested Price
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">Enter pickup and delivery locations to analyze the route</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={submittingRoute}
                      className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingRoute ? 'Updating Route...' : 'Update Route'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowEditRouteForm(false);
                        setEditingRoute(null);
                        setRouteForm({
                          from: '',
                          to: '',
                          distance: '',
                          price: '',
                          currency: '₦ NGN',
                          estimatedTime: '',
                          serviceType: 'Standard Delivery'
                        });
                      }}
                      disabled={submittingRoute}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Enhanced Performance Dashboard */}
              <LogisticsPerformanceDashboard 
                logisticsId={profile?.id}
                deliveries={deliveries}
                routes={routes}
              />
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 mt-8">
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Deliveries</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : (analytics?.inTransitDeliveries || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">🚚</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : (analytics?.totalDeliveries || 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-xl">📦</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : `₦${(analytics?.totalEarnings || 0).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 text-xl">💰</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? '...' : analytics?.totalDeliveries > 0 
                          ? `${Math.round((analytics.completedDeliveries / analytics.totalDeliveries) * 100)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-xl">📈</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Deliveries</h2>
                    </div>
                    <div className="p-6">
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                          <p className="text-gray-600 mt-2">Loading deliveries...</p>
                        </div>
                      ) : deliveries.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-600">No deliveries yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {deliveries.slice(0, 3).map((delivery) => (
                            <div key={delivery.id} className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                delivery.status === 'delivered' ? 'bg-green-100' :
                                delivery.status === 'in_transit' ? 'bg-blue-100' :
                                delivery.status === 'picked_up' ? 'bg-yellow-100' : 'bg-gray-100'
                              }`}>
                                <span className={
                                  delivery.status === 'delivered' ? 'text-green-600' :
                                  delivery.status === 'in_transit' ? 'text-blue-600' :
                                  delivery.status === 'picked_up' ? 'text-yellow-600' : 'text-gray-600'
                                }>
                                  {delivery.status === 'delivered' ? '✅' : 
                                   delivery.status === 'in_transit' ? '🚚' :
                                   delivery.status === 'picked_up' ? '📦' : '⏳'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{delivery.pickupLocation} → {delivery.deliveryLocation}</p>
                                <p className="text-sm text-gray-600">
                                  {delivery.customerName} • ₦{delivery.amount?.toLocaleString()} • {delivery.status}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-xl border">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6 space-y-3">
                      {profile?.id ? (
                        <button 
                          onClick={() => setShowAddRouteForm(true)}
                          className="w-full bg-emerald-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
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
                          className="w-full bg-gray-400 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-500 transition-colors"
                        >
                          Create Profile First
                        </button>
                      )}
                      <button 
                        onClick={() => setActiveTab('deliveries')}
                        className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Manage Deliveries
                      </button>
                      <button 
                        onClick={() => setActiveTab('tracking')}
                        className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Track Packages
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">On-Time Delivery</span>
                          <span className="text-sm font-medium">98.5%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Customer Rating</span>
                          <span className="text-sm font-medium">4.9 ⭐</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Active Routes</span>
                          <span className="text-sm font-medium">12</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'deliveries' && (
            <div className="bg-white rounded-xl border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Delivery Management</h2>
                  <div className="flex gap-3">
                    <select className="text-sm border rounded-lg px-3 py-1">
                      <option>All Deliveries</option>
                      <option>Pending Pickup</option>
                      <option>In Transit</option>
                      <option>Delivered</option>
                    </select>
                    <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                      Export Data
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
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
                                      const statusMessages = {
                                        picked_up: 'Your order has been picked up and is on its way!',
                                        in_transit: 'Your order is in transit.',
                                        out_for_delivery: 'Your order is out for delivery today!',
                                        delivered: 'Your order has been delivered. Please confirm receipt.'
                                      };
                                      await firebaseService.notifications.create({
                                        userId: delivery.buyerId,
                                        type: 'delivery_update',
                                        title: 'Delivery Update',
                                        message: statusMessages[newStatus] || `Delivery status updated to ${newStatus}`,
                                        orderId: delivery.orderId,
                                        read: false
                                      });
                                    }
                                    
                                    // Update order status to match delivery
                                    if (delivery.orderId) {
                                      const orderStatusMap = {
                                        picked_up: 'shipped',
                                        in_transit: 'in_transit',
                                        out_for_delivery: 'out_for_delivery',
                                        delivered: 'delivered'
                                      };
                                      if (orderStatusMap[newStatus]) {
                                        await firebaseService.orders.updateStatus(delivery.orderId, orderStatusMap[newStatus], {
                                          logisticsUpdatedAt: new Date()
                                        });
                                      }
                                    }
                                    
                                    await loadLogisticsData();
                                    alert('Delivery status updated');
                                  } catch (err) {
                                    console.error('Failed to update delivery', err);
                                    alert('Failed to update delivery status');
                                  }
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Update
                            </button>
                            <button 
                              onClick={() => alert('Contact feature coming soon')}
                              className="text-gray-600 hover:text-gray-700 font-medium"
                            >
                              Contact
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

          {activeTab === 'routes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Routes & Pricing Management</h2>
                {profile?.id ? (
                  <button 
                    onClick={() => setShowAddRouteForm(true)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700"
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
                    className="bg-gray-400 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-500"
                  >
                    Create Profile First
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Available Routes</h3>
                    <div className="flex gap-3">
                      <select className="text-sm border rounded-lg px-3 py-1">
                        <option>All Routes</option>
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {routes.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {route.id.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.from}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.to}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.distanceDisplay}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{route.priceDisplay}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{route.estimatedTime}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {route.routeType ? (
                                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRouteTypeInfo(route.routeType).color}`}>
                                  {getRouteTypeInfo(route.routeType).icon} {getRouteTypeInfo(route.routeType).label}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  ❓ Unknown
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                route.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {route.status}
                              </span>
                            </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEditRoute(route)}
                                className="text-emerald-600 hover:text-emerald-700 font-medium"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleToggleRouteStatus(route)}
                                className={`font-medium ${
                                  route.status === 'active' 
                                    ? 'text-orange-600 hover:text-orange-700' 
                                    : 'text-blue-600 hover:text-blue-700'
                                }`}
                              >
                                {route.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button 
                                onClick={() => handleDeleteRoute(route)}
                                className="text-red-600 hover:text-red-700 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Route Analytics Section */}
              <div className="mt-8 bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Route Analytics</h3>
                    <div className="flex gap-3">
                      <select 
                        onChange={(e) => loadRouteAnalytics(parseInt(e.target.value))}
                        className="text-sm border rounded-lg px-3 py-1"
                        defaultValue="30"
                      >
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {loadingAnalytics ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading analytics...</p>
                  </div>
                ) : routeAnalytics ? (
                  <div className="p-6">
                    {/* Analytics Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-600">Total Routes</p>
                            <p className="text-2xl font-bold text-blue-900">{routeAnalytics.totalRoutes}</p>
                          </div>
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 text-xl">🗺️</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-600">Active Routes</p>
                            <p className="text-2xl font-bold text-green-900">{routeAnalytics.activeRoutes}</p>
                          </div>
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <span className="text-green-600 text-xl">✅</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-600">Total Deliveries</p>
                            <p className="text-2xl font-bold text-purple-900">{routeAnalytics.totalDeliveries}</p>
                          </div>
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <span className="text-purple-600 text-xl">📦</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-emerald-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-emerald-600">Total Revenue</p>
                            <p className="text-2xl font-bold text-emerald-900">
                              ₦{routeAnalytics.totalRevenue.toLocaleString()}
                            </p>
                          </div>
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <span className="text-emerald-600 text-xl">💰</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top Routes */}
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Routes</h4>
                      <div className="space-y-3">
                        {routeAnalytics.topRoutes.map((route, index) => (
                          <div key={route.routeId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                <span className="text-emerald-600 font-bold text-sm">#{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{route.from} → {route.to}</p>
                                <p className="text-sm text-gray-600">{route.deliveries} deliveries</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">₦{route.revenue.toLocaleString()}</p>
                              <p className="text-sm text-gray-600">{route.completionRate.toFixed(1)}% completion</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Route Performance Table */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Route Performance Details</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deliveries</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion Rate</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {routeAnalytics.routePerformance.map((route) => (
                              <tr key={route.routeId} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {route.from} → {route.to}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    route.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {route.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">{route.totalDeliveries}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{route.completionRate.toFixed(1)}%</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">₦{route.revenue.toLocaleString()}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{route.averageDeliveryTime}h</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p>No analytics data available. Create some routes and complete deliveries to see analytics.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Package Tracking</h2>
                </div>
                
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="Enter tracking ID or order ID"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700">
                        Track
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {deliveries.slice(0, 4).map((delivery) => (
                      <div key={delivery.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{delivery.trackingId}</h3>
                            <p className="text-sm text-gray-600">{delivery.orderId}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                            {delivery.status}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">From:</span>
                            <span className="font-medium">{delivery.pickup}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">To:</span>
                            <span className="font-medium">{delivery.delivery}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Customer:</span>
                            <span className="font-medium">{delivery.customer}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Est. Delivery:</span>
                            <span className="font-medium">{delivery.estimatedDelivery}</span>
                          </div>
                        </div>
                        
                        <button className="w-full text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                          View Full Tracking Details
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Earnings Overview</h2>
                    <div className="flex gap-3">
                      <button className="text-sm text-gray-600 hover:text-gray-900">Export</button>
                      <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                        Request Payout
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deliveries</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission (15%)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {earnings.map((earning) => (
                        <tr key={earning.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{earning.month}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{earning.deliveries}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{earning.revenue}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{earning.commission}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              earning.payout === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {earning.payout}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" value="Swift Logistics" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                      <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2" value="info@swiftlogistics.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2" value="+234-xxx-xxxx" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business License</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" value="BL-2023-001" />
                    </div>
                  </div>
                  <button className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                    Update Information
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Payout Settings</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Enter bank name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Enter account number" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Enter account name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Payout</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="10000" />
                    </div>
                  </div>
                  <button className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                    Update Payout Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <WalletManager userType="logistics" />
          )}
        </div>
      </div>
    </div>
  );
};

export default Logistics;
