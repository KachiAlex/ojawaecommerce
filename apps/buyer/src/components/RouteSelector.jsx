import { useState, useMemo } from 'react';

/**
 * Clean, from-scratch route selector component
 * Handles intercity and international route selection with proper data normalization
 */
const RouteSelector = ({ 
  routeType, 
  onRoutesSelected, 
  profile,
  calculatePartnerPrice 
}) => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState([]);

  // Default vehicle types for all routes
  const DEFAULT_VEHICLES = ['Van', 'Truck', 'Motorcycle', 'Car'];

  // Intercity routes data
  const INTERCITY_ROUTES = {
    Nigeria: [
      { from: 'Lagos', to: 'Abuja', distance: 750, price: 45000, time: '8-12 hours' },
      { from: 'Lagos', to: 'Port Harcourt', distance: 630, price: 38000, time: '8-10 hours' },
      { from: 'Lagos', to: 'Ibadan', distance: 130, price: 12000, time: '2-3 hours' },
      { from: 'Lagos', to: 'Benin City', distance: 320, price: 22000, time: '4-6 hours' },
      { from: 'Lagos', to: 'Kano', distance: 1000, price: 60000, time: '12-16 hours' },
      { from: 'Abuja', to: 'Lagos', distance: 750, price: 45000, time: '8-12 hours' },
      { from: 'Abuja', to: 'Kano', distance: 350, price: 25000, time: '5-7 hours' },
      { from: 'Port Harcourt', to: 'Lagos', distance: 630, price: 38000, time: '8-10 hours' },
    ],
    Ghana: [
      { from: 'Accra', to: 'Kumasi', distance: 250, price: 15000, time: '3-4 hours' },
      { from: 'Accra', to: 'Tamale', distance: 400, price: 25000, time: '6-8 hours' },
      { from: 'Kumasi', to: 'Accra', distance: 250, price: 15000, time: '3-4 hours' },
    ],
    Kenya: [
      { from: 'Nairobi', to: 'Mombasa', distance: 480, price: 28000, time: '6-8 hours' },
      { from: 'Nairobi', to: 'Kisumu', distance: 350, price: 22000, time: '5-7 hours' },
      { from: 'Mombasa', to: 'Nairobi', distance: 480, price: 28000, time: '6-8 hours' },
    ]
  };

  // International routes data
  const INTERNATIONAL_ROUTES = [
    { from: 'Lagos, Nigeria', to: 'Accra, Ghana', distance: 400, price: 120000, time: '5-7 days', vehicles: ['Truck', 'Van', 'Flight'] },
    { from: 'Lagos, Nigeria', to: 'Cotonou, Benin', distance: 120, price: 45000, time: '2-3 days', vehicles: ['Truck', 'Van'] },
    { from: 'Accra, Ghana', to: 'Lagos, Nigeria', distance: 400, price: 120000, time: '5-7 days', vehicles: ['Truck', 'Van', 'Flight'] },
    { from: 'Nairobi, Kenya', to: 'Kampala, Uganda', distance: 650, price: 180000, time: '7-10 days', vehicles: ['Truck', 'Van', 'Flight'] },
    { from: 'Lagos, Nigeria', to: 'London, UK', distance: 5100, price: 850000, time: '7-10 days', vehicles: ['Flight'] },
  ];

  // Get available routes based on type
  const availableRoutes = useMemo(() => {
    if (routeType === 'international') {
      return INTERNATIONAL_ROUTES;
    }
    
    if (routeType === 'intercity' && selectedCountry) {
      return INTERCITY_ROUTES[selectedCountry] || [];
    }
    
    return [];
  }, [routeType, selectedCountry]);

  // Filter routes by search term
  const filteredRoutes = useMemo(() => {
    if (!searchTerm) return availableRoutes;
    
    const term = searchTerm.toLowerCase();
    return availableRoutes.filter(route => 
      route.from.toLowerCase().includes(term) || 
      route.to.toLowerCase().includes(term)
    );
  }, [availableRoutes, searchTerm]);

  // Normalize route data - ensure all routes have same structure
  const normalizeRoute = (route) => {
    // Get vehicles array - use from route or defaults
    const vehicles = Array.isArray(route.vehicles) && route.vehicles.length > 0 
      ? route.vehicles 
      : DEFAULT_VEHICLES;

    // Calculate partner price if available
    let finalPrice = route.price;
    if (profile?.pricing?.ratePerKm && calculatePartnerPrice) {
      const partnerPricing = calculatePartnerPrice(
        route.distance,
        profile.pricing.ratePerKm,
        2000,
        100000
      );
      finalPrice = partnerPricing.finalPrice;
    }

    return {
      from: route.from,
      to: route.to,
      distance: route.distance,
      price: finalPrice,
      suggestedPrice: route.price,
      estimatedTime: route.time,
      vehicleType: vehicles[0],
      vehicleTypes: vehicles, // Always an array
      routeKey: `${route.from}-${route.to}`
    };
  };

  // Check if route is selected
  const isSelected = (route) => {
    return selectedRoutes.some(r => r.routeKey === `${route.from}-${route.to}`);
  };

  // Toggle route selection
  const toggleRoute = (route) => {
    const routeKey = `${route.from}-${route.to}`;
    
    if (isSelected(route)) {
      // Remove
      setSelectedRoutes(selectedRoutes.filter(r => r.routeKey !== routeKey));
    } else {
      // Add with normalization
      const normalized = normalizeRoute(route);
      setSelectedRoutes([...selectedRoutes, normalized]);
    }
  };

  // Update a selected route field
  const updateRoute = (routeKey, field, value) => {
    setSelectedRoutes(selectedRoutes.map(route => 
      route.routeKey === routeKey 
        ? { ...route, [field]: value }
        : route
    ));
  };

  // Remove a selected route
  const removeRoute = (routeKey) => {
    setSelectedRoutes(selectedRoutes.filter(r => r.routeKey !== routeKey));
  };

  // Save all selected routes
  const handleSave = () => {
    if (selectedRoutes.length === 0) {
      alert('Please select at least one route');
      return;
    }
    onRoutesSelected(selectedRoutes);
  };

  return (
    <div className="space-y-6">
      {/* Country Selector for Intercity */}
      {routeType === 'intercity' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Country</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">-- Select a country --</option>
            {Object.keys(INTERCITY_ROUTES).map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
      )}

      {/* Search Box */}
      {((routeType === 'intercity' && selectedCountry) || routeType === 'international') && (
        <div>
          <input
            type="text"
            placeholder="Search routes by city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
      )}

      {/* Available Routes */}
      {filteredRoutes.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700">Available Routes ({filteredRoutes.length})</h3>
          {filteredRoutes.map((route, idx) => {
            const selected = isSelected(route);
            return (
              <div
                key={idx}
                onClick={() => toggleRoute(route)}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  selected 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-300 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      readOnly
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {route.from} → {route.to}
                      </div>
                      <div className="text-sm text-gray-600">
                        {route.distance}km • {route.time}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-emerald-600">
                      ₦{route.price.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Routes */}
      {selectedRoutes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Selected Routes ({selectedRoutes.length})
          </h3>
          {selectedRoutes.map((route) => (
            <div key={route.routeKey} className="border border-emerald-500 rounded-lg p-4 bg-emerald-50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium text-gray-900">{route.from} → {route.to}</div>
                  <div className="text-sm text-gray-600">{route.distance}km • {route.estimatedTime}</div>
                </div>
                <button
                  onClick={() => removeRoute(route.routeKey)}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price (₦)</label>
                  <input
                    type="number"
                    value={route.price}
                    onChange={(e) => updateRoute(route.routeKey, 'price', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    value={route.vehicleType}
                    onChange={(e) => updateRoute(route.routeKey, 'vehicleType', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {route.vehicleTypes.map((vt, idx) => (
                      <option key={idx} value={vt}>{vt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleSave}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium"
          >
            Add {selectedRoutes.length} Route{selectedRoutes.length > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
};

export default RouteSelector;

