import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../contexts/MessagingContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import AddressInput from '../components/AddressInput';
import CheckoutLogisticsSelector from '../components/CheckoutLogisticsSelector';
import { formatCurrency as formatCurrencyUtil } from '../utils/currencyUtils';
import MessageVendorModal from '../components/MessageVendorModal';

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
  console.log('🛒 Cart component rendering...');
  
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart, validateCartItems, hasOutOfStockItems, saveIntendedDestination } = useCart();
  const { currentUser, loading: authLoading } = useAuth();
  const { startConversation, setActiveConversation } = useMessaging?.() || {};
  const navigate = useNavigate?.() || (() => {});
  const location = useLocation?.() || { search: '' };
  
  console.log('🛒 Cart - cartItems:', cartItems.length);
  console.log('🛒 Cart - currentUser:', currentUser?.email);
  
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState('pickup');
  const [loading, setLoading] = useState(false);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [buyerAddress, setBuyerAddress] = useState({ 
    street: '', 
    city: '', 
    state: '', 
    country: 'Nigeria' 
  });
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [estimatedDelivery, setEstimatedDelivery] = useState('2-3 days');
  const [vendorProcessingDays, setVendorProcessingDays] = useState(2);
  const [totalDeliveryTime, setTotalDeliveryTime] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [messageAllVendors, setMessageAllVendors] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);

  // Compute single-vendor address (current flow supports one vendor per cart for delivery calc)
  const vendorAddressText = (() => {
    if (!vendorInfo || cartItems.length === 0) return '';
    const firstVendorId = cartItems[0]?.vendorId;
    const v = vendorInfo[firstVendorId];
    return v?.address || '';
  })();

  // Build buyer's full address ONLY when sufficient fields exist
  const buyerFullAddress = (() => {
    const { street, city, state, country } = buyerAddress || {};
    if (!street || (!city && !state)) return '';
    return [street, city, state, country].filter(Boolean).join(', ');
  })();

  // Message vendor function - redirect directly to vendor dialogue
  const messageVendor = async (item) => {
    try {
      if (!item?.vendorId) return;

      // If not signed in, prompt and redirect to login, then return here and open chat
      if (!currentUser) {
        const proceed = window.confirm('You need to sign in to message a vendor. Continue to sign in?');
        if (proceed) {
          const path = `/cart?messageVendorFor=${encodeURIComponent(item.id)}`;
          saveIntendedDestination(path, item.id);
          navigate(`/login?message=${encodeURIComponent('Please sign in to message this vendor.')}`);
        }
        return;
      }

      if (!startConversation) return;
      const conv = await startConversation(item.vendorId);
      if (setActiveConversation) setActiveConversation(conv);
      navigate('/messages');
    } catch (e) {
      console.error('Failed to open vendor chat:', e);
      // Fallback to old modal if something goes wrong
      setSelectedItem(item);
      setMessageAllVendors(false);
      setShowMessageModal(true);
    }
  };

  // Message all vendors function
  const handleMessageAllVendors = () => {
    console.log('💬 Message all vendors clicked');
    setSelectedItem(null);
    setMessageAllVendors(true);
    setShowMessageModal(true);
    console.log('💬 Modal should be opening now');
  };

  // If redirected back after login with a target item, auto-open chat
  useEffect(() => {
    if (!currentUser) return;
    const params = new URLSearchParams(location.search || '');
    const targetId = params.get('messageVendorFor');
    if (!targetId) return;
    const targetItem = cartItems.find(i => String(i.id) === String(targetId));
    if (targetItem) {
      // Open and then clean the URL param to prevent repeat triggers
      messageVendor(targetItem);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('messageVendorFor');
        window.history.replaceState({}, '', url.toString());
      } catch (_) {}
    }
  }, [currentUser, location.search, cartItems]);

  // Fetch buyer address
  useEffect(() => {
    const fetchBuyerAddress = async () => {
      if (!currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const address = userData.structuredAddress || {
            street: userData.address || '',
            city: userData.city || '',
            state: userData.state || '',
            country: userData.country || 'Nigeria'
          };
          setBuyerAddress(address);
          console.log('✅ Buyer address loaded:', address);
        }
      } catch (error) {
        console.error('Failed to fetch buyer address:', error);
      }
    };

    fetchBuyerAddress();
  }, [currentUser]);

  // Fetch vendor info and processing times for cart items
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        if (!cartItems.length) {
          setVendorInfo(null);
          setVendorProcessingDays(2);
          return;
        }
        
        // Only fetch vendor info if auth is fully loaded (required for Firestore rules)
        // For unauthenticated users, we can't fetch vendor profiles, but they can still view cart
        if (authLoading) {
          // Wait for auth to finish loading
          return;
        }
        
        // If not authenticated, skip vendor info fetch (vendor info not critical for basic cart view)
        if (!currentUser) {
          // For guests, we could fetch from products instead, but for now just skip
          setVendorInfo(null);
          return;
        }
        
        // Calculate maximum processing time from all products
        let maxProcessingDays = 0;
        for (const item of cartItems) {
          let processingTime = 2; // Default
          if (item.processingTimeDays) {
            processingTime = item.processingTimeDays;
          } else if (item.id) {
            try {
              const prodSnap = await getDoc(doc(db, 'products', item.id));
              if (prodSnap.exists()) {
                processingTime = prodSnap.data().processingTimeDays || 2;
              }
            } catch (error) {
              console.error('Failed to fetch product processing time:', error);
            }
          }
          maxProcessingDays = Math.max(maxProcessingDays, processingTime);
        }
        setVendorProcessingDays(maxProcessingDays);

        // Get unique vendor IDs from cart items
        const vendorIds = [...new Set(cartItems.map(item => item.vendorId).filter(Boolean))];
        
        if (vendorIds.length > 0) {
          const vendorData = {};
          
          for (const vendorId of vendorIds) {
            try {
              const userSnap = await getDoc(doc(db, 'users', vendorId));
              if (userSnap.exists()) {
                const vendor = userSnap.data();
                vendorData[vendorId] = {
                  id: vendorId,
                  name: vendor.displayName || 
                        vendor.name || 
                        vendor.businessName || 
                        vendor.storeName ||
                        vendor.email?.split('@')[0] ||
                        'Vendor',
                  address: vendor.vendorProfile?.businessAddress || vendor.address || 'Address not specified'
                };
              }
            } catch (err) {
              console.error(`Error fetching vendor ${vendorId}:`, err);
            }
          }
          
          setVendorInfo(vendorData);
          console.log('✅ Vendor info loaded:', vendorData);
        }
      } catch (error) {
        console.error('Failed to fetch vendor info:', error);
        setVendorInfo(null);
      }
    };

    fetchVendors();
  }, [cartItems, currentUser, authLoading]);

  // Delivery cost updates: only after a partner is selected
  useEffect(() => {
    if (deliveryOption === 'pickup') {
      setDeliveryCost(0);
      setEstimatedDelivery('Pickup only');
      setSelectedPartner(null);
      return;
    }

    // For delivery, require selected partner
    if (selectedPartner) {
      setDeliveryCost(selectedPartner.deliveryFee || 0);
      setEstimatedDelivery(selectedPartner.eta || '2-3 days');
    } else {
      // No partner yet; do not prefill any delivery amount
      setDeliveryCost(0);
      setEstimatedDelivery('');
    }
  }, [deliveryOption, selectedPartner]);

  // Calculate pricing breakdown
  useEffect(() => {
    const calculatePricing = async () => {
      if (cartItems.length === 0) {
        setPricingBreakdown(null);
        return;
      }

      try {
        setLoading(true);
        
        const subtotal = getCartTotal();
        const delivery = deliveryOption === 'delivery' && selectedPartner ? deliveryCost : 0;
        const total = subtotal + delivery;
        
        const breakdown = {
          subtotal,
          delivery,
          total,
          deliveryOption,
          estimatedDelivery: delivery > 0 ? estimatedDelivery : 'Pickup only'
        };
        
        setPricingBreakdown(breakdown);
        console.log('✅ Pricing calculated:', breakdown);
      } catch (error) {
        console.error('Error calculating pricing:', error);
      } finally {
        setLoading(false);
      }
    };

    calculatePricing();
  }, [cartItems, deliveryOption, deliveryCost, selectedPartner, getCartTotal]);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-8">Add some products to get started!</p>
            <Link 
              to="/products" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Shopping Cart</h1>
            <span className="text-sm sm:text-base text-gray-600">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Cart Items */}
          <div className="space-y-4 mb-6">
            {cartItems.map((item) => (
              <div key={`${item.id}-${item.vendorId}`} className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={item.image || '/placeholder-product.jpg'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    style={{
                      minWidth: '64px',
                      minHeight: '64px',
                      maxWidth: '64px',
                      maxHeight: '64px'
                    }}
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-product.jpg';
                    }}
                  />
                </div>
                
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.name}</h3>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(item.price, item.currency)}
                    {item.currency && <span className="ml-1 text-xs text-gray-500">({item.currency.split(' ')[1]})</span>}
                  </p>
                  {vendorInfo && vendorInfo[item.vendorId] && (
                    <p className="text-xs text-gray-500 truncate">Sold by: {vendorInfo[item.vendorId].name}</p>
                  )}
                </div>

                <div className="text-right flex-shrink-0 w-full sm:w-auto">
                  <p className="font-medium text-sm sm:text-base">
                    {formatCurrency(item.price * item.quantity, item.currency)}
                  </p>
                  <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 mt-1">
                    <button
                      onClick={() => messageVendor(item)}
                      className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs hover:bg-purple-200 transition-colors"
                      title="Message vendor directly"
                    >
                      💬 Message
                    </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                      className="text-red-600 text-xs hover:text-red-800"
                  >
                    Remove
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Logistics partner selection - shown just below vendor info */}
          {deliveryOption === 'delivery' && (
            <div className="mb-6">
              <CheckoutLogisticsSelector
                cartItems={cartItems}
                buyerAddress={buyerFullAddress}
                vendorAddress={vendorAddressText}
                onLogisticsSelected={(logistics) => {
                  console.log('🚚 Logistics selected:', logistics);
                  setSelectedPartner(logistics);
                  setDeliveryCost(logistics.deliveryFee);
                  setEstimatedDelivery(logistics.eta);
                  const logisticsDays = parseInt(logistics.estimatedDays) || 0;
                  const totalDays = vendorProcessingDays + logisticsDays;
                  setTotalDeliveryTime({
                    vendorDays: vendorProcessingDays,
                    logisticsDays: logisticsDays,
                    totalDays: totalDays
                  });
                }}
              />
            </div>
          )}

          {/* Display Total Delivery Time Breakdown */}
          {totalDeliveryTime && deliveryOption === 'delivery' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">📦 Estimated Delivery Time</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Vendor processing:</span>
                  <span className="font-medium text-blue-900">{totalDeliveryTime.vendorDays} {totalDeliveryTime.vendorDays === 1 ? 'day' : 'days'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Shipping:</span>
                  <span className="font-medium text-blue-900">{totalDeliveryTime.logisticsDays} {totalDeliveryTime.logisticsDays === 1 ? 'day' : 'days'}</span>
                </div>
                <div className="border-t border-blue-300 pt-1 mt-1 flex justify-between">
                  <span className="font-medium text-blue-900">Total delivery:</span>
                  <span className="font-bold text-blue-900">{totalDeliveryTime.totalDays} {totalDeliveryTime.totalDays === 1 ? 'day' : 'days'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Options */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Delivery Options</h3>
            <div className="space-y-3">
              <label className="flex items-start sm:items-center">
                <input
                  type="radio"
                  name="delivery"
                  value="pickup"
                  checked={deliveryOption === 'pickup'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="mr-3 mt-1 sm:mt-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm sm:text-base">Pickup Only</span>
                  <p className="text-xs sm:text-sm text-gray-600">Free - Pick up from vendor location</p>
                </div>
              </label>
              
              <label className="flex items-start sm:items-center">
                <input
                  type="radio"
                  name="delivery"
                  value="delivery"
                  checked={deliveryOption === 'delivery'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="mr-3 mt-1 sm:mt-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm sm:text-base">Home Delivery</span>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {selectedPartner ? `${formatCurrency(deliveryCost)} - ${estimatedDelivery}` : 'Enter your address and select a partner to calculate'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Address Input for Delivery */}
          {deliveryOption === 'delivery' && (
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <AddressInput
                  value={buyerAddress.street}
                  placeholder="Start typing street address... (e.g., 15 Marina Street)"
                  onChange={(val) => setBuyerAddress(prev => ({ ...prev, street: val }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <AddressInput
                  value={buyerAddress.city}
                  placeholder="City (e.g., Lagos Island)"
                  onChange={(val) => setBuyerAddress(prev => ({ ...prev, city: val }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select State</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                    value={buyerAddress.state}
                    onChange={(e) => setBuyerAddress(prev => ({ ...prev, state: e.target.value }))}
                  >
                    <option value="">Select State</option>
                    <option value="Lagos">Lagos</option>
                    <option value="Abuja">Abuja</option>
                    <option value="Kaduna">Kaduna</option>
                    <option value="Kano">Kano</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                    value={buyerAddress.country}
                    onChange={(e) => setBuyerAddress(prev => ({ ...prev, country: e.target.value }))}
                  >
                    <option value="Nigeria">Nigeria</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="border-t pt-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(getCartTotal())}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{deliveryOption === 'delivery' && selectedPartner ? formatCurrency(deliveryCost) : '₦0.00'}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency((getCartTotal()) + (deliveryOption === 'delivery' && selectedPartner ? deliveryCost : 0))}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Link to="/products" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-center">Continue Shopping</Link>
              <button onClick={() => setShowMessageModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">💬 Message Vendors</button>
              <Link to="/checkout" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center">Proceed to Checkout</Link>
            </div>
          </div>

          {showMessageModal && (
            <MessageVendorModal
              isOpen={showMessageModal}
              onClose={() => setShowMessageModal(false)}
              vendor={{ id: cartItems[0]?.vendorId, name: vendorInfo?.[cartItems[0]?.vendorId]?.name || 'Vendor' }}
              product={cartItems[0]}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;