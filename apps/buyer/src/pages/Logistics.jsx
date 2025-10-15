import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import googleMapsService from '../services/googleMapsService';
import WalletManager from '../components/WalletManager';
import LogisticsPerformanceDashboard from '../components/LogisticsPerformanceDashboard';
import DashboardSwitcher from '../components/DashboardSwitcher';
import CSVRouteImport from '../components/CSVRouteImport';
import QuickActionsMenu from '../components/QuickActionsMenu';
import RouteMapPreview from '../components/RouteMapPreview';
import { calculateDeliveryPrice, determineRouteCategory, DEFAULT_PLATFORM_PRICING, ROUTE_CATEGORY_INFO, RECOMMENDED_PRICING } from '../data/logisticsPricingModel';
import { 
  POPULAR_INTERCITY_ROUTES, 
  POPULAR_INTERNATIONAL_ROUTES, 
  getIntercityRoutesForCountry, 
  getCountriesWithIntercityRoutes,
  searchIntercityRoutes,
  searchInternationalRoutes,
  formatPrice,
  enrichRouteWithPartnerPricing,
  calculatePartnerPrice,
  comparePrices,
  filterRoutes,
  sortRoutes,
  getRouteStats,
  filterByServiceAreas,
  getRecommendedRoutes
} from '../data/popularRoutes';
import { 
  validateRoute, 
  formatValidationMessage,
  checkDuplicateRoute,
  validatePricing,
  validateEstimatedTime 
} from '../utils/routeValidation';
import { 
  getRouteMarketInsights, 
  getPricingRecommendation, 
  getDemandIndicator 
} from '../data/marketAnalytics';
import { ROUTE_TEMPLATE_PRESETS } from '../data/routeTemplates';
import { detectCurrency, convertCurrency, formatCurrency, getAllCurrencies, getDualCurrencyDisplay } from '../utils/currencyUtils';
import { getRouteDemandInfo, getSeasonalAdjustment, applySeasonalPricing, getTopRecommendations } from '../data/demandAnalytics';

const Logistics = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddRouteForm, setShowAddRouteForm] = useState(false);
  const [showEditRouteForm, setShowEditRouteForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [previewRoute, setPreviewRoute] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [routeAnalytics, setRouteAnalytics] = useState(null);
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
  const [analyzingRoute, setAnalyzingRoute] = useState(false);
  const [suggestedPricing, setSuggestedPricing] = useState(null);
  const [calculatedPricing, setCalculatedPricing] = useState(null);
  
  // Multi-route selection state for intercity/international
  const [selectedCountryForIntercity, setSelectedCountryForIntercity] = useState('');
  const [intercitySearchTerm, setIntercitySearchTerm] = useState('');
  const [internationalSearchTerm, setInternationalSearchTerm] = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState([]); // Array of {from, to, price, estimatedTime, vehicleType}
  const [usePartnerPricing, setUsePartnerPricing] = useState(true); // Use partner's rate for auto-calculation
  const [routeValidations, setRouteValidations] = useState({}); // Store validation results per route
  
  // Filter and sort state
  const [showFilters, setShowFilters] = useState(false);
  const [routeFilters, setRouteFilters] = useState({
    minPrice: undefined,
    maxPrice: undefined,
    minDistance: undefined,
    maxDistance: undefined,
    maxHours: undefined,
    vehicleTypes: []
  });
  const [sortBy, setSortBy] = useState('price_asc');
  
  // Batch actions state
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchAction, setBatchAction] = useState({
    type: '', // 'price_adjust', 'vehicle_change', 'price_set'
    value: ''
  });
  
  // Smart suggestions state
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(false);

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
          deliveryType: (routeForm.serviceType || 'standard').toLowerCase().replace(' delivery', '').replace(' ', '_'),
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

  // Helper functions for multi-route selection
  const toggleRouteSelection = (route) => {
    const routeKey = `${route.from}-${route.to}`;
    const existingRoute = selectedRoutes.find(r => `${r.from}-${r.to}` === routeKey);
    
    if (existingRoute) {
      // Remove route
      setSelectedRoutes(selectedRoutes.filter(r => `${r.from}-${r.to}` !== routeKey));
    } else {
      // Determine initial price based on partner pricing preference
      let initialPrice = route.suggestedPrice;
      
      if (usePartnerPricing && profile?.pricing?.ratePerKm) {
        const partnerPricing = calculatePartnerPrice(
          route.distance,
          profile.pricing.ratePerKm,
          profile.pricing?.intracity?.minCharge || 2000,
          profile.pricing?.intercity?.maxCharge || 100000
        );
        initialPrice = partnerPricing.finalPrice;
      }
      
      // Add route with calculated or suggested price (can be edited)
      setSelectedRoutes([...selectedRoutes, {
        from: route.from,
        to: route.to,
        price: initialPrice,
        suggestedPrice: route.suggestedPrice,
        partnerPrice: initialPrice !== route.suggestedPrice ? initialPrice : null,
        estimatedTime: route.estimatedTime,
        vehicleType: route.vehicleTypes ? route.vehicleTypes[0] : 'Van',
        distance: route.distance || 0
      }]);
    }
  };
  
  const updateSelectedRoute = (routeKey, field, value) => {
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
        case 'price_adjust_percent':
          const adjustment = parseFloat(batchAction.value) || 0;
          const newPrice = route.price * (1 + adjustment / 100);
          return { ...route, price: Math.round(newPrice) };
        
        case 'price_adjust_amount':
          const amount = parseFloat(batchAction.value) || 0;
          return { ...route, price: Math.max(0, route.price + amount) };
        
        case 'price_set':
          return { ...route, price: parseFloat(batchAction.value) || route.price };
        
        case 'vehicle_change':
          return { ...route, vehicleType: batchAction.value };
        
        default:
          return route;
      }
    });
    
    setSelectedRoutes(updatedRoutes);
    setShowBatchActions(false);
    setBatchAction({ type: '', value: '' });
  };
  
  const selectAllVisibleRoutes = (routesList) => {
    const newSelections = routesList
      .filter(route => !isRouteSelected(route))
      .map(route => {
        let initialPrice = route.suggestedPrice;
        
        if (usePartnerPricing && profile?.pricing?.ratePerKm) {
          const partnerPricing = calculatePartnerPrice(
            route.distance,
            profile.pricing.ratePerKm,
            profile.pricing?.intracity?.minCharge || 2000,
            profile.pricing?.intercity?.maxCharge || 100000
          );
          initialPrice = partnerPricing.finalPrice;
        }
        
        return {
          from: route.from,
          to: route.to,
          price: initialPrice,
          suggestedPrice: route.suggestedPrice,
          partnerPrice: initialPrice !== route.suggestedPrice ? initialPrice : null,
          estimatedTime: route.estimatedTime,
          vehicleType: route.vehicleTypes ? route.vehicleTypes[0] : 'Van',
          distance: route.distance || 0
        };
      });
    
    setSelectedRoutes([...selectedRoutes, ...newSelections]);
  };
  
  const deselectAllRoutes = () => {
    setSelectedRoutes([]);
    setRouteValidations({});
  };
  
  // Save/Load draft functions
  const saveDraft = () => {
    const draft = {
      routeType: routeForm.routeType,
      selectedRoutes,
      selectedCountryForIntercity,
      currency: routeForm.currency,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(`logistics_route_draft_${profile?.id}`, JSON.stringify(draft));
    alert(`Draft saved! ${selectedRoutes.length} route(s) saved for later.`);
  };
  
  const loadDraft = () => {
    const draftJson = localStorage.getItem(`logistics_route_draft_${profile?.id}`);
    if (!draftJson) {
      alert('No saved draft found.');
      return;
    }
    
    try {
      const draft = JSON.parse(draftJson);
      const savedDate = new Date(draft.savedAt).toLocaleString();
      
      if (confirm(`Load draft from ${savedDate}?\n\n${draft.selectedRoutes.length} route(s) will be restored.`)) {
        setRouteForm(prev => ({ ...prev, routeType: draft.routeType, currency: draft.currency }));
        setSelectedRoutes(draft.selectedRoutes);
        setSelectedCountryForIntercity(draft.selectedCountryForIntercity || '');
        alert('Draft loaded successfully!');
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      alert('Error loading draft. The saved data may be corrupted.');
    }
  };
  
  const clearDraft = () => {
    if (confirm('Delete saved draft? This cannot be undone.')) {
      localStorage.removeItem(`logistics_route_draft_${profile?.id}`);
      alert('Draft deleted.');
    }
  };
  
  // Check if draft exists
  const hasDraft = () => {
    return !!localStorage.getItem(`logistics_route_draft_${profile?.id}`);
  };
  
  // Quick actions handler
  const handleQuickAction = (actionType, value) => {
    switch (actionType) {
      case 'template':
        const template = ROUTE_TEMPLATE_PRESETS[value];
        if (template) {
          const adjusted = selectedRoutes.map(route => ({
            ...route,
            price: Math.round(route.price * (1 + template.priceAdjustment / 100))
          }));
          setSelectedRoutes(adjusted);
        }
        break;
      
      case 'match_market':
        const matched = selectedRoutes.map(route => ({
          ...route,
          price: route.suggestedPrice
        }));
        setSelectedRoutes(matched);
        break;
      
      case 'round_prices':
        const rounded = selectedRoutes.map(route => ({
          ...route,
          price: Math.round(route.price / 1000) * 1000
        }));
        setSelectedRoutes(rounded);
        break;
      
      case 'export_csv':
        exportRoutesToCSV(selectedRoutes);
        break;
      
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
          alert('Please fill in country, state, city (or select "State as City"), price, and estimated time for intracity route.');
          setSubmittingRoute(false);
          return;
        }
        
        const routeData = {
          routeType: routeForm.routeType,
          country: routeForm.country,
          state: routeForm.state,
          city: routeForm.stateAsCity ? routeForm.state : routeForm.city,
          stateAsCity: routeForm.stateAsCity,
          from: '',
          to: '',
          distance: 0,
          price: parseFloat(routeForm.price) || 0,
          currency: routeForm.currency,
          estimatedTime: routeForm.estimatedTime.trim(),
          vehicleType: routeForm.vehicleType,
          serviceType: routeForm.serviceType,
          createdAt: new Date().toISOString(),
          status: 'active'
        };
        
        await firebaseService.logistics.addRoute(profile.id, routeData);
        alert('Intracity route added successfully!');
      } 
      // Handle intercity/international routes (multiple route submission)
      else if (routeForm.routeType === 'intercity' || routeForm.routeType === 'international') {
        if (selectedRoutes.length === 0) {
          alert(`Please select at least one ${routeForm.routeType} route to add.`);
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
          return firebaseService.logistics.addRoute(profile.id, routeData);
        });
        
        await Promise.all(addPromises);
        alert(`Successfully added ${selectedRoutes.length} ${routeForm.routeType} route(s)!`);
        setSelectedRoutes([]);
        setRouteValidations({}); // Clear validations
      }
      
      // Reset form
      setRouteForm({
        routeType: 'intracity',
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
      });
      setSelectedCountryForIntercity('');
      setIntercitySearchTerm('');
      setInternationalSearchTerm('');
      
      setShowAddRouteForm(false);
      
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
    if (!status) return 'bg-gray-100 text-gray-800';
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
                  {/* Route Type Selection */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Route Type</h3>
                    <div className="grid grid-cols-3 gap-4">
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

                  {/* Intercity Routes - Multiple Selection */}
                  {routeForm.routeType === 'intercity' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">🚛 Select Intercity Routes</h3>
                      
                      {/* Country Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Country</label>
                        <select
                          value={selectedCountryForIntercity}
                          onChange={(e) => {
                            setSelectedCountryForIntercity(e.target.value);
                            setIntercitySearchTerm('');
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">-- Select a country --</option>
                          {getCountriesWithIntercityRoutes().map(country => (
                            <option key={country} value={country}>{country}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Smart Recommendations Toggle */}
                      {profile?.serviceAreas && profile.serviceAreas.length > 0 && selectedCountryForIntercity && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showOnlyRecommended}
                              onChange={(e) => setShowOnlyRecommended(e.target.checked)}
                              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-green-900">
                                🎯 Show Only Routes in My Service Areas
                              </span>
                              <p className="text-xs text-green-700 mt-1">
                                {(() => {
                                  const baseRoutes = searchIntercityRoutes(selectedCountryForIntercity, intercitySearchTerm);
                                  const recommended = filterByServiceAreas(baseRoutes, profile.serviceAreas);
                                  return `${recommended.length} of ${baseRoutes.length} routes match your service areas`;
                                })()}
                              </p>
                            </div>
                          </label>
                        </div>
                      )}
                      
                      {/* Pricing Mode Toggle */}
                      {profile?.pricing?.ratePerKm && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={usePartnerPricing}
                              onChange={(e) => setUsePartnerPricing(e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-blue-900">
                                Use My Pricing (₦{profile.pricing.ratePerKm}/km)
                              </span>
                              <p className="text-xs text-blue-700 mt-1">
                                Auto-calculate prices based on your configured rate instead of market suggestions
                              </p>
                            </div>
                          </label>
                        </div>
                      )}
                      
                      {/* Search Box */}
                      {selectedCountryForIntercity && (
                        <div className="mb-4">
                          <input
                            type="text"
                            placeholder="Search routes by city name..."
                            value={intercitySearchTerm}
                            onChange={(e) => setIntercitySearchTerm(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                      )}
                      
                      {/* Filter & Sort Controls */}
                      {selectedCountryForIntercity && (
                        <div className="mb-4 flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                          >
                            🔍 Filters {Object.values(routeFilters).some(v => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)) && '●'}
                          </button>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            <option value="price_asc">💰 Price: Low to High</option>
                            <option value="price_desc">💰 Price: High to Low</option>
                            <option value="distance_asc">📏 Distance: Short to Long</option>
                            <option value="distance_desc">📏 Distance: Long to Short</option>
                            <option value="time_asc">⏱️ Time: Fastest First</option>
                            <option value="time_desc">⏱️ Time: Slowest First</option>
                            <option value="alphabetical">🔤 Alphabetical</option>
                          </select>
                          <div className="text-xs text-gray-600">
                            {(() => {
                              const baseRoutes = searchIntercityRoutes(selectedCountryForIntercity, intercitySearchTerm);
                              const filtered = filterRoutes(baseRoutes, routeFilters);
                              return `${filtered.length} of ${baseRoutes.length} routes`;
                            })()}
                          </div>
                        </div>
                      )}
                      
                      {/* Filter Panel */}
                      {showFilters && selectedCountryForIntercity && (
                        <div className="mb-4 p-4 bg-white border border-gray-300 rounded-lg space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Min Price (₦)</label>
                              <input
                                type="number"
                                value={routeFilters.minPrice || ''}
                                onChange={(e) => setRouteFilters({...routeFilters, minPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Max Price (₦)</label>
                              <input
                                type="number"
                                value={routeFilters.maxPrice || ''}
                                onChange={(e) => setRouteFilters({...routeFilters, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="100000"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Max Distance (km)</label>
                              <input
                                type="number"
                                value={routeFilters.maxDistance || ''}
                                onChange={(e) => setRouteFilters({...routeFilters, maxDistance: e.target.value ? parseFloat(e.target.value) : undefined})}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="1000"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Max Time (hours)</label>
                              <input
                                type="number"
                                value={routeFilters.maxHours || ''}
                                onChange={(e) => setRouteFilters({...routeFilters, maxHours: e.target.value ? parseFloat(e.target.value) : undefined})}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="24"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRouteFilters({minPrice: undefined, maxPrice: undefined, minDistance: undefined, maxDistance: undefined, maxHours: undefined, vehicleTypes: []})}
                              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Clear Filters
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Popular Routes List */}
                      {selectedCountryForIntercity && (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {(() => {
                            let routesToDisplay = searchIntercityRoutes(selectedCountryForIntercity, intercitySearchTerm);
                            if (showOnlyRecommended && profile?.serviceAreas) {
                              routesToDisplay = filterByServiceAreas(routesToDisplay, profile.serviceAreas);
                            }
                            const filteredRoutes = filterRoutes(routesToDisplay, routeFilters);
                            const sortedRoutes = sortRoutes(filteredRoutes, sortBy);
                            // Aggressive safety check: ensure we have an array before mapping
                            if (!Array.isArray(sortedRoutes)) {
                              console.error('sortedRoutes is not an array:', sortedRoutes);
                              return <div className="text-red-600 p-3">Error loading routes. Please refresh the page.</div>;
                            }
                            return sortedRoutes.map((route, idx) => {
                            const isSelected = isRouteSelected(route);
                            const routeKey = `${route.from}-${route.to}`;
                            const selectedRoute = selectedRoutes.find(r => `${r.from}-${r.to}` === routeKey);
                            
                            // Calculate partner pricing for comparison
                            let partnerPrice = null;
                            let priceComparison = null;
                            if (profile?.pricing?.ratePerKm) {
                              const pricing = calculatePartnerPrice(
                                route.distance,
                                profile.pricing.ratePerKm,
                                profile.pricing?.intracity?.minCharge || 2000,
                                profile.pricing?.intercity?.maxCharge || 100000
                              );
                              partnerPrice = pricing.finalPrice;
                              priceComparison = comparePrices(partnerPrice, route.suggestedPrice);
                            }
                            
                            return (
                              <div key={idx} className={`border rounded-lg p-3 ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-white'}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-3 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleRouteSelection(route)}
                                      className="mt-1 w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{route.from} → {route.to}</div>
                                      <div className="text-sm text-gray-600">
                                        Distance: ~{route.distance}km | Est. Time: {route.estimatedTime}
                                      </div>
                                      
                                      {/* Price comparison when not selected */}
                                      {!isSelected && partnerPrice && usePartnerPricing && (
                                        <div className="mt-2 text-xs">
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-600">Your rate:</span>
                                            <span className={`font-semibold ${priceComparison.isLower ? 'text-emerald-600' : priceComparison.isHigher ? 'text-orange-600' : 'text-blue-600'}`}>
                                              ₦{partnerPrice.toLocaleString()}
                                            </span>
                                            <span className={`text-xs ${priceComparison.isLower ? 'text-emerald-600' : priceComparison.isHigher ? 'text-orange-600' : 'text-gray-500'}`}>
                                              ({priceComparison.percentageDiff > 0 ? '+' : ''}{priceComparison.percentageDiff}%)
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {isSelected && selectedRoute && (
                                        <div className="mt-3 space-y-3">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Price (₦)</label>
                                              <input
                                                type="number"
                                                value={selectedRoute.price}
                                                onChange={(e) => updateSelectedRoute(routeKey, 'price', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                                min="0"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Type</label>
                                              <select
                                                value={selectedRoute.vehicleType}
                                                onChange={(e) => updateSelectedRoute(routeKey, 'vehicleType', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                              >
                                                <option>Van</option>
                                                <option>Truck</option>
                                                <option>Motorcycle</option>
                                                <option>Car</option>
                                              </select>
                                            </div>
                                          </div>
                                          
                                          {/* Show validation warnings */}
                                          {routeValidations[routeKey] && routeValidations[routeKey].warnings.length > 0 && (
                                            <div className="space-y-1">
                                              {routeValidations[routeKey].warnings.filter(w => w.severity === 'error').map((warning, idx) => (
                                                <div key={idx} className="text-xs bg-red-50 border border-red-200 text-red-800 p-2 rounded flex items-start gap-2">
                                                  <span className="text-red-600 flex-shrink-0">⚠️</span>
                                                  <div>
                                                    <div className="font-medium">{warning.message}</div>
                                                    {warning.recommendation && (
                                                      <div className="text-red-700 mt-1">{warning.recommendation}</div>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                              {routeValidations[routeKey].warnings.filter(w => w.severity === 'warning').map((warning, idx) => (
                                                <div key={idx} className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded flex items-start gap-2">
                                                  <span className="text-yellow-600 flex-shrink-0">💡</span>
                                                  <div>
                                                    <div className="font-medium">{warning.message}</div>
                                                    {warning.recommendation && (
                                                      <div className="text-yellow-700 mt-1">{warning.recommendation}</div>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {/* Show comparison in selected route */}
                                          {selectedRoute.suggestedPrice !== selectedRoute.price && !routeValidations[routeKey]?.warnings.some(w => w.type.includes('pricing')) && (
                                            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                                              Market suggestion: ₦{selectedRoute.suggestedPrice.toLocaleString()}
                                              {(() => {
                                                const comp = comparePrices(selectedRoute.price, selectedRoute.suggestedPrice);
                                                return (
                                                  <span className={`ml-2 ${comp.isLower ? 'text-emerald-600' : comp.isHigher ? 'text-orange-600' : 'text-gray-600'}`}>
                                                    ({comp.percentageDiff > 0 ? '+' : ''}{comp.percentageDiff}%)
                                                  </span>
                                                );
                                              })()}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {!isSelected && (
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-emerald-600">
                                        ₦{route.suggestedPrice.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-500">Market</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })();
                          })()}
                        </div>
                      )}
                      
                      {/* Bulk Selection Actions */}
                      {selectedCountryForIntercity && (
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              const visibleRoutes = sortRoutes(filterRoutes(searchIntercityRoutes(selectedCountryForIntercity, intercitySearchTerm), routeFilters), sortBy);
                              selectAllVisibleRoutes(visibleRoutes);
                            }}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                          >
                            ✓ Select All Visible
                          </button>
                          {selectedRoutes.length > 0 && (
                            <button
                              onClick={deselectAllRoutes}
                              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                            >
                              ✗ Deselect All
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Selected Routes Summary & Batch Actions */}
                      {selectedRoutes.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <div className="font-medium text-emerald-900">
                              ✓ {selectedRoutes.length} route(s) selected
                            </div>
                            <div className="text-sm text-emerald-700">
                              Total estimated value: ₦{selectedRoutes.reduce((sum, r) => sum + parseFloat(r.price || 0), 0).toLocaleString()}
                            </div>
                          </div>
                          
                          {/* Batch Actions Toolbar */}
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
                      )}
                    </div>
                  )}
                  
                  {/* International Routes - Multiple Selection */}
                  {routeForm.routeType === 'international' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">✈️ Select International Routes</h3>
                      
                      {/* Pricing Mode Toggle */}
                      {profile?.pricing?.ratePerKm && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={usePartnerPricing}
                              onChange={(e) => setUsePartnerPricing(e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-blue-900">
                                Use My Pricing (₦{profile.pricing.ratePerKm}/km)
                              </span>
                              <p className="text-xs text-blue-700 mt-1">
                                Auto-calculate prices based on your configured rate instead of market suggestions
                              </p>
                            </div>
                          </label>
                        </div>
                      )}
                      
                      {/* Search Box */}
                      <div className="mb-4">
                        <input
                          type="text"
                          placeholder="Search routes by country or city name..."
                          value={internationalSearchTerm}
                          onChange={(e) => setInternationalSearchTerm(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      
                      {/* Filter & Sort Controls */}
                      <div className="mb-4 flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                          🔍 Filters {Object.values(routeFilters).some(v => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)) && '●'}
                        </button>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <option value="price_asc">💰 Price: Low to High</option>
                          <option value="price_desc">💰 Price: High to Low</option>
                          <option value="distance_asc">📏 Distance: Short to Long</option>
                          <option value="distance_desc">📏 Distance: Long to Short</option>
                          <option value="time_asc">⏱️ Time: Fastest First</option>
                          <option value="time_desc">⏱️ Time: Slowest First</option>
                          <option value="alphabetical">🔤 Alphabetical</option>
                        </select>
                        <div className="text-xs text-gray-600">
                          {(() => {
                            const baseRoutes = searchInternationalRoutes(internationalSearchTerm);
                            const filtered = filterRoutes(baseRoutes, routeFilters);
                            return `${filtered.length} of ${baseRoutes.length} routes`;
                          })()}
                        </div>
                      </div>
                      
                      {/* Filter Panel - Same as intercity */}
                      {showFilters && (
                        <div className="mb-4 p-4 bg-white border border-gray-300 rounded-lg space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Min Price (₦)</label>
                              <input
                                type="number"
                                value={routeFilters.minPrice || ''}
                                onChange={(e) => setRouteFilters({...routeFilters, minPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Max Price (₦)</label>
                              <input
                                type="number"
                                value={routeFilters.maxPrice || ''}
                                onChange={(e) => setRouteFilters({...routeFilters, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="1000000"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Max Distance (km)</label>
                              <input
                                type="number"
                                value={routeFilters.maxDistance || ''}
                                onChange={(e) => setRouteFilters({...routeFilters, maxDistance: e.target.value ? parseFloat(e.target.value) : undefined})}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="10000"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Max Time (days)</label>
                              <input
                                type="number"
                                value={routeFilters.maxHours ? routeFilters.maxHours / 24 : ''}
                                onChange={(e) => setRouteFilters({...routeFilters, maxHours: e.target.value ? parseFloat(e.target.value) * 24 : undefined})}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="14"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRouteFilters({minPrice: undefined, maxPrice: undefined, minDistance: undefined, maxDistance: undefined, maxHours: undefined, vehicleTypes: []})}
                              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Clear Filters
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Popular Routes List */}
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {(() => {
                          const searchResults = searchInternationalRoutes(internationalSearchTerm);
                          const filteredRoutes = filterRoutes(searchResults, routeFilters);
                          const sortedRoutes = sortRoutes(filteredRoutes, sortBy);
                          // Aggressive safety check: ensure we have an array before mapping
                          if (!Array.isArray(sortedRoutes)) {
                            console.error('International sortedRoutes is not an array:', sortedRoutes);
                            return <div className="text-red-600 p-3">Error loading routes. Please refresh the page.</div>;
                          }
                          return sortedRoutes.map((route, idx) => {
                          const isSelected = isRouteSelected(route);
                          const routeKey = `${route.from}-${route.to}`;
                          const selectedRoute = selectedRoutes.find(r => `${r.from}-${r.to}` === routeKey);
                          
                          // Calculate partner pricing for comparison
                          let partnerPrice = null;
                          let priceComparison = null;
                          if (profile?.pricing?.ratePerKm) {
                            const pricing = calculatePartnerPrice(
                              route.distance,
                              profile.pricing.ratePerKm,
                              profile.pricing?.intracity?.minCharge || 2000,
                              200000 // Higher max for international
                            );
                            partnerPrice = pricing.finalPrice;
                            priceComparison = comparePrices(partnerPrice, route.suggestedPrice);
                          }
                          
                          return (
                            <div key={idx} className={`border rounded-lg p-3 ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-white'}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleRouteSelection(route)}
                                    className="mt-1 w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{route.from} → {route.to}</div>
                                    <div className="text-sm text-gray-600">
                                      Distance: ~{route.distance}km | Est. Time: {route.estimatedTime}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Available: {route.vehicleTypes?.join(', ') || 'Van, Truck'}
                                    </div>
                                    
                                    {/* Price comparison when not selected */}
                                    {!isSelected && partnerPrice && usePartnerPricing && (
                                      <div className="mt-2 text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-600">Your rate:</span>
                                          <span className={`font-semibold ${priceComparison.isLower ? 'text-emerald-600' : priceComparison.isHigher ? 'text-orange-600' : 'text-blue-600'}`}>
                                            ₦{partnerPrice.toLocaleString()}
                                          </span>
                                          <span className={`text-xs ${priceComparison.isLower ? 'text-emerald-600' : priceComparison.isHigher ? 'text-orange-600' : 'text-gray-500'}`}>
                                            ({priceComparison.percentageDiff > 0 ? '+' : ''}{priceComparison.percentageDiff}%)
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {isSelected && selectedRoute && (
                                      <div className="mt-3 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Price (₦)</label>
                                            <input
                                              type="number"
                                              value={selectedRoute.price}
                                              onChange={(e) => updateSelectedRoute(routeKey, 'price', e.target.value)}
                                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                              min="0"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Type</label>
                                            <select
                                              value={selectedRoute.vehicleType}
                                              onChange={(e) => updateSelectedRoute(routeKey, 'vehicleType', e.target.value)}
                                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                            >
                                              {route.vehicleTypes?.map(vt => (
                                                <option key={vt} value={vt}>{vt}</option>
                                              )) || (
                                                <>
                                                  <option>Van</option>
                                                  <option>Truck</option>
                                                  <option>Flight</option>
                                                </>
                                              )}
                                            </select>
                                          </div>
                                        </div>
                                        
                                        {/* Show validation warnings */}
                                        {routeValidations[routeKey] && routeValidations[routeKey].warnings.length > 0 && (
                                          <div className="space-y-1">
                                            {routeValidations[routeKey].warnings.filter(w => w.severity === 'error').map((warning, idx) => (
                                              <div key={idx} className="text-xs bg-red-50 border border-red-200 text-red-800 p-2 rounded flex items-start gap-2">
                                                <span className="text-red-600 flex-shrink-0">⚠️</span>
                                                <div>
                                                  <div className="font-medium">{warning.message}</div>
                                                  {warning.recommendation && (
                                                    <div className="text-red-700 mt-1">{warning.recommendation}</div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                            {routeValidations[routeKey].warnings.filter(w => w.severity === 'warning').map((warning, idx) => (
                                              <div key={idx} className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded flex items-start gap-2">
                                                <span className="text-yellow-600 flex-shrink-0">💡</span>
                                                <div>
                                                  <div className="font-medium">{warning.message}</div>
                                                  {warning.recommendation && (
                                                    <div className="text-yellow-700 mt-1">{warning.recommendation}</div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {/* Show comparison in selected route */}
                                        {selectedRoute.suggestedPrice !== selectedRoute.price && !routeValidations[routeKey]?.warnings.some(w => w.type.includes('pricing')) && (
                                          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                                            Market suggestion: ₦{selectedRoute.suggestedPrice.toLocaleString()}
                                            {(() => {
                                              const comp = comparePrices(selectedRoute.price, selectedRoute.suggestedPrice);
                                              return (
                                                <span className={`ml-2 ${comp.isLower ? 'text-emerald-600' : comp.isHigher ? 'text-orange-600' : 'text-gray-600'}`}>
                                                  ({comp.percentageDiff > 0 ? '+' : ''}{comp.percentageDiff}%)
                                                </span>
                                              );
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {!isSelected && (
                                  <div className="text-right">
                                    <div className="text-sm font-semibold text-emerald-600">
                                      ₦{route.suggestedPrice.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-500">Market</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                        })()}
                      </div>
                      
                      {/* Bulk Selection Actions */}
                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            const searchResults = searchInternationalRoutes(internationalSearchTerm);
                            const filteredRoutes = filterRoutes(searchResults, routeFilters);
                            const visibleRoutes = sortRoutes(filteredRoutes, sortBy);
                            selectAllVisibleRoutes(visibleRoutes);
                          }}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          ✓ Select All Visible
                        </button>
                        {selectedRoutes.length > 0 && (
                          <button
                            onClick={deselectAllRoutes}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                          >
                            ✗ Deselect All
                          </button>
                        )}
                      </div>
                      
                      {/* Selected Routes Summary & Batch Actions */}
                      {selectedRoutes.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <div className="font-medium text-emerald-900">
                              ✓ {selectedRoutes.length} route(s) selected
                            </div>
                            <div className="text-sm text-emerald-700">
                              Total estimated value: ₦{selectedRoutes.reduce((sum, r) => sum + parseFloat(r.price || 0), 0).toLocaleString()}
                            </div>
                          </div>
                          
                          {/* Batch Actions Toolbar */}
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
                                      <option>Flight</option>
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
                      )}
                    </div>
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
                                    await firebaseService.logistics.addRoute(profile.id, duplicatedRoute);
                                    await loadRoutes(profile?.id);
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
                                  ratePerKm: route.ratePerKm || DEFAULT_PLATFORM_PRICING.ratePerKm
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
              firebaseService.logistics.addRoute(profile.id, route)
            );
            
            await Promise.all(importPromises);
            await loadRoutes(profile?.id);
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

    </div>
  );
};

export default Logistics;
