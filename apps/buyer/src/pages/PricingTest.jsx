import { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { pricingService } from '../services/pricingService';

const PricingTest = () => {
  const { cartItems, getPricingBreakdown } = useCart();
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState('pickup');
  const [selectedLogistics, setSelectedLogistics] = useState(null);
  const [availableLogistics, setAvailableLogistics] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const calculatePricing = async () => {
      if (cartItems.length === 0) {
        setPricingBreakdown(null);
        return;
      }

      try {
        setLoading(true);
        const breakdown = await getPricingBreakdown(deliveryOption, selectedLogistics);
        setPricingBreakdown(breakdown);
      } catch (error) {
        console.error('Error calculating pricing:', error);
      } finally {
        setLoading(false);
      }
    };

    calculatePricing();
  }, [cartItems, deliveryOption, selectedLogistics, getPricingBreakdown]);

  useEffect(() => {
    const fetchLogistics = async () => {
      try {
        const companies = await pricingService.getLogisticsCompaniesWithRatings();
        setAvailableLogistics(companies);
      } catch (error) {
        console.error('Error fetching logistics companies:', error);
      }
    };

    fetchLogistics();
  }, []);

  const addTestProducts = () => {
    const testProducts = [
      { id: '1', name: 'Test Product 1', price: 1000, quantity: 2 },
      { id: '2', name: 'Test Product 2', price: 2500, quantity: 1 },
      { id: '3', name: 'Test Product 3', price: 500, quantity: 3 }
    ];
    
    // This would need to be implemented in CartContext
    console.log('Test products:', testProducts);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Pricing System Test</h2>
          <p className="text-gray-600 mt-1">Test VAT, service fee, and logistics fee calculations</p>
        </div>

        <div className="p-6">
          {/* Current Cart Items */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Cart Items</h3>
            {cartItems.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-600">No items in cart</p>
                <button
                  onClick={addTestProducts}
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Add Test Products
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{item.name}</span>
                    <span>₦{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Options */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Options</h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="delivery"
                  value="pickup"
                  checked={deliveryOption === 'pickup'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="mr-2"
                />
                <span className="text-gray-700">Pickup (Free)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="delivery"
                  value="delivery"
                  checked={deliveryOption === 'delivery'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="mr-2"
                />
                <span className="text-gray-700">Delivery</span>
              </label>
            </div>

            {/* Logistics Selection */}
            {deliveryOption === 'delivery' && (
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-800 mb-2">Select Logistics Partner</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableLogistics.map((company) => (
                    <label key={company.id} className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="logistics"
                        value={company.id}
                        checked={selectedLogistics?.id === company.id}
                        onChange={() => setSelectedLogistics(company)}
                        className="mr-2"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{company.name}</span>
                          <span className="text-sm text-gray-600">
                            {company.rating ? `⭐ ${company.rating}` : 'No rating'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Cost: {pricingService.formatCurrency(company.cost || 0)}</span>
                          <span>Est: {company.estimatedTime || 'N/A'}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Breakdown</h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Calculating...</p>
              </div>
            ) : pricingBreakdown ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  {Object.entries(pricingBreakdown.breakdown).map(([key, item]) => {
                    if (!item) return null;
                    
                    return (
                      <div key={key} className="flex justify-between items-center p-3 bg-white rounded border">
                        <div>
                          <span className="font-medium text-gray-900">{item.label}</span>
                          {item.description && (
                            <p className="text-xs text-gray-500">{item.description}</p>
                          )}
                          {item.rate && (
                            <p className="text-xs text-gray-500">({item.rate}%)</p>
                          )}
                        </div>
                        <span className={`font-semibold ${key === 'total' ? 'text-lg text-blue-600' : ''}`}>
                          {pricingService.formatCurrency(item.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-600">Add items to cart to see pricing breakdown</p>
              </div>
            )}
          </div>

          {/* Raw Data */}
          {pricingBreakdown && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Raw Pricing Data</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto">
                <pre className="text-sm">
                  {JSON.stringify(pricingBreakdown, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Test Actions */}
          <div className="flex space-x-4">
            <button
              onClick={() => setDeliveryOption('pickup')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Reset to Pickup
            </button>
            <button
              onClick={() => {
                setDeliveryOption('delivery');
                setSelectedLogistics(availableLogistics[0] || null);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Set to Delivery
            </button>
            <button
              onClick={() => window.location.href = '/admin/pricing'}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Admin Pricing Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingTest;
