import React, { useState, useEffect } from 'react';
import logisticsPricingService from '../services/logisticsPricingService';

const CheckoutLogisticsSelector = ({ 
  cartItems, 
  buyerAddress,
  vendorAddress,
  onLogisticsSelected,
  onPriceCalculated 
}) => {
  const [availablePartners, setAvailablePartners] = useState([]);
  const [fetchingPartners, setFetchingPartners] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [priceCalculation, setPriceCalculation] = useState(null);
  const [priceError, setPriceError] = useState(null);

  const isAddressValid = (addr) => {
    if (!addr) return false;
    const text = String(addr).trim();
    // Require at least 2 comma-separated components (e.g., street, city/state)
    const parts = text.split(',').map(p => p.trim()).filter(Boolean);
    return parts.length >= 2 && /[a-z]/i.test(parts[0]);
  };

  // Reset selected partner and price calculation when addresses change
  useEffect(() => {
    setSelectedPartner(null);
    setPriceCalculation(null);
    setPriceError(null);
  }, [buyerAddress, vendorAddress]);

  // Fetch available partners list (without prices) when addresses are valid
  useEffect(() => {
    const fetchPartners = async () => {
      if (!isAddressValid(buyerAddress) || !isAddressValid(vendorAddress) || cartItems.length === 0) {
        setAvailablePartners([]);
        // Also clear selected partner when addresses become invalid
        setSelectedPartner(null);
        setPriceCalculation(null);
        setPriceError(null);
        return;
      }

      try {
        setFetchingPartners(true);
        const partners = await logisticsPricingService.getAvailablePartners(vendorAddress, buyerAddress);
        setAvailablePartners(partners || []);
      } catch (err) {
        console.error('Error fetching partners:', err);
        setAvailablePartners([]);
      } finally {
        setFetchingPartners(false);
      }
    };

    fetchPartners();
  }, [buyerAddress, vendorAddress, cartItems]);

  const calculateTotalWeight = (items) => {
    return items.reduce((total, item) => {
      return total + (item.weight || 1) * (item.quantity || 1);
    }, 0);
  };

  // Calculate price only when a partner is selected
  const handlePartnerSelect = async (partner) => {
    if (!isAddressValid(buyerAddress) || !isAddressValid(vendorAddress)) {
      return;
    }

    try {
      setCalculatingPrice(true);
      setPriceError(null);
      setSelectedPartner(partner);

      const calculation = await logisticsPricingService.calculateDeliveryFee({
        pickup: vendorAddress,
        dropoff: buyerAddress,
        weight: calculateTotalWeight(cartItems),
        partner: partner.id,
        type: 'standard',
        timestamp: new Date()
      });

      if (calculation && calculation.success) {
        const option = {
          partner: {
            id: partner.id,
            name: partner.name,
            rating: partner.rating || 0
          },
          deliveryFee: calculation.deliveryFee,
          eta: calculation.eta,
          estimatedDays: calculation.eta?.match(/\d+/)?.[0] || '',
          distance: calculation.distance,
          distanceText: calculation.distanceText || `${calculation.distance} km`,
          breakdown: calculation.breakdown || {},
          type: 'standard'
        };

        setPriceCalculation(option);
        onLogisticsSelected?.(option);
        onPriceCalculated?.(option);
      } else {
        setPriceError(calculation?.error || 'Failed to calculate delivery price');
      }
    } catch (err) {
      console.error('Error calculating price:', err);
      setPriceError(err.message || 'Failed to calculate delivery price');
    } finally {
      setCalculatingPrice(false);
    }
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

  if (fetchingPartners) {
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

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Select Delivery Partner</h3>
        <p className="text-sm text-gray-600 mt-1">Choose a logistics partner to see delivery pricing</p>
        <div className="mt-2 text-xs text-gray-600">
          <div><span className="font-medium text-gray-800">Vendor:</span> {vendorAddress}</div>
          <div><span className="font-medium text-gray-800">Buyer:</span> {buyerAddress}</div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {availablePartners.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            <p>No logistics partners available for this route yet. Try another address or pickup.</p>
          </div>
        )}

        {availablePartners.map((partner) => (
          <div
            key={partner.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedPartner?.id === partner.id
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handlePartnerSelect(partner)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 border-2 rounded-full flex items-center justify-center">
                  {selectedPartner?.id === partner.id && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{partner.name}</h4>
                  <p className="text-xs text-gray-500">
                    Rating: {partner.rating?.toFixed ? partner.rating.toFixed(1) : partner.rating || 'N/A'}
                    {calculatingPrice && selectedPartner?.id === partner.id && (
                      <span className="ml-2 text-blue-600">Calculating price...</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {calculatingPrice && selectedPartner?.id === partner.id ? (
                  <div className="animate-pulse text-gray-400">...</div>
                ) : priceCalculation && selectedPartner?.id === partner.id ? (
                  <div>
                    <p className="font-semibold text-gray-900">{formatCurrency(priceCalculation.deliveryFee)}</p>
                    <p className="text-xs text-gray-500">{priceCalculation.eta}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-gray-400">Click to calculate</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {priceError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Price Calculation Error</h3>
            <p className="text-red-600 text-sm mt-1">{priceError}</p>
          </div>
        )}

        {priceCalculation && selectedPartner && (
          <>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-3">Delivery Details</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>From:</span><span>{vendorAddress}</span></div>
                <div className="flex justify-between"><span>To:</span><span>{buyerAddress}</span></div>
                <div className="flex justify-between"><span>Weight:</span><span>{calculateTotalWeight(cartItems)}kg</span></div>
                <div className="flex justify-between"><span>Distance:</span><span>{priceCalculation.distanceText || `${priceCalculation.distance}km`}</span></div>
                <div className="flex justify-between"><span>Partner:</span><span>{priceCalculation.partner.name}</span></div>
                <div className="flex justify-between font-medium"><span>Total Delivery Fee:</span><span>{formatCurrency(priceCalculation.deliveryFee)}</span></div>
              </div>
            </div>

            {priceCalculation.breakdown && Object.keys(priceCalculation.breakdown).length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-3">Fee Breakdown</h5>
                <div className="space-y-1 text-sm">
                  {priceCalculation.breakdown.baseFare !== undefined && (
                    <div className="flex justify-between"><span>Base Fare:</span><span>{formatCurrency(priceCalculation.breakdown.baseFare)}</span></div>
                  )}
                  {priceCalculation.breakdown.distanceFee !== undefined && (
                    <div className="flex justify-between"><span>Distance Fee:</span><span>{formatCurrency(priceCalculation.breakdown.distanceFee)}</span></div>
                  )}
                  {priceCalculation.breakdown.weightFee !== undefined && (
                    <div className="flex justify-between"><span>Weight Fee:</span><span>{formatCurrency(priceCalculation.breakdown.weightFee)}</span></div>
                  )}
                  {priceCalculation.breakdown.deliveryTypeMultiplier > 1 && (
                    <div className="flex justify-between"><span>Express Multiplier:</span><span>{priceCalculation.breakdown.deliveryTypeMultiplier}x</span></div>
                  )}
                  {priceCalculation.breakdown.timeMultiplier > 1 && (
                    <div className="flex justify-between"><span>Time Multiplier:</span><span>{priceCalculation.breakdown.timeMultiplier}x</span></div>
                  )}
                  {priceCalculation.breakdown.zoneMultiplier > 1 && (
                    <div className="flex justify-between"><span>Zone Multiplier:</span><span>{priceCalculation.breakdown.zoneMultiplier}x</span></div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutLogisticsSelector;