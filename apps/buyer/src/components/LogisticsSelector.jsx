import { useState, useEffect } from 'react';
import firebaseService from '../services/firebaseService';
import { getRouteComplexity, getTimeBasedPricing } from '../utils/distanceCalculator';

const LogisticsSelector = ({ vendorLocation, buyerLocation, onSelect, cartItems = [] }) => {
  const [selectedLogistics, setSelectedLogistics] = useState(null);
  const [availableLogistics, setAvailableLogistics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pricingOptions, setPricingOptions] = useState({});
  const [selectedPricing, setSelectedPricing] = useState('standard');

  useEffect(() => {
    if (buyerLocation && vendorLocation) {
      fetchAvailableLogistics();
    }
  }, [buyerLocation, vendorLocation]);

  const fetchAvailableLogistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate estimated weight and distance
      const estimatedWeight = cartItems.reduce((total, item) => total + (item.weight || 1), 0);
      const estimatedDistance = 50; // Default 50km - in real app, calculate from addresses
      
      const deliveryData = {
        pickupLocation: vendorLocation,
        deliveryLocation: buyerLocation,
        weight: estimatedWeight,
        distance: estimatedDistance
      };
      
      const partners = await firebaseService.logistics.getAvailablePartners(deliveryData);
      setAvailableLogistics(partners);
    } catch (error) {
      console.error('Error fetching logistics partners:', error);
      setError('Failed to load logistics options');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (logistics) => {
    setSelectedLogistics(logistics);
    if (onSelect) {
      onSelect(logistics);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Delivery Option</h3>
        <div className="text-sm text-gray-600">
          <p>From: <span className="font-medium">{vendorLocation}</span></p>
          <p>To: <span className="font-medium">{buyerLocation}</span></p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Finding available logistics partners...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchAvailableLogistics}
            className="mt-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      ) : availableLogistics.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No logistics partners available for this route</p>
          <p className="text-sm text-gray-500 mt-1">Try a different address or select pickup</p>
        </div>
      ) : (
        <div className="space-y-4">
          {availableLogistics.map((logistics) => {
            // Calculate route complexity and distance
            const routeComplexity = getRouteComplexity(vendorLocation, buyerLocation);
            const timePricing = getTimeBasedPricing();
            
            const deliveryData = {
              distance: routeComplexity.distance,
              weight: cartItems.reduce((total, item) => total + (item.weight || 1), 0),
              deliveryType: 'standard',
              pickupLocation: vendorLocation,
              deliveryLocation: buyerLocation,
              urgency: 'normal',
              itemValue: cartItems.reduce((total, item) => total + (item.price || 0), 0),
              isFragile: cartItems.some(item => item.fragile),
              requiresSignature: cartItems.some(item => item.requiresSignature),
              timeOfDay: timePricing.timeCategory
            };
            
            const deliveryCost = firebaseService.logistics.calculateCost(logistics, deliveryData);
            
            return (
              <div
                key={logistics.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedLogistics?.id === logistics.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🚚</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{logistics.companyName}</h4>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400">⭐</span>
                          <span className="text-sm font-medium">4.5</span>
                          <span className="text-sm text-gray-500">(50+)</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{logistics.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        {logistics.features?.tracking && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            📍 Real-time tracking
                          </span>
                        )}
                        {logistics.features?.insurance && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            🛡️ Insured
                          </span>
                        )}
                        {logistics.features?.signatureRequired && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            ✍️ Signature required
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>📅 {logistics.estimatedDeliveryDays} days</span>
                        <span>📍 {routeComplexity.routeType.replace('_', ' ')}</span>
                        <span>📏 {routeComplexity.distance.toFixed(1)}km</span>
                        <span>⚖️ Max {logistics.maxWeight}kg</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">From ₦{deliveryCost.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">Multiple options available</div>
                  </div>
                </div>

                {/* Pricing Options */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div 
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedLogistics?.id === logistics.id && selectedPricing === 'economy'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSelect({
                      ...logistics,
                      price: `₦${Math.round(deliveryCost * 0.8).toFixed(2)}`,
                      estimatedDays: 3,
                      deliveryType: 'economy'
                    })}
                  >
                    <div className="text-sm font-medium text-gray-900">Economy</div>
                    <div className="text-lg font-bold text-gray-900">₦{Math.round(deliveryCost * 0.8).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">3 days</div>
                  </div>
                  
                  <div 
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedLogistics?.id === logistics.id && selectedPricing === 'standard'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSelect({
                      ...logistics,
                      price: `₦${deliveryCost.toFixed(2)}`,
                      estimatedDays: 2,
                      deliveryType: 'standard'
                    })}
                  >
                    <div className="text-sm font-medium text-gray-900">Standard</div>
                    <div className="text-lg font-bold text-gray-900">₦{deliveryCost.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">2 days</div>
                  </div>
                  
                  <div 
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedLogistics?.id === logistics.id && selectedPricing === 'express'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSelect({
                      ...logistics,
                      price: `₦${Math.round(deliveryCost * 1.8).toFixed(2)}`,
                      estimatedDays: 1,
                      deliveryType: 'express'
                    })}
                  >
                    <div className="text-sm font-medium text-gray-900">Express</div>
                    <div className="text-lg font-bold text-gray-900">₦{Math.round(deliveryCost * 1.8).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">1 day</div>
                  </div>
                  
                  <div 
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedLogistics?.id === logistics.id && selectedPricing === 'same_day'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSelect({
                      ...logistics,
                      price: `₦${Math.round(deliveryCost * 2.5).toFixed(2)}`,
                      estimatedDays: 0.5,
                      deliveryType: 'same_day'
                    })}
                  >
                    <div className="text-sm font-medium text-gray-900">Same Day</div>
                    <div className="text-lg font-bold text-gray-900">₦{Math.round(deliveryCost * 2.5).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Same day</div>
                  </div>
                </div>
                
                {selectedLogistics?.id === logistics.id && (
                  <div className="mt-4 pt-4 border-t border-emerald-200">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <span>✓</span>
                      <span className="text-sm font-medium">Selected for delivery</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-blue-600 text-xl">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Delivery Protection</p>
            <p>All deliveries are protected by Ojawa's wallet system. Your payment is held securely until you confirm delivery.</p>
          </div>
        </div>
      </div>

      {selectedLogistics && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Selected: {selectedLogistics.company}</p>
              <p className="text-sm text-gray-600">Estimated delivery: {selectedLogistics.estimatedDays} days</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">{selectedLogistics.price}</p>
              <p className="text-sm text-gray-500">+ Product cost</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsSelector;
