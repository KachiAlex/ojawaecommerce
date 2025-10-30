import React, { useState } from 'react';
import LogisticsPricingCalculator from '../components/LogisticsPricingCalculator';

const LogisticsPricingDemo = () => {
  const [selectedCalculation, setSelectedCalculation] = useState(null);

  const handlePriceCalculated = (calculation) => {
    console.log('💰 Price calculated:', calculation);
    setSelectedCalculation(calculation);
  };

  const handlePartnerSelected = (partner) => {
    console.log('🚚 Partner selected:', partner);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Logistics Pricing Calculator
          </h1>
          <p className="text-gray-600">
            Test the new logistics pricing system with dynamic calculations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calculator */}
          <div>
            <LogisticsPricingCalculator
              onPriceCalculated={handlePriceCalculated}
              onPartnerSelected={handlePartnerSelected}
              initialPickup="Ikeja, Lagos"
              initialDropoff="Yaba, Lagos"
              initialWeight={2}
            />
          </div>

          {/* Results Display */}
          <div>
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Calculation Results
              </h3>
              
              {selectedCalculation ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-emerald-900">Total Delivery Fee</h4>
                        <p className="text-2xl font-bold text-emerald-600">
                          ₦{selectedCalculation.deliveryFee.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-emerald-700">ETA: {selectedCalculation.eta}</p>
                        <p className="text-sm text-emerald-700">
                          Distance: {selectedCalculation.distance}km
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Fee Breakdown</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Base Fare:</span>
                        <span>₦{selectedCalculation.breakdown.baseFare}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Distance Fee:</span>
                        <span>₦{selectedCalculation.breakdown.distanceFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weight Fee:</span>
                        <span>₦{selectedCalculation.breakdown.weightFee}</span>
                      </div>
                      {selectedCalculation.breakdown.deliveryTypeMultiplier > 1 && (
                        <div className="flex justify-between">
                          <span>Express Multiplier:</span>
                          <span>{selectedCalculation.breakdown.deliveryTypeMultiplier}x</span>
                        </div>
                      )}
                      {selectedCalculation.breakdown.timeMultiplier > 1 && (
                        <div className="flex justify-between">
                          <span>Time Multiplier:</span>
                          <span>{selectedCalculation.breakdown.timeMultiplier}x</span>
                        </div>
                      )}
                      {selectedCalculation.breakdown.zoneMultiplier > 1 && (
                        <div className="flex justify-between">
                          <span>Zone Multiplier:</span>
                          <span>{selectedCalculation.breakdown.zoneMultiplier}x</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Logistics Partner</h5>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-800">
                          {selectedCalculation.partner.name}
                        </p>
                        <p className="text-sm text-blue-600">
                          Rating: {selectedCalculation.partner.rating}/5
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    <p>Zone: {selectedCalculation.zone}</p>
                    <p>
                      Calculated at: {new Date(selectedCalculation.calculatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-4">🚚</div>
                  <p>Select delivery options to see pricing</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Showcase */}
        <div className="mt-12 bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            New Logistics Pricing Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h4 className="font-medium text-gray-900">Dynamic Pricing</h4>
              <p className="text-sm text-gray-600">
                Real-time calculations based on distance, weight, time, and zone
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🚚</div>
              <h4 className="font-medium text-gray-900">Partner Integration</h4>
              <p className="text-sm text-gray-600">
                Automatic partner selection with ratings and availability
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <h4 className="font-medium text-gray-900">Analytics</h4>
              <p className="text-sm text-gray-600">
                Track all calculations for insights and optimization
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">⚙️</div>
              <h4 className="font-medium text-gray-900">Admin Controls</h4>
              <p className="text-sm text-gray-600">
                Configurable pricing parameters and multipliers
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🌍</div>
              <h4 className="font-medium text-gray-900">Zone-based</h4>
              <p className="text-sm text-gray-600">
                Different rates for intracity and intercity deliveries
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🕒</div>
              <h4 className="font-medium text-gray-900">Time-based</h4>
              <p className="text-sm text-gray-600">
                Pricing adjustments based on time of day and demand
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticsPricingDemo;
