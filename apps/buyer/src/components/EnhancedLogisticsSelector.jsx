import React, { useState, useEffect } from 'react';
import { logisticsService } from '../services/firebaseService';
import GoogleMapsLocationPicker from './GoogleMapsLocationPicker';
import RouteVisualization from './RouteVisualization';
import { LoadingSpinner } from './LoadingStates';

const EnhancedLogisticsSelector = ({ 
  onLogisticsSelect, 
  deliveryData = {},
  showRouteVisualization = true 
}) => {
  const [pickupLocation, setPickupLocation] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [logisticsPartners, setLogisticsPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routeAnalysis, setRouteAnalysis] = useState(null);

  // Load logistics partners when locations are available
  useEffect(() => {
    const loadLogisticsPartners = async () => {
      if (!pickupLocation || !deliveryLocation) {
        setLogisticsPartners([]);
        setRouteAnalysis(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const partners = await logisticsService.getEnhancedLogisticsPartners(
          pickupLocation,
          deliveryLocation,
          {
            weight: deliveryData.weight || 1,
            deliveryType: deliveryData.deliveryType || 'standard',
            isFragile: deliveryData.isFragile || false,
            requiresSignature: deliveryData.requiresSignature || false,
            itemValue: deliveryData.itemValue || 0
          }
        );

        setLogisticsPartners(partners);
        
        // Get route analysis from first partner (they all have the same route)
        if (partners.length > 0 && partners[0].pricing?.routeAnalysis) {
          setRouteAnalysis(partners[0].pricing.routeAnalysis);
        }

      } catch (error) {
        console.error('Error loading logistics partners:', error);
        setError('Failed to load logistics options');
        setLogisticsPartners([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLogisticsPartners();
  }, [pickupLocation, deliveryLocation, deliveryData]);

  // Handle logistics partner selection
  const handlePartnerSelect = (partner) => {
    setSelectedPartner(partner);
    if (onLogisticsSelect) {
      onLogisticsSelect({
        partner,
        pickupLocation,
        deliveryLocation,
        routeAnalysis
      });
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'NGN') => {
    const symbol = currency === 'NGN' ? '₦' : '$';
    return `${symbol}${amount.toLocaleString()}`;
  };

  // Get delivery type display
  const getDeliveryTypeDisplay = (deliveryType) => {
    const types = {
      'same_day': 'Same Day',
      'express': 'Express',
      'standard': 'Standard',
      'economy': 'Economy',
      'overnight': 'Overnight'
    };
    return types[deliveryType] || deliveryType;
  };

  return (
    <div className="space-y-6">
      {/* Location Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GoogleMapsLocationPicker
          label="Pickup Location"
          placeholder="Enter vendor pickup address..."
          onLocationSelect={(location) => setPickupLocation(location.address)}
          required
        />
        
        <GoogleMapsLocationPicker
          label="Delivery Location"
          placeholder="Enter buyer delivery address..."
          onLocationSelect={(location) => setDeliveryLocation(location.address)}
          required
        />
      </div>

      {/* Route Visualization */}
      {showRouteVisualization && pickupLocation && deliveryLocation && (
        <RouteVisualization
          pickupLocation={pickupLocation}
          deliveryLocation={deliveryLocation}
          routeAnalysis={routeAnalysis}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
          <span className="ml-2 text-gray-600">Finding logistics partners...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-500 mr-2">⚠️</div>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Logistics Partners */}
      {logisticsPartners.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Available Logistics Partners ({logisticsPartners.length})
          </h3>
          
          <div className="grid gap-4">
            {logisticsPartners.map((partner) => (
              <div
                key={partner.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPartner?.id === partner.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handlePartnerSelect(partner)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{partner.name}</h4>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-sm text-gray-600">{partner.rating}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Distance:</span>
                        <span className="ml-1 font-medium">{partner.distance}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Delivery Time:</span>
                        <span className="ml-1 font-medium">{partner.estimatedDelivery}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Route Type:</span>
                        <span className="ml-1 font-medium capitalize">{partner.routeType}</span>
                      </div>
                    </div>

                    {/* Specialties */}
                    {partner.specialties && partner.specialties.length > 0 && (
                      <div className="mt-2">
                        <span className="text-gray-500 text-sm">Specialties:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {partner.specialties.map((specialty, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {specialty.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    {partner.pricing?.error ? (
                      <div className="text-red-500 text-sm">
                        Pricing Unavailable
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(partner.pricing?.cost || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getDeliveryTypeDisplay(deliveryData.deliveryType || 'standard')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing Breakdown */}
                {partner.pricing?.breakdown && !partner.pricing?.error && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Base Cost:</span>
                        <span>{formatCurrency(partner.pricing.breakdown.baseCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weight Multiplier:</span>
                        <span>{partner.pricing.breakdown.weightMultiplier}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Special Charges:</span>
                        <span>{formatCurrency(partner.pricing.breakdown.specialCharges)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Partners Available */}
      {!isLoading && !error && logisticsPartners.length === 0 && pickupLocation && deliveryLocation && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">🚚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Logistics Partners Available</h3>
          <p className="text-gray-600">
            We couldn't find any logistics partners for this route. Please try different locations.
          </p>
        </div>
      )}

      {/* Instructions */}
      {!pickupLocation || !deliveryLocation ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Locations</h3>
          <p className="text-gray-600">
            Enter both pickup and delivery locations to see available logistics partners and pricing.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default EnhancedLogisticsSelector;
