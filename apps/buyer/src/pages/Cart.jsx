import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { pricingService } from '../services/pricingService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import enhancedLogisticsService from '../services/enhancedLogisticsService';
import { formatLocation } from '../utils/addressUtils';
import AddressInput from '../components/AddressInput';
import { formatCurrency as formatCurrencyUtil } from '../utils/currencyUtils';

// Helper function to format currency with amount
const formatCurrency = (amount, currencyString) => {
  if (!currencyString) return `₦${amount.toFixed(2)}`;
  
  // Extract currency symbol and code from string like "₦ NGN"
  const parts = currencyString.trim().split(/\s+/);
  const symbol = parts[0] || '₦';
  const code = parts[1] || 'NGN';
  
  return `${symbol}${amount.toFixed(2)}`;
};

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, getPricingBreakdown, clearCart, validateCartItems, hasOutOfStockItems } = useCart();
  const { currentUser } = useAuth();
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState('pickup');
  const [selectedLogistics, setSelectedLogistics] = useState(null);
  const [availableLogistics, setAvailableLogistics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [itemVendors, setItemVendors] = useState({});
  const [buyerAddress, setBuyerAddress] = useState({ street: '', city: '', state: '', country: 'Nigeria' });
  const [vendorAddress, setVendorAddress] = useState({ street: '', city: '', state: '', country: 'Nigeria' });
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [showRouteDetails, setShowRouteDetails] = useState(false);

  // Calculate pricing breakdown whenever cart items or delivery options change
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

  // Fetch buyer address and calculate smart pricing
  useEffect(() => {
    const fetchBuyerAddress = async () => {
      if (!currentUser) return;
      
      try {
        const buyerDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (buyerDoc.exists()) {
          const data = buyerDoc.data();
          if (data.structuredAddress) {
            // Use structured address if available
            setBuyerAddress(data.structuredAddress);
          } else if (data.address) {
            // Parse old string address format
            setBuyerAddress({ street: data.address, city: '', state: '', country: 'Nigeria' });
          }
        }
      } catch (error) {
        console.error('Failed to fetch buyer address:', error);
      }
    };

    fetchBuyerAddress();
  }, [currentUser]);

  // Calculate smart logistics pricing when addresses are available
  useEffect(() => {
    const calculateSmartPricing = async () => {
      // Only calculate if delivery is selected and addresses are complete
      if (deliveryOption !== 'delivery' || 
          !buyerAddress.city || !buyerAddress.state || 
          !vendorAddress.city || !vendorAddress.state) {
        setRouteInfo(null);
        setLoadingRoute(false);
        return;
      }

      try {
        setLoadingRoute(true);
        const pricing = await enhancedLogisticsService.calculateCompleteDelivery(
          vendorAddress,
          buyerAddress
        );
        
        if (pricing.success) {
          setRouteInfo(pricing);
          // Auto-select cheapest partner if available
          if (pricing.selectedPartner) {
            setSelectedLogistics({
              id: pricing.selectedPartner.id,
              name: pricing.selectedPartner.companyName || 'Logistics Partner',
              cost: pricing.price,
              rating: pricing.selectedPartner.rating || 0,
              estimatedTime: pricing.duration || '2-3 days'
            });
          }
        }
      } catch (error) {
        console.error('Error calculating smart pricing:', error);
      } finally {
        setLoadingRoute(false);
      }
    };

    calculateSmartPricing();
  }, [buyerAddress, vendorAddress, deliveryOption]);

  // Fetch vendor info for all cart items
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        if (!cartItems.length) {
          setVendorInfo(null);
          setItemVendors({});
          return;
        }
        
        const vendorMap = {};
        const itemToVendorMap = {};
        
        // Fetch vendor info for each unique vendor
        for (const item of cartItems) {
          let vendorId = item.vendorId;
          
          // If no vendorId in cart item, fetch from product document
          if (!vendorId && item.id) {
            try {
              const prodSnap = await getDoc(doc(db, 'products', item.id));
              if (prodSnap.exists()) {
                vendorId = prodSnap.data().vendorId;
              }
            } catch (err) {
              console.error(`Error fetching product ${item.id}:`, err);
            }
          }
          
          // Store the mapping from item ID to vendor ID
          if (vendorId) {
            itemToVendorMap[item.id] = vendorId;
            
            // Fetch vendor details if not already fetched
            if (!vendorMap[vendorId]) {
              try {
                const userSnap = await getDoc(doc(db, 'users', vendorId));
                if (userSnap.exists()) {
                  const u = userSnap.data();
                  const vendorAddr = u.vendorProfile?.structuredAddress || u.structuredAddress;
                  const addrString = u.vendorProfile?.businessAddress || u.address || 'Not specified';
                  
                  vendorMap[vendorId] = {
                    id: vendorId,
                    name: u.vendorProfile?.storeName || u.displayName || u.name || 'Vendor',
                    address: addrString,
                    structuredAddress: vendorAddr || { street: addrString, city: '', state: '', country: 'Nigeria' }
                  };
                }
              } catch (err) {
                console.error(`Error fetching vendor ${vendorId}:`, err);
              }
            }
          }
        }
        
        // Merge both maps
        const finalVendorMap = { ...vendorMap, ...itemToVendorMap };
        setItemVendors(finalVendorMap);
        
        console.log('Vendor map:', finalVendorMap); // Debug log
        
        // Set primary vendor info (first vendor)
        const firstVendorId = cartItems[0].vendorId || itemToVendorMap[cartItems[0].id];
        if (firstVendorId && vendorMap[firstVendorId]) {
          const vendor = vendorMap[firstVendorId];
          setVendorInfo(vendor);
          // Set structured vendor address
          if (vendor.structuredAddress) {
            setVendorAddress(vendor.structuredAddress);
          }
        } else {
          setVendorInfo(null);
        }
      } catch (e) {
        console.error('Failed to fetch vendor info', e);
        setVendorInfo(null);
        setItemVendors({});
      }
    };
    fetchVendors();
  }, [cartItems]);

  // Fetch available logistics companies
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

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Your cart is empty.</p>
          <p className="text-gray-400 mt-2">Add some products to get started!</p>
          <Link
            to="/products"
            className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        <div className="flex gap-4">
          {hasOutOfStockItems() && (
            <button
              onClick={validateCartItems}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Remove Out of Stock Items
            </button>
          )}
          <button
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Clear Cart
          </button>
        </div>
      </div>

      {/* Out of Stock Warning */}
      {hasOutOfStockItems() && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-orange-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-orange-800">
              Some items in your cart are out of stock. Please remove them or update quantities before proceeding to checkout.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          {/* Address Information */}
          <div className="mb-4 space-y-3">
            {vendorInfo && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-700 mb-2">
                  <span className="font-semibold">🏪 Vendor:</span> {vendorInfo.name}
                </div>
                <div className="text-sm text-blue-600">
                  <span className="font-semibold">📍 Pickup Location:</span>
                  {vendorAddress.street && (
                    <div className="ml-4 mt-1 text-xs">
                      {vendorAddress.street}<br/>
                      {vendorAddress.city}, {vendorAddress.state}<br/>
                      {vendorAddress.country}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {buyerAddress && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-700">
                  <span className="font-semibold">🏠 Your Delivery Address:</span> {formatLocation(buyerAddress)}
                </div>
              </div>
            )}
            
            {/* Address Required Prompt */}
            {deliveryOption === 'delivery' && (!buyerAddress.city || !buyerAddress.state) && !loadingRoute && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="text-blue-900 text-sm font-medium">Complete your delivery address</p>
                    <p className="text-blue-700 text-xs">
                      Please provide your Street, City, and State to calculate delivery pricing
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Smart Route Detection */}
            {loadingRoute && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                  <span className="text-yellow-800 text-sm font-medium">🗺️ Analyzing route and calculating delivery price...</span>
                </div>
              </div>
            )}
            
            {/* Enhanced Delivery Logistics Section */}
            {routeInfo && routeInfo.success && deliveryOption === 'delivery' && (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {routeInfo.category === 'intracity' && '🏙️'}
                      {routeInfo.category === 'intercity' && '🚛'}
                      {routeInfo.category === 'international' && '✈️'}
                    </span>
                    <div>
                      <h4 className="font-semibold text-gray-900 capitalize text-sm">{routeInfo.category} Delivery</h4>
                      <p className="text-xs text-gray-600">{routeInfo.from} → {routeInfo.to}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRouteDetails(!showRouteDetails)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    {showRouteDetails ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-white p-2 rounded">
                    <div className="text-sm font-bold text-emerald-600">₦{routeInfo.price.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Delivery Fee</div>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <div className="text-sm font-bold text-blue-600">{routeInfo.distance}km</div>
                    <div className="text-xs text-gray-600">Distance</div>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <div className="text-sm font-bold text-purple-600">
                      {routeInfo.availablePartners?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Partners</div>
                  </div>
                </div>
                
                {showRouteDetails && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 space-y-3">
                    {/* Available Logistics Partners */}
                    {routeInfo.availablePartners && routeInfo.availablePartners.length > 0 ? (
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Available Delivery Partners:</h5>
                        <div className="space-y-2">
                          {routeInfo.availablePartners.map((partner, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">🚚</span>
                                <div>
                                  <p className="text-sm font-medium">{partner.company?.name || 'Logistics Partner'}</p>
                                  <p className="text-xs text-gray-500">
                                    {partner.vehicleType || 'Standard'} • {partner.estimatedDays || '2-3'} days
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">₦{partner.price?.toLocaleString() || routeInfo.price.toLocaleString()}</p>
                                {partner === routeInfo.selectedPartner && (
                                  <span className="text-xs text-emerald-600 font-medium">✓ Selected</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                        ℹ️ Using platform default pricing (no logistics partners for this route)
                      </div>
                    )}
                    
                    {/* Route Breakdown */}
                    {routeInfo.breakdown && (
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong>Pricing Breakdown:</strong></p>
                        <p>• {routeInfo.breakdown.baseCalculation}</p>
                        <p>• {routeInfo.breakdown.appliedRule}</p>
                      </div>
                    )}
                    
                    {/* Delivery Options */}
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs text-blue-700">
                        <strong>💡 Tip:</strong> These delivery details will be confirmed at checkout.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-4">
            {cartItems.map((item) => {
              const vendorId = item.vendorId || itemVendors[item.id];
              const vendorData = vendorId ? itemVendors[vendorId] : null;
              
              return (
                <div key={item.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center space-x-4">
                    <img
                      src={item.image || (Array.isArray(item.images) && item.images[0]) || '/placeholder.png'}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                      {vendorData && (
                        <p className="text-sm text-gray-500 mb-1">
                          🏪 {vendorData.name}
                        </p>
                      )}
                      <p className="text-gray-600">{formatCurrency(item.price, item.currency)}</p>
                    </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => {
                        try {
                          updateQuantity(item.id, item.quantity + 1);
                        } catch (error) {
                          alert(error.message);
                        }
                      }}
                      disabled={item.quantity >= (item.stock || item.stockQuantity || 999)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                  {/* Stock Status */}
                  {item.stock !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      {item.stock <= 0 ? (
                        <span className="text-red-500">Out of Stock</span>
                      ) : (
                        <span>{item.stock} available</span>
                      )}
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(item.price * item.quantity, item.currency)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            {/* Delivery Options */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Delivery Option</h3>
              <div className="space-y-3">
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

              {/* Delivery Address Input */}
              {deliveryOption === 'delivery' && (
                <div className="mt-4">
                  <AddressInput
                    value={buyerAddress}
                    onChange={setBuyerAddress}
                    label="Your Delivery Address"
                    required={true}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Provide complete address details to get accurate delivery pricing
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced Pricing Breakdown */}
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Calculating...</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {/* Subtotal */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(getCartTotal(), cartItems[0]?.currency)}</span>
                </div>
                
                {/* Delivery Fee */}
                {deliveryOption === 'delivery' && routeInfo && (
                  <div className="flex justify-between">
                    <div>
                      <span className="text-gray-600">Delivery Fee</span>
                      <p className="text-xs text-gray-500">
                        {routeInfo.category} • {routeInfo.distance}km • {routeInfo.selectedPartner?.company?.name || 'Platform Default'}
                      </p>
                    </div>
                    <span className="font-semibold text-emerald-600">₦{routeInfo.price.toLocaleString()}</span>
                  </div>
                )}
                
                {/* Service Fee */}
                <div className="flex justify-between">
                  <div>
                    <span className="text-gray-600">Service Fee</span>
                    <p className="text-xs text-gray-500">Ojawa platform fee (5%)</p>
                  </div>
                  <span className="font-semibold">₦{(getCartTotal() * 0.05).toLocaleString()}</span>
                </div>
                
                {/* VAT */}
                <div className="flex justify-between">
                  <div>
                    <span className="text-gray-600">VAT</span>
                    <p className="text-xs text-gray-500">Value Added Tax (7.5%)</p>
                  </div>
                  <span className="font-semibold">₦{((getCartTotal() + (deliveryOption === 'delivery' && routeInfo ? routeInfo.price : 0)) * 0.075).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>
                  {(() => {
                    const subtotal = getCartTotal();
                    const deliveryFee = deliveryOption === 'delivery' && routeInfo ? routeInfo.price : 0;
                    const serviceFee = subtotal * 0.05;
                    const vat = (subtotal + deliveryFee) * 0.075;
                    const total = subtotal + deliveryFee + serviceFee + vat;
                    return formatCurrency(total, cartItems[0]?.currency);
                  })()}
                </span>
              </div>
            </div>

            {/* Delivery Summary */}
            {deliveryOption === 'delivery' && routeInfo && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <p><strong>📦 Delivery Summary:</strong></p>
                  <p>• Route: {routeInfo.from} → {routeInfo.to}</p>
                  <p>• Distance: {routeInfo.distance}km ({routeInfo.category})</p>
                  <p>• Partner: {routeInfo.selectedPartner?.company?.name || 'Platform Default'}</p>
                  <p>• Est. Delivery: {routeInfo.selectedPartner?.estimatedDays || '2-3'} days</p>
                </div>
              </div>
            )}
            {!currentUser && (
              <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-600">🛡️</span>
                  <span className="font-medium text-emerald-800">Secure Checkout with Wallet Protection</span>
                </div>
                <p className="text-sm text-emerald-700">
                  Sign in or create an account to complete your purchase with full wallet protection.
                </p>
              </div>
            )}
            <Link
              to={{
                pathname: "/checkout",
                state: {
                  deliveryOption,
                  selectedLogistics: selectedLogistics || routeInfo?.selectedPartner,
                  routeInfo,
                  buyerAddress,
                  vendorAddress: vendorInfo?.address,
                  calculatedDeliveryFee: routeInfo?.price || 0
                }
              }}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg text-center font-semibold hover:bg-emerald-700 transition-colors block"
            >
              {currentUser ? 'Proceed to Secure Checkout' : 'Sign In to Checkout Securely'}
            </Link>
            {!currentUser && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Your cart will be saved while you sign in
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
