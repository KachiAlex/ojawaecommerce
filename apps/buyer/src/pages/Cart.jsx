import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../contexts/MessagingContext';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import AddressInput from '../components/AddressInput';
import CheckoutLogisticsSelector from '../components/CheckoutLogisticsSelector';
import { formatCurrency as formatCurrencyUtil } from '../utils/currencyUtils';
import MessageVendorModal from '../components/MessageVendorModal';

// Helper function to format currency with amount
const formatCurrency = (amount, currencyString) => {
  const safeAmount = amount || 0;
  if (!currencyString) return `₦${safeAmount.toFixed(2)}`;
  
  // Extract currency symbol and code from string like "₦ NGN"
  const parts = currencyString.trim().split(/\s+/);
  const symbol = parts[0] || '₦';
  const code = parts[1] || 'NGN';
  
  return `${symbol}${safeAmount.toFixed(2)}`;
};

const Cart = () => {
  console.log('🛒 Cart component rendering...');
  
  const { cartItems, cartReady, updateQuantity, removeFromCart, getCartTotal, clearCart, validateCartItems, hasOutOfStockItems, saveIntendedDestination } = useCart();
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

      // If not signed in, show popup and redirect to login, then open chat with this vendor
      if (!currentUser) {
        // Show a proper alert/modal instead of window.confirm
        const shouldProceed = window.confirm('You need to sign in to send a message to the vendor. Continue to sign in?');
        
        if (shouldProceed) {
          // Store vendor info in sessionStorage for post-login redirect
          sessionStorage.setItem('pendingVendorMessage', JSON.stringify({
            vendorId: item.vendorId,
            itemId: item.id,
            timestamp: Date.now()
          }));
          
          // Save intended destination (cart page with vendor message param)
          const path = `/cart?messageVendorFor=${encodeURIComponent(item.id)}`;
          saveIntendedDestination(path, item.id);
          
          // Navigate to login with message
          navigate(`/login?message=${encodeURIComponent('Please sign in to message this vendor.')}`);
        }
        return;
      }

      // User is signed in - proceed to open conversation
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

  // If redirected back after login with a target item or vendor, auto-open chat
  useEffect(() => {
    if (!currentUser) return;
    
    // Check for pending vendor message from sessionStorage
    try {
      const pendingMessage = sessionStorage.getItem('pendingVendorMessage');
      if (pendingMessage) {
        const { vendorId, timestamp } = JSON.parse(pendingMessage);
        
        // Only process if less than 5 minutes old
        if (Date.now() - timestamp < 300000) {
          sessionStorage.removeItem('pendingVendorMessage');
          
          // Directly open conversation with vendor
          if (startConversation && vendorId) {
            startConversation(vendorId).then((conv) => {
              if (setActiveConversation) setActiveConversation(conv);
              navigate('/messages');
            }).catch((err) => {
              console.error('Failed to start conversation after login:', err);
            });
          }
          return;
        } else {
          // Clear stale pending message
          sessionStorage.removeItem('pendingVendorMessage');
        }
      }
    } catch (err) {
      console.error('Error checking pending vendor message:', err);
    }
    
    // Fallback: Check URL param for item-based message
    const params = new URLSearchParams(location.search || '');
    const targetId = params.get('messageVendorFor');
    if (targetId) {
      const targetItem = cartItems.find(i => String(i.id) === String(targetId));
      if (targetItem && targetItem.vendorId) {
        // Open conversation directly using vendor ID
        if (startConversation) {
          startConversation(targetItem.vendorId).then((conv) => {
            if (setActiveConversation) setActiveConversation(conv);
            navigate('/messages');
          }).catch((err) => {
            console.error('Failed to start conversation:', err);
          });
        }
        
        // Clean URL param
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('messageVendorFor');
          window.history.replaceState({}, '', url.toString());
        } catch (_) {}
      }
    }
  }, [currentUser, location.search, cartItems, startConversation, setActiveConversation, navigate]);

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
        
        // Wait for auth to finish loading, but fetch vendor info even if user is not authenticated
        // Vendor profiles are publicly readable (needed for cart/checkout)
        if (authLoading) {
          // Wait for auth to finish loading
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
        console.log('🛒 Fetching vendor info - vendorIds:', vendorIds);
        console.log('🛒 Cart items:', cartItems.map(item => ({ id: item.id, vendorId: item.vendorId, name: item.name })));
        
        if (vendorIds.length > 0) {
          const vendorData = {};
          
          for (const vendorId of vendorIds) {
            console.log(`🛒 Fetching vendor ${vendorId}...`);
            try {
              // Force fetch from server to get latest vendor data (bypasses cache)
              const userSnap = await getDoc(doc(db, 'users', vendorId));
              let vendorAddress = '';
              
              if (userSnap.exists()) {
                const vendor = userSnap.data();
                
                // Debug: Log vendor data to see what's available
                console.log(`🔍 Vendor ${vendorId} data:`, {
                  hasVendorProfile: !!vendor.vendorProfile,
                  businessAddress: vendor.vendorProfile?.businessAddress,
                  vendorAddress: vendor.address,
                  structuredAddress: vendor.vendorProfile?.structuredAddress,
                  topLevelAddress: vendor.address
                });
                
                // Try multiple possible address fields
                vendorAddress = 
                  vendor.vendorProfile?.businessAddress || 
                  vendor.vendorProfile?.address ||
                  vendor.address || 
                  (vendor.vendorProfile?.structuredAddress ? 
                    [
                      vendor.vendorProfile.structuredAddress.street,
                      vendor.vendorProfile.structuredAddress.city,
                      vendor.vendorProfile.structuredAddress.state,
                      vendor.vendorProfile.structuredAddress.country || 'Nigeria'
                    ].filter(Boolean).join(', ') :
                    '') ||
                  (vendor.structuredAddress ? 
                    [
                      vendor.structuredAddress.street,
                      vendor.structuredAddress.city,
                      vendor.structuredAddress.state,
                      vendor.structuredAddress.country || 'Nigeria'
                    ].filter(Boolean).join(', ') :
                    '');
                
                // If still no address, try checking stores collection
                if (!vendorAddress || vendorAddress === '') {
                  try {
                    const storesQuery = query(
                      collection(db, 'stores'),
                      where('vendorId', '==', vendorId),
                      limit(1)
                    );
                    const storesSnapshot = await getDocs(storesQuery);
                    if (!storesSnapshot.empty) {
                      const store = storesSnapshot.docs[0].data();
                      vendorAddress = store.contactInfo?.address || store.address || '';
                      console.log(`🏪 Found address from store:`, vendorAddress);
                    }
                  } catch (storeErr) {
                    console.warn(`⚠️ Could not fetch store address:`, storeErr);
                  }
                }
                
                // Final fallback
                if (!vendorAddress || vendorAddress === '') {
                  vendorAddress = 'Address not specified';
                }
                
                console.log(`📍 Final vendor address for ${vendorId}:`, vendorAddress);
                
                // Get vendor phone number from multiple possible locations
                const vendorPhone = vendor.vendorProfile?.businessPhone || 
                                   vendor.phone || 
                                   vendor.phoneNumber || 
                                   vendor.contactPhone || 
                                   '';
                
                vendorData[vendorId] = {
                  id: vendorId,
                  name: vendor.displayName || 
                        vendor.name || 
                        vendor.businessName || 
                        vendor.storeName ||
                        vendor.email?.split('@')[0] ||
                        'Vendor',
                  address: vendorAddress,
                  phone: vendorPhone
                };
              } else {
                console.warn(`⚠️ Vendor ${vendorId} document does not exist`);
                vendorData[vendorId] = {
                  id: vendorId,
                  name: 'Vendor',
                  address: 'Address not specified',
                  phone: ''
                };
              }
            } catch (err) {
              console.error(`❌ Error fetching vendor ${vendorId}:`, err);
              vendorData[vendorId] = {
                id: vendorId,
                name: 'Vendor',
                address: 'Address not specified',
                phone: ''
              };
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

  // Clear selected partner and delivery cost when switching delivery options
  useEffect(() => {
    // Always clear partner selection when delivery option changes
    // This ensures no stale prices are shown when switching to delivery
    setSelectedPartner(null);
    setDeliveryCost(0);
    setEstimatedDelivery('');
    setTotalDeliveryTime(null);
    
    if (deliveryOption === 'pickup') {
      setEstimatedDelivery('Pickup only');
    }
  }, [deliveryOption]);

  // Delivery cost updates: only after a partner is selected
  useEffect(() => {
    if (deliveryOption === 'pickup') {
      setDeliveryCost(0);
      setEstimatedDelivery('Pickup only');
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
      setTotalDeliveryTime(null);
    }
  }, [deliveryOption, selectedPartner]);

  // Calculate pricing breakdown
  useEffect(() => {
    const calculatePricing = async () => {
      if (!cartReady) {
        return;
      }

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
      <div className="min-h-screen bg-slate-950 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h1 className="text-2xl font-bold text-white mb-4">Your cart is empty</h1>
            <p className="text-teal-200 mb-8">Add some products to get started!</p>
            <Link 
              to="/products" 
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 px-6 py-3 rounded-lg hover:from-emerald-400 hover:to-teal-400 transition-colors font-semibold"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <div className="bg-slate-900 rounded-lg shadow-sm border border-emerald-900/60 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Shopping Cart</h1>
            <span className="text-sm sm:text-base text-teal-200">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Cart Items */}
          <div className="space-y-4 mb-6">
            {cartItems.map((item) => (
              <div key={`${item.id}-${item.vendorId}`} className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-4 border border-emerald-900/60 rounded-lg bg-slate-800">
                <div className="w-16 h-16 flex-shrink-0 bg-slate-700 rounded-lg overflow-hidden">
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
                  <h3 className="font-medium text-white text-sm sm:text-base truncate">{item.name}</h3>
                  <p className="text-sm text-teal-200">
                    {formatCurrency(item.price, item.currency)} <span className="text-teal-400">× {item.quantity}</span>
                    {item.currency && <span className="ml-1 text-xs text-teal-400">({item.currency.split(' ')[1]})</span>}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="w-6 h-6 flex items-center justify-center border border-teal-700 rounded text-teal-200 hover:bg-emerald-900/40 text-sm"
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span className="text-sm font-medium text-teal-100 min-w-[2rem] text-center">Qty: {item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center border border-teal-700 rounded text-teal-200 hover:bg-emerald-900/40 text-sm"
                    >
                      +
                    </button>
                  </div>
                  {vendorInfo && vendorInfo[item.vendorId] && (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-teal-400 truncate">Sold by: {vendorInfo[item.vendorId].name}</p>
                      {vendorInfo[item.vendorId].phone && (
                        <a 
                          href={`tel:${vendorInfo[item.vendorId].phone}`}
                          className="inline-flex items-center text-xs text-emerald-300 hover:text-emerald-200 hover:underline"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Call: {vendorInfo[item.vendorId].phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0 w-full sm:w-auto">
                  <p className="font-medium text-sm sm:text-base text-emerald-300">
                    {formatCurrency(item.price * item.quantity, item.currency)}
                  </p>
                  <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 mt-1">
                    <button
                      onClick={() => messageVendor(item)}
                      className="bg-emerald-900/40 text-emerald-300 border border-emerald-700 px-2 py-1 rounded text-xs hover:bg-emerald-900/60 transition-colors"
                      title="Message vendor directly"
                    >
                      💬 Message
                    </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                      className="text-rose-400 text-xs hover:text-rose-300"
                  >
                    Remove
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Display Total Delivery Time Breakdown */}
          {totalDeliveryTime && deliveryOption === 'delivery' && (
            <div className="mt-4 p-4 bg-teal-900/20 rounded-lg border border-teal-800/60">
              <h4 className="text-sm font-medium text-teal-200 mb-2">📦 Estimated Delivery Time</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-teal-300">Vendor processing:</span>
                  <span className="font-medium text-amber-300">{totalDeliveryTime.vendorDays} {totalDeliveryTime.vendorDays === 1 ? 'day' : 'days'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-300">Shipping:</span>
                  <span className="font-medium text-amber-300">{totalDeliveryTime.logisticsDays} {totalDeliveryTime.logisticsDays === 1 ? 'day' : 'days'}</span>
                </div>
                <div className="border-t border-teal-800/60 pt-1 mt-1 flex justify-between">
                  <span className="font-medium text-teal-200">Total delivery:</span>
                  <span className="font-bold text-amber-400">{totalDeliveryTime.totalDays} {totalDeliveryTime.totalDays === 1 ? 'day' : 'days'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Options */}
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Delivery Options</h3>
            <div className="space-y-3">
              <label className="flex items-start sm:items-center">
                <input
                  type="radio"
                  name="delivery"
                  value="pickup"
                  checked={deliveryOption === 'pickup'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="mr-3 mt-1 sm:mt-0 accent-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm sm:text-base text-teal-100">Pickup Only</span>
                  <p className="text-xs sm:text-sm text-teal-300">Free - Pick up from vendor location</p>
                </div>
              </label>
              
              <label className="flex items-start sm:items-center">
                <input
                  type="radio"
                  name="delivery"
                  value="delivery"
                  checked={deliveryOption === 'delivery'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="mr-3 mt-1 sm:mt-0 accent-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm sm:text-base text-teal-100">Home Delivery</span>
                  <p className="text-xs sm:text-sm text-teal-300">
                    {selectedPartner && deliveryCost > 0 ? `${formatCurrency(deliveryCost)} - ${estimatedDelivery}` : 'Enter your address and select a partner to see pricing'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Address Input for Delivery */}
          {deliveryOption === 'delivery' && (
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium text-white mb-3">Delivery Address</h4>
              <AddressInput
                value={buyerAddress}
                label=""
                onChange={(updatedAddress) => {
                  setBuyerAddress(updatedAddress);
                }}
              />
            </div>
          )}

          {/* Logistics partner selection - shown below address input */}
          {deliveryOption === 'delivery' && (
            <div className="mb-6">
              <CheckoutLogisticsSelector
                key={`${buyerFullAddress}-${vendorAddressText}-${deliveryOption}`}
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

          {/* Order Summary */}
          <div className="border-t border-emerald-900/60 pt-4">
            <h3 className="text-base sm:text-lg font-medium text-white mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-teal-200">
                <span>Subtotal</span>
                <span className="text-white">{formatCurrency(getCartTotal())}</span>
              </div>
              <div className="flex justify-between text-teal-200">
                <span>Delivery</span>
                <span className="text-white">{deliveryOption === 'delivery' && selectedPartner ? formatCurrency(deliveryCost) : '₦0.00'}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-emerald-900/60 pt-2 text-white">
                <span>Total</span>
                <span className="text-emerald-400">{formatCurrency((getCartTotal()) + (deliveryOption === 'delivery' && selectedPartner ? deliveryCost : 0))}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Link to="/products" className="px-4 py-2 bg-slate-800 text-teal-200 border border-emerald-900/60 hover:bg-slate-700 rounded-lg text-center transition-colors">Continue Shopping</Link>
              <button onClick={() => setShowMessageModal(true)} className="px-4 py-2 bg-emerald-900/40 text-emerald-300 border border-emerald-700 rounded-lg hover:bg-emerald-900/60 transition-colors">💬 Message Vendors</button>
              <Link
                to="/checkout"
                state={{
                  selectedLogistics: selectedPartner,
                  deliveryOption,
                  buyerAddress: buyerFullAddress,
                  vendorAddress: vendorAddressText,
                  routeInfo: selectedPartner
                    ? {
                        category: 'delivery',
                        distance: selectedPartner.distance || 0,
                        selectedPartner: {
                          companyName: selectedPartner.partner?.name || 'Selected Partner',
                        },
                        usingPlatformDefault: false,
                      }
                    : null,
                  calculatedDeliveryFee:
                    deliveryOption === 'delivery' && selectedPartner ? deliveryCost : 0,
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-lg hover:from-emerald-400 hover:to-teal-400 text-center font-semibold transition-colors"
              >
                Proceed to Checkout
              </Link>
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