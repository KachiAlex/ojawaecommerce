import React, { useState, useEffect } from 'react';
import { useLogisticsPricing } from '../hooks/useLogisticsPricing';

const CheckoutLogisticsSelector = ({ 
  cartItems, 
  buyerAddress,
  vendorAddress,
  onLogisticsSelected,
  onPriceCalculated 
}) => {
  const { 
    calculateDeliveryOptions, 
    loading, 
    error, 
    result 
  } = useLogisticsPricing();

  const [selectedOption, setSelectedOption] = useState(null);

  const isAddressValid = (addr) => {
    if (!addr) return false;
    const text = String(addr).trim();
    // Require at least 2 comma-separated components (e.g., street, city/state)
    const parts = text.split(',').map(p => p.trim()).filter(Boolean);
    return parts.length >= 2 && /[a-z]/i.test(parts[0]);
  };

  // Calculate partner options when data changes
  useEffect(() => {
    if (isAddressValid(buyerAddress) && isAddressValid(vendorAddress) && cartItems.length > 0) {
      calculateDeliveryOptions({
        pickup: vendorAddress,
        dropoff: buyerAddress,
        weight: calculateTotalWeight(cartItems),
        timestamp: new Date(),
        type: 'standard'
      });
    }
  }, [buyerAddress, vendorAddress, cartItems, calculateDeliveryOptions]);

  const calculateTotalWeight = (items) => {
    return items.reduce((total, item) => {
      return total + (item.weight || 1) * (item.quantity || 1);
    }, 0);
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    onLogisticsSelected?.(option);
    onPriceCalculated?.(option);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  if (!isAddressValid(vendorAddress)) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <p className="text-sm text-gray-600">Vendor address is missing. Please contact the vendor or use pickup.</p>
      </div>
    );
  }

  if (!isAddressValid(buyerAddress)) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="mb-3">
          <p className="text-sm text-gray-600">Vendor: <span className="font-medium text-gray-900">{vendorAddress}</span></p>
        </div>
        <p className="text-sm text-gray-600">Enter your delivery address above to see available logistics partners and pricing.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Delivery Calculation Error</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const partnerOptions = result?.partners || [];

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Delivery Partners</h3>
        <p className="text-sm text-gray-600 mt-1">Select a partner to use for delivery</p>
        <div className="mt-2 text-xs text-gray-600">
          <div><span className="font-medium text-gray-800">Vendor:</span> {vendorAddress}</div>
          <div><span className="font-medium text-gray-800">Buyer:</span> {buyerAddress}</div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {partnerOptions.length === 0 && (
          <div className="text-center text-gray-500">
            <p>No logistics partners available for this route yet. Try another address or pickup.</p>
          </div>
        )}

        {partnerOptions.map((opt) => (
          <div
            key={opt.partner.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedOption?.partner?.id === opt.partner.id
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleOptionSelect(opt)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 border-2 rounded-full flex items-center justify-center">
                  {selectedOption?.partner?.id === opt.partner.id && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{opt.partner.name}</h4>
                  <p className="text-xs text-gray-500">{opt.distance} km • ETA {opt.eta}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(opt.deliveryFee)}</p>
                <p className="text-xs text-gray-500">Rating: {opt.partner.rating?.toFixed ? opt.partner.rating.toFixed(1) : opt.partner.rating}</p>
              </div>
            </div>
          </div>
        ))}

        {selectedOption && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-3">Delivery Details</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>From:</span><span>{vendorAddress}</span></div>
              <div className="flex justify-between"><span>To:</span><span>{buyerAddress}</span></div>
              <div className="flex justify-between"><span>Weight:</span><span>{calculateTotalWeight(cartItems)}kg</span></div>
              <div className="flex justify-between"><span>Distance:</span><span>{selectedOption.distance}km</span></div>
              <div className="flex justify-between"><span>Partner:</span><span>{selectedOption.partner.name}</span></div>
              <div className="flex justify-between font-medium"><span>Total Delivery Fee:</span><span>{formatCurrency(selectedOption.deliveryFee)}</span></div>
            </div>
          </div>
        )}

        {selectedOption && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-3">Fee Breakdown</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Base Fare:</span><span>{formatCurrency(selectedOption.breakdown.baseFare)}</span></div>
              <div className="flex justify-between"><span>Distance Fee:</span><span>{formatCurrency(selectedOption.breakdown.distanceFee)}</span></div>
              <div className="flex justify-between"><span>Weight Fee:</span><span>{formatCurrency(selectedOption.breakdown.weightFee)}</span></div>
              {selectedOption.breakdown.deliveryTypeMultiplier > 1 && (
                <div className="flex justify-between"><span>Express Multiplier:</span><span>{selectedOption.breakdown.deliveryTypeMultiplier}x</span></div>
              )}
              {selectedOption.breakdown.timeMultiplier > 1 && (
                <div className="flex justify-between"><span>Time Multiplier:</span><span>{selectedOption.breakdown.timeMultiplier}x</span></div>
              )}
              {selectedOption.breakdown.zoneMultiplier > 1 && (
                <div className="flex justify-between"><span>Zone Multiplier:</span><span>{selectedOption.breakdown.zoneMultiplier}x</span></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutLogisticsSelector;
