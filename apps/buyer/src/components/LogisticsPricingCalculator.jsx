import React, { useState, useEffect } from 'react';
import logisticsPricingService from '../services/logisticsPricingService';

const LogisticsPricingCalculator = ({ 
  onPriceCalculated, 
  onPartnerSelected,
  initialPickup = '',
  initialDropoff = '',
  initialWeight = 1,
  showPartnerSelection = true 
}) => {
  const [formData, setFormData] = useState({
    pickup: initialPickup,
    dropoff: initialDropoff,
    weight: initialWeight,
    type: 'standard'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);

  // Calculate delivery fee when form data changes
  useEffect(() => {
    if (formData.pickup && formData.dropoff) {
      calculateDeliveryFee();
    }
  }, [formData.pickup, formData.dropoff, formData.weight, formData.type]);

  const calculateDeliveryFee = async () => {
    try {
      setLoading(true);
      setError('');
      
      const calculation = await logisticsPricingService.calculateDeliveryFee({
        pickup: formData.pickup,
        dropoff: formData.dropoff,
        weight: formData.weight,
        type: formData.type,
        partner: selectedPartner?.id,
        timestamp: new Date()
      });

      if (calculation.success) {
        setResult(calculation);
        onPriceCalculated?.(calculation);
      } else {
        setError(calculation.error || 'Failed to calculate delivery fee');
        if (calculation.code === 'NO_LOGISTICS_PARTNER') {
          // Keep result null and surface actionable prompt in UI
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePartnerSelect = (partner) => {
    setSelectedPartner(partner);
    onPartnerSelected?.(partner);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Delivery Fee Calculator
      </h3>

      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Location
            </label>
            <input
              type="text"
              value={formData.pickup}
              onChange={(e) => handleInputChange('pickup', e.target.value)}
              placeholder="e.g., Ikeja, Lagos"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dropoff Location
            </label>
            <input
              type="text"
              value={formData.dropoff}
              onChange={(e) => handleInputChange('dropoff', e.target.value)}
              placeholder="e.g., Yaba, Lagos"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Package Weight (kg)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={formData.weight}
              onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="standard">Standard (2-3 days)</option>
              <option value="express">Express (Same day)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
          <span className="ml-2 text-sm text-gray-600">Calculating...</span>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="mt-6 space-y-4">
          {/* Main Result */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-emerald-900">Delivery Fee</h4>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(result.deliveryFee)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-emerald-700">ETA: {result.eta}</p>
                <p className="text-sm text-emerald-700">Distance: {result.distance}km</p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-3">Fee Breakdown</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Base Fare:</span>
                <span>{formatCurrency(result.breakdown.baseFare)}</span>
              </div>
              <div className="flex justify-between">
                <span>Distance Fee ({result.distance}km):</span>
                <span>{formatCurrency(result.breakdown.distanceFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Weight Fee ({formData.weight}kg):</span>
                <span>{formatCurrency(result.breakdown.weightFee)}</span>
              </div>
              {result.breakdown.deliveryTypeMultiplier > 1 && (
                <div className="flex justify-between">
                  <span>Express Multiplier:</span>
                  <span>{result.breakdown.deliveryTypeMultiplier}x</span>
                </div>
              )}
              {result.breakdown.timeMultiplier > 1 && (
                <div className="flex justify-between">
                  <span>Time Multiplier:</span>
                  <span>{result.breakdown.timeMultiplier}x</span>
                </div>
              )}
              {result.breakdown.zoneMultiplier > 1 && (
                <div className="flex justify-between">
                  <span>Zone Multiplier:</span>
                  <span>{result.breakdown.zoneMultiplier}x</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total:</span>
                <span>{formatCurrency(result.deliveryFee)}</span>
              </div>
            </div>
          </div>

          {/* Partner Information */}
          {result.partner && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2">Logistics Partner</h5>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-800">{result.partner.name}</p>
                  <p className="text-sm text-blue-600">Rating: {result.partner.rating}/5</p>
                </div>
                {showPartnerSelection && (
                  <button
                    onClick={() => handlePartnerSelect(result.partner)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Select Partner
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Zone Information */}
          <div className="text-xs text-gray-500">
            <p>Zone: {result.zone}</p>
            <p>Calculated at: {new Date(result.calculatedAt).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsPricingCalculator;
