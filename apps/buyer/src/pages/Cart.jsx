import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../contexts/MessagingContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import AddressInput from '../components/AddressInput';
import simpleLogisticsService from '../services/simpleLogisticsService';
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
  const { currentUser } = useAuth();
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
                  name: vendor.displayName || 'Vendor',
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
  }, [cartItems]);

  // Calculate delivery cost using simple logistics service
  useEffect(() => {
    const calculateDeliveryCost = async () => {
      if (deliveryOption === 'pickup') {
        setDeliveryCost(0);
        setEstimatedDelivery('Pickup only');
      } else {
        try {
          const cartTotal = getCartTotal();
          
          // Use simple logistics service for delivery calculation
          const result = simpleLogisticsService.calculateCompleteDelivery(
            { street: 'Vendor Location', city: 'Lagos', state: 'Lagos', country: 'Nigeria' },
            buyerAddress,
            cartTotal
          );
          
          if (result.success) {
            setDeliveryCost(result.price);
            setEstimatedDelivery(result.durationText);
            console.log('✅ Delivery cost calculated:', result);
          } else {
            // Fallback to simple calculation
            let cost = 500;
            if (cartTotal > 15000) cost = 200;
            else if (cartTotal > 5000) cost = 300;
            
            setDeliveryCost(cost);
            setEstimatedDelivery('2-3 days');
          }
        } catch (error) {
          console.error('Error calculating delivery cost:', error);
          // Fallback to simple calculation
          const cartTotal = getCartTotal();
          let cost = 500;
          if (cartTotal > 15000) cost = 200;
          else if (cartTotal > 5000) cost = 300;
          
          setDeliveryCost(cost);
          setEstimatedDelivery('2-3 days');
        }
      }
    };

    calculateDeliveryCost();
  }, [deliveryOption, cartItems, buyerAddress, getCartTotal]);

  // Calculate pricing breakdown
  useEffect(() => {
    const calculatePricing = async () => {
      if (cartItems.length === 0) {
        setPricingBreakdown(null);
        return;
      }

      try {
        setLoading(true);
        
        // Simple pricing calculation without external APIs
        const subtotal = getCartTotal();
        const delivery = deliveryCost;
        const total = subtotal + delivery;
        
        const breakdown = {
          subtotal,
          delivery,
          total,
          deliveryOption,
          estimatedDelivery
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
  }, [cartItems, deliveryOption, deliveryCost, getCartTotal]);

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

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
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

          {/* New Logistics Pricing Selector */}
          {deliveryOption === 'delivery' && (
            <div className="mb-6">
              <CheckoutLogisticsSelector
                cartItems={cartItems}
                buyerAddress={`${buyerAddress.street}, ${buyerAddress.city}, ${buyerAddress.state}, ${buyerAddress.country}`}
                onLogisticsSelected={(logistics) => {
                  console.log('🚚 Logistics selected:', logistics);
                  setDeliveryCost(logistics.deliveryFee);
                  setEstimatedDelivery(logistics.eta);
                  // Calculate total delivery time
                  const logisticsDays = parseInt(logistics.estimatedDays) || 0;
                  const totalDays = vendorProcessingDays + logisticsDays;
                  setTotalDeliveryTime({
                    vendorDays: vendorProcessingDays,
                    logisticsDays: logisticsDays,
                    totalDays: totalDays
                  });
                }}
                onPriceCalculated={(calculation) => {
                  console.log('💰 Price calculated:', calculation);
                  setDeliveryCost(calculation.deliveryFee);
                  setEstimatedDelivery(calculation.eta);
                  // Calculate total delivery time
                  const logisticsDays = parseInt(calculation.estimatedDays) || 0;
                  const totalDays = vendorProcessingDays + logisticsDays;
                  setTotalDeliveryTime({
                    vendorDays: vendorProcessingDays,
                    logisticsDays: logisticsDays,
                    totalDays: totalDays
                  });
                }}
              />
              
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
                    {deliveryCost > 0 ? `${formatCurrency(deliveryCost)} - ${estimatedDelivery}` : 'Calculate delivery cost'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Address Input for Delivery */}
          {deliveryOption === 'delivery' && (
            <div className="mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Delivery Address</h3>
              <AddressInput
                address={buyerAddress}
                onAddressChange={setBuyerAddress}
                placeholder="Enter your delivery address"
              />
            </div>
          )}

          {/* Pricing Summary */}
          {pricingBreakdown && (
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(pricingBreakdown.subtotal, '₦ NGN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>
                    {pricingBreakdown.delivery > 0 
                      ? formatCurrency(pricingBreakdown.delivery, '₦ NGN')
                      : 'Free'
                    }
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-2">
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(pricingBreakdown.total, '₦ NGN')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Link
              to="/products"
              className="flex-1 bg-gray-200 text-gray-800 px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-gray-300 transition-colors text-center text-sm sm:text-base"
            >
              Continue Shopping
            </Link>
            <button
              onClick={handleMessageAllVendors}
              className="flex-1 bg-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-purple-700 transition-colors text-center text-sm sm:text-base"
            >
              💬 Message Vendors
            </button>
            <Link
              to="/checkout"
              className="flex-1 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm sm:text-base"
            >
              Proceed to Checkout
            </Link>
          </div>

          {/* Clear Cart Button */}
          <div className="mt-4 text-center">
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>

      {/* Message Vendor Modal */}
      <MessageVendorModal
        isOpen={showMessageModal}
        onClose={() => {
          setShowMessageModal(false);
          setSelectedItem(null);
          setMessageAllVendors(false);
        }}
        vendor={{
          id: selectedItem?.vendorId || 'vendor-id',
          name: selectedItem ? (vendorInfo?.[selectedItem.vendorId]?.name || 'Vendor') : 'Vendors'
        }}
        product={selectedItem}
        cartItems={messageAllVendors ? cartItems : null}
      />
    </div>
  );
};

export default Cart;