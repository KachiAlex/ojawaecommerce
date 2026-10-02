import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
// import geoService from '../services/geoService'; // Disabled
import WalletManager from '../components/WalletManager';
import LogisticsPerformanceDashboard from '../components/LogisticsPerformanceDashboard';
import DashboardSwitcher from '../components/DashboardSwitcher';
import CSVRouteImport from '../components/CSVRouteImport';
import QuickActionsMenu from '../components/QuickActionsMenu';
import OrderTrackingModal from '../components/OrderTrackingModal';
import secureNotification from '../utils/secureNotification';
import RouteMapPreview from '../components/RouteMapPreview';
import RouteSelector from '../components/RouteSelector';
import LogisticsBusinessProfileManager from '../components/LogisticsBusinessProfileManager';
import { DEFAULT_PLATFORM_PRICING, ROUTE_CATEGORY_INFO, RECOMMENDED_PRICING } from '../data/logisticsPricingModel';
import logisticsPricingService from '../services/logisticsPricingService';
import { 
  calculatePartnerPrice,
  comparePrices
} from '../data/popularRoutes';
import { ROUTE_TEMPLATE_PRESETS } from '../data/routeTemplates';
import { validateRoute } from '../utils/routeValidation';

const Logistics = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Debug logging
  console.log('🚚 Logistics component rendered!');
  console.log('🚚 Current user:', currentUser);
  const [showAddRouteForm, setShowAddRouteForm] = useState(false);
  const [showEditRouteForm, setShowEditRouteForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [previewRoute, setPreviewRoute] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [, _analytics] = useState(null);
  const [, _routeAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // Form state for adding new route
  const [routeForm, setRouteForm] = useState({
    routeType: 'intracity', // 'intracity', 'intercity', 'international'
    country: '',
    state: '',
    city: '', // For intracity
    stateAsCity: false, // Checkbox to use state as city
    from: '', // For intercity/international
    to: '', // For intercity/international
    distance: '',
    price: '',
    currency: '₦ NGN',
    estimatedTime: '',
    vehicleType: 'Van', // Van, Truck, Motorcycle, Car, Flight
    serviceType: 'Standard Delivery'
  });
  const [submittingRoute, setSubmittingRoute] = useState(false);
  
  // Route analysis state
  const [routeAnalysis, setRouteAnalysis] = useState(null);
  const [, _analyzingRoute] = useState(false);
  const [, _suggestedPricing] = useState(null);
  const [, _calculatedPricing] = useState(null);
  
  // Multi-route selection state for intercity/international
  const [selectedCountryForIntercity, setSelectedCountryForIntercity] = useState('');
  const [intercitySearchTerm, setIntercitySearchTerm] = useState('');
  const [internationalSearchTerm, setInternationalSearchTerm] = useState('');

  const [selectedRoutes, setSelectedRoutes] = useState([]); // Array of {from, to, price, estimatedTime, vehicleType}
  const [, _setUsePartnerPricing] = useState(true); // Use partner's rate for auto-calculation
  const [routeValidations, setRouteValidations] = useState({}); // Store validation results per route
  
  // Filter and sort state
  const [, _showFilters] = useState(false);
  // ... rest of your code
  const [, _routeFilters] = useState({
    minPrice: undefined,
    maxPrice: undefined,
    minDistance: undefined,
    maxDistance: undefined,
    maxHours: undefined,
    vehicleTypes: []
  });
  const [, _sortBy] = useState('price_asc');
  
  // Batch actions state
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchAction, setBatchAction] = useState({
    type: '', // 'price_adjust', 'vehicle_change', 'price_set'
    value: ''
  });
  
  // Smart suggestions state
  const [, _showOnlyRecommended] = useState(false);

  // Delivery status dropdown state
  const [statusDropdownFor, setStatusDropdownFor] = useState(null); // delivery.id or null
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Tracking modal state
  const [trackingModalFor, setTrackingModalFor] = useState(null); // delivery object or null

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const deliveryStatusOptions = [
    { value: 'pending', label: 'Pending', color: 'text-slate-600 bg-slate-100' },
    { value: 'picked_up', label: 'Picked Up', color: 'text-blue-600 bg-blue-50' },
    { value: 'in_transit', label: 'In Transit', color: 'text-indigo-600 bg-indigo-50' },
    { value: 'out_for_delivery', label: 'Out for Delivery', color: 'text-amber-600 bg-amber-50' },
    { value: 'delivered', label: 'Delivered', color: 'text-emerald-600 bg-emerald-50' },
    { value: 'cancelled', label: 'Cancelled', color: 'text-rose-600 bg-rose-50' },
  ];

  const handleUpdateDeliveryStatus = async (deliveryId, newStatus, delivery) => {
    setUpdatingStatus(true);
    setStatusDropdownFor(null);
    try {
      await apiService.logistics.updateDeliveryStatus(deliveryId, newStatus, {
        updatedBy: currentUser.uid,
        location: 'Current Location',
        notes: 'Status updated by logistics partner'
      });

      // Notify buyer about delivery update
      if (delivery?.buyerId) {
        try {
          await apiService.notifications.create({
            userId: delivery.buyerId,
            title: 'Delivery Status Updated',
            message: `Your delivery status has been updated to: ${newStatus.replace(/_/g, ' ')}`,
            type: 'delivery_update',
            data: {
              deliveryId: deliveryId,
              status: newStatus,
              orderId: delivery.orderId
            }
          });
        } catch (e) {
          console.warn('Failed to send buyer notification:', e.message);
        }
      }

      await loadDeliveries();
      alert('Delivery status updated successfully!');
    } catch (error) {
      console.error('Error updating delivery status:', error);
      alert(`Error updating delivery status: ${error?.message || 'Please try again.'}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const loadDeliveries = useCallback(async () => {
    try {
      const userId = currentUser?.uid || currentUser?.id;
      if (!userId) {
        console.warn('No user ID available for deliveries');
        return;
      }
      const deliveriesData = await apiService.logistics.getDeliveriesByPartner(userId);
      setDeliveries(deliveriesData);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    }
  }, [currentUser]);

  const loadRoutes = useCallback(async () => {
    try {
      const userId = currentUser?.uid || currentUser?.id;
      if (!userId) {
        console.warn('No user ID available for routes');
        return;
      }
      const routesData = await apiService.logistics.getRoutesByPartner(userId);
      setRoutes(routesData);
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  }, [currentUser]);

  const loadLogisticsData = useCallback(async () => {
    try {
      console.log('🚚 Loading logistics data for user:', currentUser.uid);
      setLoading(true);
      
      // Load logistics profile
      const profileData = await apiService.logistics.getProfile(currentUser.uid);
      console.log('🚚 Profile data loaded:', profileData);
      setProfile(profileData);
      
      // Load deliveries and routes if profile exists
      if (profileData?.id) {
        await Promise.all([
          loadDeliveries(),
          loadRoutes()
        ]);
      } else {
        // Clear existing data if no profile
        setDeliveries([]);
        setRoutes([]);
      }
      
    } catch (error) {
      console.error('🚚 Error loading logistics data:', error);
      console.error('🚚 Error details:', error.message, error.stack);
      // Clear data on error
      setDeliveries([]);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, loadDeliveries, loadRoutes]);

  const loadRouteAnalytics = useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      const userId = currentUser?.uid || currentUser?.id;
      if (!userId) return;
      const analyticsData = await apiService.logistics.getRouteAnalytics(userId);
      _routeAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading route analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [currentUser]);

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

  const handleRouteFormChange = (field, value) => {
    setRouteForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get available countries, states, and cities
  const getAvailableCountries = () => {
    return [
      { code: 'NG', name: 'Nigeria' },
      { code: 'GH', name: 'Ghana' },
      { code: 'KE', name: 'Kenya' },
      { code: 'ZA', name: 'South Africa' },
      { code: 'EG', name: 'Egypt' },
      { code: 'MA', name: 'Morocco' },
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'CA', name: 'Canada' }
    ];
  };

  const getStatesForCountry = (countryCode) => {
    const states = {
      'NG': ['Lagos', 'Abuja', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Enugu', 'Delta'],
      'GH': ['Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 'Volta'],
      'KE': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika'],
      'ZA': ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State'],
      'EG': ['Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said'],
      'MA': ['Casablanca', 'Rabat', 'Fez', 'Marrakech', 'Agadir', 'Tangier'],
      'US': ['California', 'Texas', 'Florida', 'New York', 'Illinois', 'Pennsylvania'],
      'GB': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
      'CA': ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba']
    };
    return states[countryCode] || [];
  };

  const getCitiesForState = (countryCode, stateName) => {
    const cities = {
      'NG': {
        'Lagos': ['Lagos Island', 'Victoria Island', 'Ikeja', 'Surulere', 'Yaba', 'Ikoyi'],
        'Abuja': ['Garki', 'Wuse', 'Maitama', 'Asokoro', 'Utako', 'Jabi'],
        'Kano': ['Kano City', 'Nassarawa', 'Fagge', 'Gwale', 'Dala', 'Tarauni'],
        'Rivers': ['Port Harcourt', 'Obio-Akpor', 'Eleme', 'Oyigbo', 'Okrika'],
        'Oyo': ['Ibadan', 'Ogbomoso', 'Oyo', 'Iseyin', 'Saki', 'Kishi'],
        'Kaduna': ['Kaduna', 'Zaria', 'Kafanchan', 'Soba', 'Jaba', 'Kagarko'],
        'Enugu': ['Enugu', 'Nsukka', 'Oji River', 'Igbo Etiti', 'Nkanu West'],
        'Delta': ['Asaba', 'Warri', 'Ughelli', 'Sapele', 'Agbor', 'Oghara']
      }
    };
    return cities[countryCode]?.[stateName] || [];
  };

  // Analyze route when both pickup and delivery locations are entered
  const analyzeRoute = useCallback(async (from, to) => {
    if (!from || !to || from.trim() === '' || to.trim() === '') {
      setRouteAnalysis(null);
      _suggestedPricing(null);
      _calculatedPricing(null);
      return;
    }

    try {
      _analyzingRoute(true);
      
      // Use geoService to analyze the route - DISABLED
      // const analysis = await geoService.analyzeRouteType(from, to);
      const analysis = { distanceKm: 50, durationMinutes: 60, type: 'standard' }; // Fallback

      // Only update state if we got valid data
      if (analysis && analysis.distanceKm) {
        setRouteAnalysis(analysis);
        
        // Calculate pricing using our new logistics pricing service
        const pricingResult = logisticsPricingService.calculateDelivery({
          pickup: { address: from },
          dropoff: { address: to },
          weight: 1, // Default weight for route analysis
          deliveryType: routeForm.serviceType?.toLowerCase().includes('express') ? 'express' : 'standard'
        });
        
        const pricing = {
          basePrice: pricingResult.baseFare,
          distancePrice: pricingResult.distanceFee,
          finalPrice: pricingResult.totalFee,
          breakdown: pricingResult.breakdown
        };
        
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

      // Keep geoService pricing as fallback (optional) - DISABLED
      try {
        // const geoPricing = await geoService.getOptimizedPricing(from, to, {
        //   deliveryType: (routeForm.serviceType || 'standard').toLowerCase().replace(' delivery', '').replace(' ', '_'),
        //   weight: 1
        // });
        const googlePricing = null; // Disabled
        
        if (googlePricing && googlePricing.cost) {
          _suggestedPricing(googlePricing);
        } else {
          _suggestedPricing(null);
        }
      } catch (error) {
        console.warn('Geo pricing failed, using calculated pricing only:', error);
        _suggestedPricing(null);
      }

    } catch (error) {
      console.error('Error analyzing route:', error);
      // Don't show error to user, just don't update the analysis
      setRouteAnalysis(null);
      _suggestedPricing(null);
      _calculatedPricing(null);
    } finally {
      _analyzingRoute(false);
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
      // Use new logistics pricing service for recalculation
      const pricingResult = logisticsPricingService.calculateDelivery({
        pickup: { address: routeForm.from || 'Origin' },
        dropoff: { address: routeForm.to || 'Destination' },
        weight: 1,
        deliveryType: routeForm.serviceType?.toLowerCase().includes('express') ? 'express' : 'standard'
      });
      
      const pricing = {
        basePrice: pricingResult.baseFare,
        distancePrice: pricingResult.distanceFee,
        finalPrice: pricingResult.totalFee,
        breakdown: pricingResult.breakdown
      };
      
      _calculatedPricing(pricing);
      setRouteForm(prev => ({
        ...prev,
        price: pricing.finalPrice.toString()
      }));
    }
  }, [routeForm.ratePerKm, routeAnalysis?.distanceKm, routeForm.from, routeForm.to, routeForm.serviceType]);

  // Helper functions for multi-route selection
  const [, _toggleRouteSelection] = (route) => {
    const routeKey = `${route.from}-${route.to}`;
    const existingRoute = selectedRoutes.find(r => `${r.from}-${r.to}` === routeKey);
    
    if (existingRoute) {
      // Remove route
      setSelectedRoutes(selectedRoutes.filter(r => `${r.from}-${r.to}` !== routeKey));
    } else {
      // Determine initial price based on partner pricing preference
      let initialPrice = route.suggestedPrice;
      
      if (_setUsePartnerPricing && profile?.pricing?.ratePerKm) {
        const partnerPricing = calculatePartnerPrice(
          route.distance,
          profile.pricing.ratePerKm,
          profile.pricing?.intracity?.minCharge || 2000,
          profile.pricing?.intercity?.maxCharge || 100000
        );
        initialPrice = partnerPricing.finalPrice;
      }
      
      // Add route with calculated or suggested price (can be edited)
      // Ensure vehicleTypes is always an array
      const defaultVehicleTypes = ['Van', 'Truck', 'Motorcycle', 'Car'];
      const routeVehicleTypes = Array.isArray(route.vehicleTypes) && route.vehicleTypes.length > 0
        ? route.vehicleTypes
        : defaultVehicleTypes;
      
      setSelectedRoutes([...selectedRoutes, {
        from: route.from,
        to: route.to,
        price: initialPrice,
        suggestedPrice: route.suggestedPrice,
        partnerPrice: initialPrice !== route.suggestedPrice ? initialPrice : null,
        estimatedTime: route.estimatedTime,
        vehicleType: routeVehicleTypes[0],
        vehicleTypes: routeVehicleTypes, // Store available vehicle types
        distance: route.distance || 0
      }]);
    }
  };
  
  const [, _updateSelectedRoute] = (routeKey, field, value) => {
    setSelectedRoutes(selectedRoutes.map(route => {
      if (`${route.from}-${route.to}` === routeKey) {
        const updatedRoute = { ...route, [field]: value };
        
        // Trigger validation for price or time changes
        if (field === 'price' || field === 'estimatedTime') {
          setTimeout(() => validateSelectedRoute(routeKey, updatedRoute), 300);
        }
        
        return updatedRoute;
      }
      return route;
    }));
  };
  
  // Validate a specific selected route
  const validateSelectedRoute = (routeKey, route) => {
    const validation = validateRoute(
      {
        ...route,
        routeType: routeForm.routeType
      },
      routes,
      {}
    );
    
    setRouteValidations(prev => ({
      ...prev,
      [routeKey]: validation
    }));
  };
  
  const isRouteSelected = (route) => {
    const routeKey = `${route.from}-${route.to}`;
    return selectedRoutes.some(r => `${r.from}-${r.to}` === routeKey);
  };
  
  // Batch action functions
  const applyBatchAction = () => {
    if (!batchAction.type || selectedRoutes.length === 0) return;
    
    const updatedRoutes = selectedRoutes.map(route => {
      switch (batchAction.type) {
        case 'price_adjust_percent': {
          const adjustment = parseFloat(batchAction.value) || 0;
          const newPrice = route.price * (1 + adjustment / 100);
          return { ...route, price: Math.round(newPrice) };
        }
        
        case 'price_adjust_amount': {
          const amount = parseFloat(batchAction.value) || 0;
          return { ...route, price: Math.max(0, route.price + amount) };
        }
        
        case 'price_set': {
          return { ...route, price: parseFloat(batchAction.value) || route.price };
        }
        
        case 'vehicle_change': {
          return { ...route, vehicleType: batchAction.value };
        }
        
        default:
          return route;
      }
    });
    
    setSelectedRoutes(updatedRoutes);
    setShowBatchActions(false);
    setBatchAction({ type: '', value: '' });
  };
  
  const [, _selectAllVisibleRoutes] = (routesList) => {
    const defaultVehicleTypes = ['Van', 'Truck', 'Motorcycle', 'Car'];

    const newSelections = routesList
      .filter(route => !isRouteSelected(route))
      .map(route => {
        let initialPrice = route.suggestedPrice;

        if (_setUsePartnerPricing && profile?.pricing?.ratePerKm) {
          const partnerPricing = calculatePartnerPrice(
            route.distance,
            profile.pricing.ratePerKm,
            profile.pricing?.intracity?.minCharge || 2000,
            profile.pricing?.intercity?.maxCharge || 100000
          );
          initialPrice = partnerPricing.finalPrice;
        }

        const availableVehicles = Array.isArray(route.vehicleTypes) && route.vehicleTypes.length > 0
          ? route.vehicleTypes
          : defaultVehicleTypes;

        return {
          from: route.from,
          to: route.to,
          price: initialPrice,
          suggestedPrice: route.suggestedPrice,
          partnerPrice: initialPrice !== route.suggestedPrice ? initialPrice : null,
          estimatedTime: route.estimatedTime,
          vehicleType: availableVehicles[0],
          vehicleTypes: availableVehicles,
          distance: route.distance || 0
        };
      });

    if (!newSelections.length) return;

    setSelectedRoutes(prev => [...prev, ...newSelections]);
  };

  const [, _deselectAllRoutes] = () => {
    setSelectedRoutes([]);
    setRouteValidations({});
  };

  const saveDraft = () => {
    if (!selectedRoutes.length) {
      secureNotification.warning('Select at least one route to save.');
      return;
    }

    const draft = {
      routeType: routeForm.routeType,
      selectedRoutes,
      selectedCountryForIntercity,
      intercitySearchTerm,
      internationalSearchTerm,
      currency: routeForm.currency,
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(`logistics_route_draft_${profile?.id}`, JSON.stringify(draft));
    secureNotification.success(`Draft saved! ${selectedRoutes.length} route(s) saved for later.`);
  };

  const loadDraft = () => {
    const draftJson = localStorage.getItem(`logistics_route_draft_${profile?.id}`);
    if (!draftJson) {
      secureNotification.warning('No saved draft found.');
      return;
    }
    
    try {
      const draft = JSON.parse(draftJson);
      const savedDate = new Date(draft.savedAt).toLocaleString();
      
      if (confirm(`Load draft from ${savedDate}?\n\n${draft.selectedRoutes.length} route(s) will be restored.`)) {
        setRouteForm(prev => ({ ...prev, routeType: draft.routeType, currency: draft.currency }));
        setSelectedRoutes(draft.selectedRoutes || []);
        setSelectedCountryForIntercity(draft.selectedCountryForIntercity || '');
        setIntercitySearchTerm(draft.intercitySearchTerm || '');
        setInternationalSearchTerm(draft.internationalSearchTerm || '');
        secureNotification.success('Draft loaded successfully!');
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      secureNotification.error('Error loading draft. The saved data may be corrupted.');
    }
  };
  
  const [, _clearDraft] = () => {
    if (confirm('Delete saved draft? This cannot be undone.')) {
      localStorage.removeItem(`logistics_route_draft_${profile?.id}`);
      secureNotification.success('Draft deleted.');
    }
  };

  const [, _renderRouteWarnings] = (routeKey) => {
    const warnings = routeValidations[routeKey]?.warnings || [];
    if (!warnings.length) return null;

    return (
      <div className="space-y-1">
        {warnings.map((warning, idx) => {
          const isError = warning.severity === 'error';
          return (
            <div
              key={`${routeKey}-warning-${idx}`}
              className={`text-xs ${
                isError
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              } p-2 rounded flex items-start gap-2`}
            >
              <span className={isError ? 'text-red-600 flex-shrink-0' : 'text-yellow-600 flex-shrink-0'}>
                {isError ? '⚠️' : '💡'}
              </span>
              <div>
                <div className="font-medium">{warning.message}</div>
                {warning.recommendation && (
                  <div className={isError ? 'text-red-700 mt-1' : 'text-yellow-700 mt-1'}>
                    {warning.recommendation}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const [, _renderMarketSuggestion] = (routeKey, selectedRoute) => {
    if (!selectedRoute) return null;
    if (selectedRoute.suggestedPrice === selectedRoute.price) return null;

    const hasPricingWarning = routeValidations[routeKey]?.warnings?.some((warning) =>
      warning.type?.includes('pricing')
    );
    if (hasPricingWarning) return null;

    const comparison = comparePrices(selectedRoute.price, selectedRoute.suggestedPrice);

    return (
      <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
        Market suggestion: ₦{selectedRoute.suggestedPrice.toLocaleString()}
        <span
          className={`ml-2 ${
            comparison.isLower
              ? 'text-emerald-600'
              : comparison.isHigher
                ? 'text-orange-600'
                : 'text-gray-600'
          }`}
        >
          ({comparison.percentageDiff > 0 ? '+' : ''}{comparison.percentageDiff}%)
        </span>
      </div>
    );
  };

  const [, _renderBatchActionsPanel] = () => {
    if (!selectedRoutes.length) return null;

    const totalValue = selectedRoutes.reduce((sum, route) => sum + (parseFloat(route.price) || 0), 0);

    return (
      <div className="mt-4 space-y-3">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="font-medium text-emerald-900">✓ {selectedRoutes.length} route(s) selected</div>
          <div className="text-sm text-emerald-700">
            Total estimated value: ₦{totalValue.toLocaleString()}
          </div>
        </div>

        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <button
            onClick={() => setShowBatchActions(!showBatchActions)}
            className="text-sm font-medium text-purple-900 hover:text-purple-700 flex items-center gap-2"
          >
            ⚡ Bulk Actions {showBatchActions ? '▼' : '▶'}
          </button>

          {showBatchActions && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={batchAction.type}
                  onChange={(e) => setBatchAction({ ...batchAction, type: e.target.value })}
                  className="w-full border border-purple-300 rounded px-2 py-1.5 text-sm"
                >
                  <option value="">-- Select Action --</option>
                  <option value="price_adjust_percent">Adjust Price by %</option>
                  <option value="price_adjust_amount">Adjust Price by ₦</option>
                  <option value="price_set">Set Same Price</option>
                  <option value="vehicle_change">Change Vehicle Type</option>
                </select>

                {batchAction.type === 'price_adjust_percent' && (
                  <input
                    type="number"
                    value={batchAction.value}
                    onChange={(e) => setBatchAction({ ...batchAction, value: e.target.value })}
                    className="w-full border border-purple-300 rounded px-2 py-1.5 text-sm"
                    placeholder="e.g., 10 for +10%, -15 for -15%"
                  />
                )}

                {batchAction.type === 'price_adjust_amount' && (
                  <input
                    type="number"
                    value={batchAction.value}
                    onChange={(e) => setBatchAction({ ...batchAction, value: e.target.value })}
                    className="w-full border border-purple-300 rounded px-2 py-1.5 text-sm"
                    placeholder="e.g., 5000 to add ₦5000"
                  />
                )}

                {batchAction.type === 'price_set' && (
                  <input
                    type="number"
                    value={batchAction.value}
                    onChange={(e) => setBatchAction({ ...batchAction, value: e.target.value })}
                    className="w-full border border-purple-300 rounded px-2 py-1.5 text-sm"
                    placeholder="e.g., 50000"
                  />
                )}

                {batchAction.type === 'vehicle_change' && (
                  <select
                    value={batchAction.value}
                    onChange={(e) => setBatchAction({ ...batchAction, value: e.target.value })}
                    className="w-full border border-purple-300 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">-- Select Vehicle --</option>
                    <option>Van</option>
                    <option>Truck</option>
                    <option>Motorcycle</option>
                    <option>Car</option>
                  </select>
                )}

                <button
                  onClick={applyBatchAction}
                  disabled={!batchAction.type || !batchAction.value}
                  className="px-4 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply to All
                </button>
              </div>

              <div className="text-xs text-purple-700">
                💡 Tip: This will apply the change to all {selectedRoutes.length} selected route(s)
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Check if draft exists
  const hasDraft = () => {
    return !!localStorage.getItem(`logistics_route_draft_${profile?.id}`);
  };

  // Quick actions handler
  const handleQuickAction = (actionType, value) => {
    switch (actionType) {
      case 'template': {
        const template = ROUTE_TEMPLATE_PRESETS[value];
        if (template) {
          const adjusted = selectedRoutes.map(route => ({
            ...route,
            price: Math.round(route.price * (1 + template.priceAdjustment / 100))
          }));
          setSelectedRoutes(adjusted);
        }
        break;
      }
      
      case 'match_market': {
        const matched = selectedRoutes.map(route => ({
          ...route,
          price: route.suggestedPrice
        }));
        setSelectedRoutes(matched);
        break;
      }
      
      case 'round_prices': {
        const rounded = selectedRoutes.map(route => ({
          ...route,
          price: Math.round(route.price / 1000) * 1000
        }));
        setSelectedRoutes(rounded);
        break;
      }
      
      case 'export_csv': {
        exportRoutesToCSV(selectedRoutes);
        break;
      }
      
      default:
        break;
    }
  };
  
  // Export routes to CSV
  const exportRoutesToCSV = (routes) => {
    const headers = ['Route Type', 'From', 'To', 'Distance (km)', 'Price', 'Estimated Time', 'Vehicle Type'];
    const rows = routes.map(r => [
      routeForm.routeType,
      r.from,
      r.to,
      r.distance,
      r.price,
      r.estimatedTime,
      r.vehicleType
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logistics_routes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

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
      
      // Handle intracity routes (single route submission)
      if (routeForm.routeType === 'intracity') {
        const cityRequired = !routeForm.stateAsCity && !routeForm.city;
        if (!routeForm.country || !routeForm.state || cityRequired || !routeForm.price || !routeForm.estimatedTime) {
          secureNotification.warning('Please fill in country, state, city (or select "State as City"), price, and estimated time for intracity route.');
          setSubmittingRoute(false);
          return;
        }
        
        const cityName = routeForm.stateAsCity ? routeForm.state : routeForm.city;
        const routeData = {
          routeType: routeForm.routeType,
          country: routeForm.country,
          state: routeForm.state,
          city: cityName,
          stateAsCity: routeForm.stateAsCity,
          from: `${cityName} (Intracity)`,
          to: `${cityName} (Intracity)`,
          distance: 0,
          price: parseFloat(routeForm.price) || 0,
          currency: routeForm.currency,
          estimatedTime: routeForm.estimatedTime.trim(),
          vehicleType: routeForm.vehicleType,
          serviceType: routeForm.serviceType,
          createdAt: new Date().toISOString(),
          status: 'active'
        };
        
        await apiService.logistics.addRoute(currentUser?.uid || currentUser?.id, routeData);
        secureNotification.success('Intracity route added successfully!');

        // Reset form and reload routes
        setRouteForm(prev => ({
          ...prev,
          country: '',
          state: '',
          city: '',
          stateAsCity: false,
          from: '',
          to: '',
          distance: '',
          price: '',
          currency: '₦ NGN',
          estimatedTime: '',
          vehicleType: 'Van',
          serviceType: 'Standard Delivery'
        }));
        setShowAddRouteForm(false);
        await loadRoutes();
      } 
      // Handle intercity/international routes (multiple route submission)
      else if (routeForm.routeType === 'intercity' || routeForm.routeType === 'international') {
        if (selectedRoutes.length === 0) {
          secureNotification.warning(`Please select at least one ${routeForm.routeType} route to add.`);
          setSubmittingRoute(false);
          return;
        }
        
        // Check for validation warnings
        const routesWithErrors = selectedRoutes.filter(route => {
          const routeKey = `${route.from}-${route.to}`;
          const validation = routeValidations[routeKey];
          return validation?.warnings?.some(w => w.severity === 'error');
        });
        
        const routesWithWarnings = selectedRoutes.filter(route => {
          const routeKey = `${route.from}-${route.to}`;
          const validation = routeValidations[routeKey];
          return validation?.warnings?.some(w => w.severity === 'warning') && 
                 !validation?.warnings?.some(w => w.severity === 'error');
        });
        
        // If there are errors, ask for confirmation
        if (routesWithErrors.length > 0) {
          const proceed = confirm(
            `⚠️ ${routesWithErrors.length} route(s) have critical warnings.\n\n` +
            `These routes may have pricing or timing issues that could affect your business.\n\n` +
            `Do you want to proceed anyway?`
          );
          if (!proceed) {
            setSubmittingRoute(false);
            return;
          }
        } else if (routesWithWarnings.length > 0) {
          const proceed = confirm(
            `💡 ${routesWithWarnings.length} route(s) have recommendations.\n\n` +
            `You can review and adjust these before adding, or proceed now.\n\n` +
            `Continue with route creation?`
          );
          if (!proceed) {
            setSubmittingRoute(false);
            return;
          }
        }
        
        // Add all selected routes
        const addPromises = selectedRoutes.map(route => {
          const routeData = {
            routeType: routeForm.routeType,
            country: '',
            state: '',
            city: '',
            stateAsCity: false,
            from: route.from,
            to: route.to,
            distance: route.distance || 0,
            price: parseFloat(route.price) || 0,
            currency: routeForm.currency,
            estimatedTime: route.estimatedTime,
            vehicleType: route.vehicleType,
            serviceType: routeForm.serviceType,
            createdAt: new Date().toISOString(),
            status: 'active'
          };

          return apiService.logistics.addRoute(currentUser?.uid || currentUser?.id, routeData);
        });

        await Promise.all(addPromises);

        setRouteForm(prev => ({
          ...prev,
          country: '',
          state: '',
          city: '',
          stateAsCity: false,
          from: '',
          to: '',
          distance: '',
          price: '',
          currency: '₦ NGN',
          estimatedTime: '',
          vehicleType: 'Van',
          serviceType: 'Standard Delivery'
        }));

        setSelectedCountryForIntercity('');
        setIntercitySearchTerm('');
        setInternationalSearchTerm('');
        setShowAddRouteForm(false);

        // Reload routes
        await loadRoutes();
      }
      
    } catch (error) {
      console.error('Error saving route:', error);
      secureNotification.error('Error saving route. Please try again.');
    } finally {
      setSubmittingRoute(false);
    }
  };

  const handleEditRouteSubmit = async (e) => {
    e.preventDefault();
    if (!editingRoute) return;

    try {
      setSubmittingRoute(true);
      const updates = {
        from: routeForm.from,
        to: routeForm.to,
        distance: parseFloat(routeForm.distance) || 0,
        price: parseFloat(routeForm.price) || 0,
        currency: routeForm.currency,
        estimatedTime: routeForm.estimatedTime,
        serviceType: routeForm.serviceType,
        ratePerKm: parseFloat(routeForm.ratePerKm) || DEFAULT_PLATFORM_PRICING.ratePerKm,
        vehicleType: routeForm.vehicleType,
      };

      await apiService.logistics.updateRoute(editingRoute.id, updates);
      secureNotification.success('Route updated successfully!');
      setShowEditRouteForm(false);
      setEditingRoute(null);
      await loadRoutes();
    } catch (error) {
      console.error('Error updating route:', error);
      secureNotification.error('Error updating route. Please try again.');
    } finally {
      setSubmittingRoute(false);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-indigo-100 text-indigo-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
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
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className="flex">
        {/* Sidebar */}
        <div className={`w-64 bg-white shadow-lg relative lg:block ${sidebarOpen ? 'fixed inset-y-0 left-0 z-40 block' : 'hidden'}`}>
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Logistics Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your delivery operations</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="p-4 space-y-2">
            <button 
              onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'overview' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              📊 Overview
            </button>
            <button 
              onClick={() => { setActiveTab('routes'); setSidebarOpen(false); }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'routes' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              🛣️ Routes
            </button>
            <button 
              onClick={() => { setActiveTab('orders'); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'orders' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <span>🛒 Orders</span>
              {deliveries.filter(d => d.status === 'shipped').length > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {deliveries.filter(d => d.status === 'shipped').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('deliveries'); setSidebarOpen(false); }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'deliveries' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              📦 Deliveries
            </button>
            <button 
              onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'analytics' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              📈 Analytics
            </button>
            <button 
              onClick={() => { setActiveTab('wallet'); setSidebarOpen(false); }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'wallet' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              💳 My Wallet
            </button>
            <button 
              onClick={() => { setActiveTab('business-profile'); setSidebarOpen(false); }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'business-profile' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              🏢 Business Profile
            </button>
            <button 
              onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'settings' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              ⚙️ Settings
            </button>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <Link 
              to="/" 
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {/* Mobile header with hamburger */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg bg-white shadow text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">Logistics</h1>
          </div>
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
                  {/* Route Type Selection */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Route Type</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <button
                        type="button"
                        onClick={() => handleRouteFormChange('routeType', 'intracity')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          routeForm.routeType === 'intracity'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">🏙️</div>
                          <div className="font-semibold">Intracity</div>
                          <div className="text-xs text-gray-500 mt-1">Within same city</div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleRouteFormChange('routeType', 'intercity')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          routeForm.routeType === 'intercity'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">🚛</div>
                          <div className="font-semibold">Intercity</div>
                          <div className="text-xs text-gray-500 mt-1">Between cities</div>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleRouteFormChange('routeType', 'international')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          routeForm.routeType === 'international'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">✈️</div>
                          <div className="font-semibold">International</div>
                          <div className="text-xs text-gray-500 mt-1">Cross-border</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Route Details Based on Type */}
                  {routeForm.routeType === 'intracity' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">🏙️ Intracity Route Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                          <select
                            value={routeForm.country}
                            onChange={(e) => {
                              handleRouteFormChange('country', e.target.value);
                              handleRouteFormChange('state', '');
                              handleRouteFormChange('city', '');
                              handleRouteFormChange('stateAsCity', false);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            required
                          >
                            <option value="">Select Country</option>
                            {getAvailableCountries().map(country => (
                              <option key={country.code} value={country.name}>{country.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                          <select
                            value={routeForm.state}
                            onChange={(e) => {
                              handleRouteFormChange('state', e.target.value);
                              handleRouteFormChange('city', '');
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            required
                            disabled={!routeForm.country}
                          >
                            <option value="">Select State</option>
                            {routeForm.country && getStatesForCountry(getAvailableCountries().find(c => c.name === routeForm.country)?.code || '').map(state => (
                              <option key={state} value={state}>{state}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            City {!routeForm.stateAsCity && '*'}
                          </label>
                          <select
                            value={routeForm.city}
                            onChange={(e) => handleRouteFormChange('city', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            required={!routeForm.stateAsCity}
                            disabled={!routeForm.state || routeForm.stateAsCity}
                          >
                            <option value="">Select City</option>
                            {routeForm.country && routeForm.state && getCitiesForState(
                              getAvailableCountries().find(c => c.name === routeForm.country)?.code || '',
                              routeForm.state
                            ).map(city => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {/* State as City Checkbox */}
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={routeForm.stateAsCity}
                            onChange={(e) => {
                              handleRouteFormChange('stateAsCity', e.target.checked);
                              if (e.target.checked) {
                                handleRouteFormChange('city', '');
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <div>
                            <span className="text-sm font-medium text-blue-900">
                              Use state as city (e.g., Lagos State = Lagos City)
                            </span>
                            <p className="text-xs text-blue-700 mt-1">
                              Check this if the state name is the same as the main city (like Lagos, Abuja, etc.)
                            </p>
                          </div>
                        </label>
                      </div>
                      
                      {/* Display Selected Location */}
                      {routeForm.country && routeForm.state && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">📍</span>
                            <span className="text-sm font-medium text-green-900">
                              Selected Location: {routeForm.stateAsCity ? routeForm.state : routeForm.city || 'No city selected'}, {routeForm.state}, {routeForm.country}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Intercity & International Routes - Clean Component */}
                  {(routeForm.routeType === 'intercity' || routeForm.routeType === 'international') && (
                    <RouteSelector
                      routeType={routeForm.routeType}
                      profile={profile}
                      calculatePartnerPrice={calculatePartnerPrice}
                      onRoutesSelected={(routes) => {
                        setSelectedRoutes(routes);
                        secureNotification.info(`${routes.length} route(s) selected. Click "Add Route(s)" to save.`);
                      }}
                    />
                  )}
                  
                  {/* Pricing and Details - Only for Intracity */}
                  {routeForm.routeType === 'intracity' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Pricing & Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
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
                            <option>£ GBP</option>
                            <option>€ EUR</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Time *</label>
                          <input
                            type="text"
                            value={routeForm.estimatedTime}
                            onChange={(e) => handleRouteFormChange('estimatedTime', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="e.g., 1-2 hours"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                          <select
                            value={routeForm.vehicleType}
                            onChange={(e) => handleRouteFormChange('vehicleType', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            <option>Van</option>
                            <option>Truck</option>
                            <option>Motorcycle</option>
                            <option>Car</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-4">
                    {/* Draft Actions - Left Side */}
                    {(routeForm.routeType === 'intercity' || routeForm.routeType === 'international') && selectedRoutes.length > 0 && (
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={saveDraft}
                          className="px-3 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          💾 Save Draft
                        </button>
                        {hasDraft() && (
                          <button 
                            type="button"
                            onClick={loadDraft}
                            className="px-3 py-2 text-sm text-purple-700 bg-purple-50 border border-purple-300 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            📂 Load Draft
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Main Actions - Right Side */}
                    <div className="flex space-x-3 ml-auto">
                      <button 
                        type="button"
                        onClick={() => {
                          setShowAddRouteForm(false);
                          setSelectedRoutes([]);
                          setSelectedCountryForIntercity('');
                          setIntercitySearchTerm('');
                          setInternationalSearchTerm('');
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={submittingRoute}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {submittingRoute ? 'Adding...' : routeForm.routeType === 'intracity' ? 'Add Route' : `Add ${selectedRoutes.length} Route(s)`}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Route Modal */}
          {showEditRouteForm && editingRoute && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Edit Route</h2>
                    <button
                      onClick={() => { setShowEditRouteForm(false); setEditingRoute(null); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <form onSubmit={handleEditRouteSubmit} className="p-6 space-y-4">
                  {routeForm.routeType !== 'intracity' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                        <input
                          type="text"
                          value={routeForm.from || ''}
                          onChange={(e) => setRouteForm(prev => ({ ...prev, from: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                        <input
                          type="text"
                          value={routeForm.to || ''}
                          onChange={(e) => setRouteForm(prev => ({ ...prev, to: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {routeForm.routeType === 'intracity' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={routeForm.city || routeForm.from || ''}
                        onChange={(e) => setRouteForm(prev => ({ ...prev, city: e.target.value, from: `${e.target.value} (Intracity)`, to: `${e.target.value} (Intracity)` }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={routeForm.distance || ''}
                        onChange={(e) => setRouteForm(prev => ({ ...prev, distance: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (minimum charge)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={routeForm.price || ''}
                        onChange={(e) => setRouteForm(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Final fee = max(base price, rate/km × distance)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                      <select
                        value={routeForm.currency || '₦ NGN'}
                        onChange={(e) => setRouteForm(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="₦ NGN">₦ NGN</option>
                        <option value="$ USD">$ USD</option>
                        <option value="€ EUR">€ EUR</option>
                        <option value="£ GBP">£ GBP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Est. Time</label>
                      <input
                        type="text"
                        value={routeForm.estimatedTime || ''}
                        onChange={(e) => setRouteForm(prev => ({ ...prev, estimatedTime: e.target.value }))}
                        placeholder="e.g., 2-3 hours"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                      <select
                        value={routeForm.serviceType || 'Standard Delivery'}
                        onChange={(e) => setRouteForm(prev => ({ ...prev, serviceType: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Standard Delivery">Standard Delivery</option>
                        <option value="Express Delivery">Express Delivery</option>
                        <option value="Same Day">Same Day</option>
                        <option value="Next Day">Next Day</option>
                        <option value="Bulk Delivery">Bulk Delivery</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                      <select
                        value={routeForm.vehicleType || 'Van'}
                        onChange={(e) => setRouteForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Van">Van</option>
                        <option value="Truck">Truck</option>
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Car">Car</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate per km (₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={routeForm.ratePerKm || ''}
                      onChange={(e) => setRouteForm(prev => ({ ...prev, ratePerKm: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used to calculate distance-based fee. Final fee is the higher of base price or rate/km × distance.</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => { setShowEditRouteForm(false); setEditingRoute(null); }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingRoute}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {submittingRoute ? 'Saving...' : 'Save Changes'}
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
                <div className="flex gap-3">
                  {profile?.id && (
                    <button 
                      onClick={() => setShowCSVImport(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      📊 Import CSV
                    </button>
                  )}
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
              </div>

              <div className="bg-white rounded-lg shadow overflow-x-auto">
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
                              <p className="text-sm font-medium text-gray-900">
                                {route.routeType === 'intracity' && !route.from.includes('(Intracity)') 
                                  ? `${route.city || route.from} (Intracity)` 
                                  : route.from || route.city}
                              </p>
                              <p className="text-sm text-gray-500">
                                {route.routeType === 'intracity' 
                                  ? 'Within city delivery' 
                                  : `→ ${route.to}`}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.distance} km</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.currency} {route.price}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₦{route.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm}/km</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.serviceType}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{route.estimatedTime}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                            <button 
                              onClick={async () => {
                                if (confirm(`Duplicate this route?\n\n${route.from} → ${route.to}\nPrice: ${route.currency} ${route.price}\n\nA copy will be created that you can edit.`)) {
                                  try {
                                    const duplicatedRoute = {
                                      routeType: route.routeType || 'intercity',
                                      country: route.country || '',
                                      state: route.state || '',
                                      city: route.city || '',
                                      stateAsCity: route.stateAsCity || false,
                                      from: route.from,
                                      to: route.to,
                                      distance: route.distance || 0,
                                      price: route.price,
                                      currency: route.currency,
                                      estimatedTime: route.estimatedTime,
                                      vehicleType: route.vehicleType || 'Van',
                                      serviceType: route.serviceType || 'Standard Delivery',
                                      createdAt: new Date().toISOString(),
                                      status: 'active'
                                    };
                                    await apiService.logistics.addRoute(currentUser?.uid || currentUser?.id, duplicatedRoute);
                                    await loadRoutes();
                                    alert('Route duplicated successfully! You can now edit the copy.');
                                  } catch (error) {
                                    console.error('Error duplicating route:', error);
                                    alert('Error duplicating route. Please try again.');
                                  }
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              📋 Copy
                            </button>
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
                                  ratePerKm: route.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm,
                                  vehicleType: route.vehicleType || 'Van',
                                  routeType: route.routeType || 'intercity',
                                  country: route.country || '',
                                  state: route.state || '',
                                  city: route.city || ''
                                });
                                setShowEditRouteForm(true);
                              }}
                              className="text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this route?')) {
                                  try {
                                    await apiService.logistics.deleteRoute(route.id);
                                    await loadRoutes();
                                    alert('Route deleted successfully!');
                                  } catch (error) {
                                    console.error('Error deleting route:', error);
                                    alert('Error deleting route. Please try again.');
                                  }
                                }
                              }}
                              className="text-red-600 hover:text-red-700 font-medium"
                            >
                              🗑️ Delete
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

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Assigned Orders</h2>
                <button
                  onClick={() => loadDeliveries()}
                  className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                >
                  Refresh
                </button>
              </div>

              {deliveries.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <div className="text-4xl mb-4">🛒</div>
                  <p className="text-gray-500 text-lg">No orders assigned yet</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Orders will appear here when vendors mark products as ready for shipment.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deliveries.map((delivery) => {
                    const items = delivery.items || [];
                    const addr = delivery.logisticsMeta?.routeInfo || {};
                    const isReadyForPickup = delivery.status === 'shipped';
                    return (
                      <div key={delivery.id} className="bg-white rounded-lg shadow overflow-visible">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {delivery.orderNumber || delivery.id}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(delivery.createdAt).toLocaleDateString()} · {delivery.deliveryOption || 'standard'}
                              </p>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                              {delivery.status}
                            </span>
                            {delivery.paymentStatus && (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                delivery.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {delivery.paymentStatus}
                              </span>
                            )}
                          </div>
                          {isReadyForPickup && (
                            <span className="inline-flex items-center px-3 py-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                              Ready for Pickup
                            </span>
                          )}
                        </div>

                        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Customer</p>
                            <p className="text-sm text-gray-900 font-medium">{delivery.customer}</p>
                            <p className="text-xs text-gray-500 mt-1">{delivery.delivery}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Delivery Route</p>
                            <p className="text-sm text-gray-900">
                              {addr.from || 'Warehouse'} → {addr.to || delivery.delivery}
                            </p>
                            {addr.category && (
                              <p className="text-xs text-gray-500 mt-1 capitalize">{addr.category} · {addr.distance || '?'}km</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Amount</p>
                            <p className="text-sm text-gray-900 font-semibold">
                              ₦{Number(delivery.amount || 0).toLocaleString()}
                            </p>
                            {delivery.logisticsMeta?.deliveryFee > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Delivery Fee: ₦{Number(delivery.logisticsMeta.deliveryFee).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {items.length > 0 && (
                          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-400 uppercase mb-2">Items ({items.length})</p>
                            <div className="space-y-2">
                              {items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                  {item.productImage && (
                                    <img
                                      src={item.productImage}
                                      alt={item.productName || 'Product'}
                                      className="w-10 h-10 rounded object-cover"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-900">{item.productName || 'Product'}</p>
                                    <p className="text-xs text-gray-500">
                                      Qty: {item.quantity} · ₦{Number(item.unitPrice || 0).toLocaleString()} each
                                    </p>
                                  </div>
                                  <p className="text-sm font-medium text-gray-900">
                                    ₦{Number(item.totalPrice || 0).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="px-6 py-3 border-t border-gray-100 flex gap-3">
                          <button
                            onClick={() => setTrackingModalFor(delivery)}
                            className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                          >
                            Track
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setStatusDropdownFor(statusDropdownFor === delivery.id ? null : delivery.id)}
                              disabled={updatingStatus}
                              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                            >
                              {updatingStatus ? 'Updating...' : 'Update Status'}
                            </button>
                            {statusDropdownFor === delivery.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                                {deliveryStatusOptions.map(opt => (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleUpdateDeliveryStatus(delivery.id, opt.value, delivery)}
                                    disabled={delivery.status === opt.value}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed ${opt.color}`}
                                  >
                                    {opt.label}
                                    {delivery.status === opt.value && <span className="ml-2 text-xs">(current)</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'deliveries' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Manage Deliveries</h2>
              
              <div className="bg-white rounded-lg shadow overflow-visible">
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
                              onClick={() => setTrackingModalFor(delivery)}
                              className="text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              Track
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => setStatusDropdownFor(statusDropdownFor === delivery.id ? null : delivery.id)}
                                disabled={updatingStatus}
                                className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                              >
                                {updatingStatus ? 'Updating...' : 'Update Status'}
                              </button>
                              {statusDropdownFor === delivery.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                                  {deliveryStatusOptions.map(opt => (
                                    <button
                                      key={opt.value}
                                      onClick={() => handleUpdateDeliveryStatus(delivery.id, opt.value, delivery)}
                                      disabled={delivery.status === opt.value}
                                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed ${opt.color}`}
                                    >
                                      {opt.label}
                                      {delivery.status === opt.value && <span className="ml-2 text-xs">(current)</span>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
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
                  analytics={_routeAnalytics}
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

          {activeTab === 'business-profile' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Business Profile</h2>
              <LogisticsBusinessProfileManager />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500">General settings panel coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* CSV Import Modal */}
      <CSVRouteImport
        isOpen={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        currency={routeForm.currency}
        onImport={async (routes) => {
          try {
            setSubmittingRoute(true);
            
            // Import all routes
            const importPromises = routes.map(route => 
              apiService.logistics.addRoute(currentUser?.uid || currentUser?.id, route)
            );
            
            await Promise.all(importPromises);
            await loadRoutes();
            alert(`Successfully imported ${routes.length} route(s)!`);
          } catch (error) {
            console.error('Error importing routes:', error);
            alert('Error importing routes. Please try again.');
          } finally {
            setSubmittingRoute(false);
          }
        }}
      />
      
      {/* Quick Actions Menu */}
      <QuickActionsMenu
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        selectedRoutes={selectedRoutes}
        onAction={handleQuickAction}
      />
      
      {/* Floating Quick Actions Button - Shows when routes are selected */}
      {selectedRoutes.length > 0 && showAddRouteForm && (
        <button
          onClick={() => setShowQuickActions(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-emerald-600 to-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2 z-40"
        >
          <span className="text-lg">🚀</span>
          <span className="font-medium">Quick Actions</span>
          <span className="bg-white text-emerald-600 px-2 py-0.5 rounded-full text-xs font-bold">
            {selectedRoutes.length}
          </span>
        </button>
      )}
      
      {/* Route Map Preview Modal */}
      <RouteMapPreview
        isOpen={showMapPreview}
        onClose={() => {
          setShowMapPreview(false);
          setPreviewRoute(null);
        }}
        route={previewRoute}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        trackingId={trackingModalFor?.trackingId || trackingModalFor?.trackingNumber || trackingModalFor?.orderId || trackingModalFor?.id}
        isOpen={!!trackingModalFor}
        onClose={() => setTrackingModalFor(null)}
      />

    </div>
  );
};

export default Logistics;
