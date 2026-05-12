import { useState, useEffect } from 'react';
import { pricingService, PRICING_CONFIG } from '../services/pricingService';

const PricingAdminPanel = () => {
  const [pricingConfig, setPricingConfig] = useState({
    serviceFeeRate: PRICING_CONFIG.DEFAULT_SERVICE_FEE_RATE,
    vatRate: PRICING_CONFIG.VAT_RATE,
    minServiceFee: PRICING_CONFIG.MIN_SERVICE_FEE,
    maxServiceFee: PRICING_CONFIG.MAX_SERVICE_FEE
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [logisticsCompanies, setLogisticsCompanies] = useState([]);

  useEffect(() => {
    loadPricingConfig();
    loadLogisticsCompanies();
  }, []);

  const loadPricingConfig = async () => {
    try {
      setLoading(true);
      const config = await pricingService.getPricingConfiguration();
      setPricingConfig(config);
    } catch (error) {
      console.error('Error loading pricing config:', error);
      setMessage('Error loading pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadLogisticsCompanies = async () => {
    try {
      const companies = await pricingService.getLogisticsCompaniesWithRatings();
      setLogisticsCompanies(companies);
    } catch (error) {
      console.error('Error loading logistics companies:', error);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setMessage('');
      
      // Validate inputs
      if (pricingConfig.serviceFeeRate < 0 || pricingConfig.serviceFeeRate > 1) {
        setMessage('Service fee rate must be between 0% and 100%');
        return;
      }
      
      if (pricingConfig.minServiceFee < 0 || pricingConfig.maxServiceFee < 0) {
        setMessage('Minimum and maximum service fees must be positive');
        return;
      }
      
      if (pricingConfig.minServiceFee > pricingConfig.maxServiceFee) {
        setMessage('Minimum service fee cannot be greater than maximum service fee');
        return;
      }

      await pricingService.updatePricingConfiguration(pricingConfig);
      setMessage('Pricing configuration updated successfully!');
    } catch (error) {
      console.error('Error saving pricing config:', error);
      setMessage('Error saving pricing configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPricingConfig(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const updateLogisticsRating = async (companyId) => {
    try {
      setLoading(true);
      await pricingService.updateLogisticsRating(companyId);
      await loadLogisticsCompanies(); // Refresh the list
      setMessage(`Rating updated for logistics company`);
    } catch (error) {
      console.error('Error updating logistics rating:', error);
      setMessage('Error updating logistics rating');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Pricing Configuration</h2>
          <p className="text-gray-600 mt-1">Manage platform fees and logistics ratings</p>
        </div>

        <div className="p-6">
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('Error') 
                ? 'bg-red-50 border border-red-200 text-red-800' 
                : 'bg-green-50 border border-green-200 text-green-800'
            }`}>
              {message}
            </div>
          )}

          {/* Pricing Configuration Form */}
          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* VAT Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VAT Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={pricingConfig.vatRate * 100}
                    onChange={(e) => handleInputChange('vatRate', e.target.value / 100)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  VAT is fixed at 7.5% as per government regulations
                </p>
              </div>

              {/* Service Fee Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Fee Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={pricingConfig.serviceFeeRate * 100}
                    onChange={(e) => handleInputChange('serviceFeeRate', e.target.value / 100)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Platform service fee percentage
                </p>
              </div>

              {/* Minimum Service Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Service Fee (₦)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={pricingConfig.minServiceFee}
                  onChange={(e) => handleInputChange('minServiceFee', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum service fee regardless of percentage
                </p>
              </div>

              {/* Maximum Service Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Service Fee (₦)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={pricingConfig.maxServiceFee}
                  onChange={(e) => handleInputChange('maxServiceFee', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum service fee cap
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </button>
            </div>
          </form>

          {/* Logistics Companies Rating Management */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Logistics Companies Rating</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-4">
                Logistics ratings are automatically calculated based on delivery performance. 
                Click "Update Rating" to recalculate ratings for each company.
              </p>
              
              <div className="space-y-3">
                {logisticsCompanies.map((company) => (
                  <div key={company.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{company.name}</h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600">
                            Rating: {company.rating ? `⭐ ${company.rating}` : 'No rating'}
                          </span>
                          <span className="text-sm text-gray-600">
                            Deliveries: {company.totalDeliveries || 0}
                          </span>
                          <span className="text-sm text-gray-600">
                            Success Rate: {company.successRate || 0}%
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => updateLogisticsRating(company.id)}
                        disabled={loading}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Update Rating
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Preview */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Pricing Preview</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-gray-900 mb-2">Sample Order (₦1,000)</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₦1,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (7.5%):</span>
                      <span>₦75.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Fee ({(pricingConfig.serviceFeeRate * 100).toFixed(1)}%):</span>
                      <span>₦{Math.max(pricingConfig.minServiceFee, Math.min(pricingConfig.maxServiceFee, 1000 * pricingConfig.serviceFeeRate)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total:</span>
                      <span>₦{(1000 + 75 + Math.max(pricingConfig.minServiceFee, Math.min(pricingConfig.maxServiceFee, 1000 * pricingConfig.serviceFeeRate))).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-gray-900 mb-2">Sample Order (₦10,000)</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₦10,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (7.5%):</span>
                      <span>₦750.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Fee ({(pricingConfig.serviceFeeRate * 100).toFixed(1)}%):</span>
                      <span>₦{Math.max(pricingConfig.minServiceFee, Math.min(pricingConfig.maxServiceFee, 10000 * pricingConfig.serviceFeeRate)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total:</span>
                      <span>₦{(10000 + 750 + Math.max(pricingConfig.minServiceFee, Math.min(pricingConfig.maxServiceFee, 10000 * pricingConfig.serviceFeeRate))).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-gray-900 mb-2">Sample Order (₦100,000)</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₦100,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (7.5%):</span>
                      <span>₦7,500.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Fee ({(pricingConfig.serviceFeeRate * 100).toFixed(1)}%):</span>
                      <span>₦{Math.max(pricingConfig.minServiceFee, Math.min(pricingConfig.maxServiceFee, 100000 * pricingConfig.serviceFeeRate)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total:</span>
                      <span>₦{(100000 + 7500 + Math.max(pricingConfig.minServiceFee, Math.min(pricingConfig.maxServiceFee, 100000 * pricingConfig.serviceFeeRate))).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingAdminPanel;
