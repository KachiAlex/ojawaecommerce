import { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import EnhancedLogisticsSelector from '../components/EnhancedLogisticsSelector';
import firebaseService from '../services/firebaseService';
import WalletBalanceCheck from '../components/WalletBalanceCheck';
import escrowPaymentService from '../services/escrowPaymentService';
import { pricingService } from '../services/pricingService';
import logisticsPricingService from '../services/logisticsPricingService';

// Currency helpers
const currencySymbolMap = {
  NGN: '₦', USD: '$', EUR: '€', GBP: '£', KES: 'KSh', GHS: '₵', ZAR: 'R'
}
const getCurrencyCode = (value) => {
  if (!value) return 'NGN'
  const s = String(value).trim()
  if (/^[A-Za-z]{3}$/.test(s)) return s.toUpperCase()
  // Try infer from symbol
  if (s.includes('₦')) return 'NGN'
  if (s.includes('$')) return 'USD'
  if (s.includes('€')) return 'EUR'
  if (s.includes('£')) return 'GBP'
  if (s.includes('KSh')) return 'KES'
  return 'NGN'
}
const formatAmount = (amount, code = 'NGN') => {
  const numeric = Number(amount) || 0
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(numeric)
  } catch {
    const sym = currencySymbolMap[code] || ''
    return `${sym}${numeric.toLocaleString()}`
  }
}

const CheckoutForm = ({ total, pricingBreakdown, cartItems, onSuccess, orderDetails, walletBalance, canProceed, currencyCode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!canProceed) {
      setError('Insufficient wallet balance. Please fund your wallet first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create order with escrow payment
      const orderId = await createOrderWithEscrow();

      // Send payment confirmation email
      try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('../firebase/config');
        const sendPaymentConfirmation = httpsCallable(functions, 'sendPaymentConfirmation');
        await sendPaymentConfirmation({
          buyerEmail: currentUser.email,
          buyerName: currentUser.displayName || 'Customer',
          orderId: orderId,
          amount: Math.round(total * 100),
          items: cartItems
        });
      } catch (emailError) {
        console.warn('Failed to send payment confirmation email:', emailError);
      }

      onSuccess({ id: orderId, status: 'succeeded', provider: 'wallet_escrow' });
    } catch (err) {
      setError('Order creation failed. Please try again.');
      console.error('Order creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createOrderWithEscrow = async () => {
    try {
      // Resolve vendorId for each product to ensure vendor dashboards see the order
      const itemsWithVendors = [];
      for (const item of cartItems) {
        let resolvedVendorId = item.vendorId;
        if (!resolvedVendorId && item.id) {
          try {
            const prodSnap = await getDoc(doc(db, 'products', item.id));
            if (prodSnap.exists()) {
              resolvedVendorId = prodSnap.data().vendorId || resolvedVendorId;
            }
          } catch (_) {}
        }
        itemsWithVendors.push({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          vendorId: resolvedVendorId || 'unknown'
        });
      }

      // For now we assume single-vendor orders; use first item's vendorId
      const orderVendorId = itemsWithVendors[0]?.vendorId || null;

      // Process escrow payment FIRST before creating order
      // This ensures the order is only created if payment succeeds
      const tempOrderId = `temp-${Date.now()}`;
      const escrowResult = await escrowPaymentService.processEscrowPayment({
        buyerId: currentUser.uid,
        totalAmount: total,
        orderId: tempOrderId
      });

      // Create comprehensive order data with escrow_funded status
      const orderData = {
        buyerId: currentUser.uid,
        buyerEmail: currentUser.email,
        buyerName: currentUser.displayName || '',
        items: itemsWithVendors,
        vendorId: orderVendorId,
        subtotal: orderDetails.subtotal,
        deliveryFee: orderDetails.deliveryFee,
        ojawaCommission: orderDetails.ojawaCommission,
        totalAmount: total,
        currency: currencyCode,
        paymentProvider: 'wallet_escrow',
        paymentStatus: 'escrow_funded',
        escrowStatus: 'funds_transferred_to_escrow',
        escrowHeld: true,
        escrowAmount: total,
        deliveryOption: orderDetails.deliveryOption,
        deliveryAddress: orderDetails.buyerAddress || '',
        logisticsCompany: orderDetails.selectedLogistics?.company || null,
        logisticsCompanyId: orderDetails.selectedLogistics?.id || null,
        estimatedDelivery: orderDetails.selectedLogistics?.estimatedDays || null,
        trackingId: orderDetails.deliveryOption === 'delivery' ? `TRK-${Date.now()}` : null,
        status: 'escrow_funded', // Order is created with escrow already funded
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create order using service with escrow_funded status
      const orderId = await firebaseService.orders.create(orderData);

      // Notify vendor of new order (only if vendor is known)
      if (orderVendorId) {
        try {
          // Create notification directly in Firestore instead of using Cloud Function
          await firebaseService.notifications.create({
            userId: orderVendorId,
            type: 'new_order',
            title: 'New Order Received',
            message: `You have received a new order from ${currentUser.displayName || 'Customer'} for ₦${total.toLocaleString()}`,
            orderId: orderId,
            buyerName: currentUser.displayName || 'Customer',
            totalAmount: total,
            items: itemsWithVendors,
            read: false
          });
        } catch (notificationError) {
          console.warn('Failed to notify vendor:', notificationError);
        }
      }

      // Create buyer notification
      try {
        await firebaseService.notifications.createOrderNotification(
          { id: orderId, buyerId: currentUser.uid, status: 'escrow_funded' },
          'order_placed'
        );
      } catch (notificationError) {
        console.warn('Failed to create buyer notification:', notificationError);
      }

      // If delivery is selected, create delivery record
      if (orderDetails.deliveryOption === 'delivery' && orderDetails.selectedLogistics) {
        await firebaseService.logistics.createDelivery({
          orderId,
          trackingId: orderData.trackingId,
          buyerId: currentUser.uid,
          vendorId: orderData.items[0].vendorId, // Assuming single vendor for now
          logisticsCompanyId: orderData.logisticsCompanyId,
          pickupLocation: 'Vendor Location', // This should come from vendor profile
          deliveryLocation: orderData.deliveryAddress,
          estimatedDelivery: orderData.estimatedDelivery,
          amount: orderDetails.deliveryFee
        });
      }

      return orderId;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Escrow Payment</h3>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <span className="text-blue-600 text-xl mr-3">🔒</span>
            <div>
              <h4 className="font-medium text-blue-900">Secure Escrow Payment</h4>
              <p className="text-sm text-blue-800 mt-1">
                Your payment will be held securely in escrow until you confirm delivery and satisfaction. 
                Funds will only be released to the vendor after you confirm receipt.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          {/* Pricing Breakdown */}
          {pricingBreakdown ? (
            <div className="space-y-2 mb-4">
              {Object.entries(pricingBreakdown.breakdown).map(([key, item]) => {
                if (!item) return null;
                
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-600">{item.label}</span>
                      {item.description && key !== 'total' && (
                        <p className="text-xs text-gray-500">{item.description}</p>
                      )}
                      {item.rate && (
                        <p className="text-xs text-gray-500">({item.rate}%)</p>
                      )}
                    </div>
                    <span className={`font-semibold ${key === 'total' ? 'text-lg' : ''}`}>
                      {formatAmount(item.amount, currencyCode)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Payment Amount:</span>
              <span className="font-semibold text-lg">{formatAmount(total, currencyCode)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center mt-2 pt-2 border-t">
            <span className="text-gray-600 text-sm">Current Wallet Balance:</span>
            <span className="text-sm">{formatAmount(walletBalance, currencyCode)}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !canProceed}
          className="w-full bg-emerald-600 text-white py-3 px-4 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Processing Escrow Payment...' : `Pay ${formatAmount(total, currencyCode)} with Wallet Escrow`}
        </button>
        
        {!canProceed && (
          <p className="text-sm text-red-600 mt-2 text-center">
            Please fund your wallet to continue with this payment
          </p>
        )}
      </div>
    </form>
  );
};

const Checkout = () => {
  const { cartItems, getCartTotal, getPricingBreakdown, clearCart } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedLogistics, setSelectedLogistics] = useState(null);
  const [deliveryOption, setDeliveryOption] = useState('pickup'); // 'pickup' or 'delivery'
  const [buyerAddress, setBuyerAddress] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [availableLogistics, setAvailableLogistics] = useState([]);
  const [loadingLogistics, setLoadingLogistics] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState(0);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const currencyCode = getCurrencyCode(cartItems[0]?.currency || cartItems[0]?.priceCurrency || 'NGN');
  const [canProceed, setCanProceed] = useState(false);

  // Calculate pricing breakdown whenever cart items or delivery options change
  useEffect(() => {
    const calculatePricing = async () => {
      if (cartItems.length === 0) return;

      try {
        setLoadingPricing(true);
        const breakdown = await getPricingBreakdown(deliveryOption, selectedLogistics);
        setPricingBreakdown(breakdown);
      } catch (error) {
        console.error('Error calculating pricing:', error);
      } finally {
        setLoadingPricing(false);
      }
    };

    calculatePricing();
  }, [cartItems, deliveryOption, selectedLogistics, getPricingBreakdown]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      navigate('/cart');
      return;
    }

    // Check for self-purchase prevention
    checkSelfPurchase();
    // Prefill buyer and vendor addresses
    prefillAddresses();
    // Load wallet balance
    loadWalletBalance();
  }, [currentUser, cartItems, navigate]);
  
  // Calculate smart logistics pricing when addresses change
  useEffect(() => {
    if (deliveryOption === 'delivery' && buyerAddress && vendorAddress) {
      calculateSmartLogisticsPrice();
    }
  }, [buyerAddress, vendorAddress, deliveryOption]);

  const checkSelfPurchase = async () => {
    try {
      // Get user profile to check if they're also a vendor
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isVendor = userData.isVendor || userData.vendorProfile?.verificationStatus === 'verified';
        
        if (isVendor) {
          // Check if any cart items belong to this vendor
          const selfProducts = [];
          
          for (const item of cartItems) {
            let itemVendorId = item.vendorId;
            
            // If vendorId not in cart item, fetch from product
            if (!itemVendorId && item.id) {
              try {
                const productDoc = await getDoc(doc(db, 'products', item.id));
                if (productDoc.exists()) {
                  itemVendorId = productDoc.data().vendorId;
                }
              } catch (error) {
                console.error('Error fetching product vendor:', error);
              }
            }
            
            if (itemVendorId === currentUser.uid) {
              selfProducts.push(item);
            }
          }

          if (selfProducts.length > 0) {
            alert('You cannot purchase from your own vendor account. Please remove your own products from the cart.');
            navigate('/cart');
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error checking self-purchase:', error);
    }
  };

  const prefillAddresses = async () => {
    try {
      // Buyer address
      const buyerDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (buyerDoc.exists()) {
        const data = buyerDoc.data();
        if (data.address) setBuyerAddress(data.address);
      }

      // Vendor address from first item
      let vendorId = cartItems[0]?.vendorId;
      if (!vendorId && cartItems[0]?.id) {
        try {
          const prodSnap = await getDoc(doc(db, 'products', cartItems[0].id));
          if (prodSnap.exists()) vendorId = prodSnap.data().vendorId;
        } catch (_) {}
      }
      if (vendorId) {
        const vendorSnap = await getDoc(doc(db, 'users', vendorId));
        if (vendorSnap.exists()) {
          const v = vendorSnap.data();
          const addr = v.vendorProfile?.businessAddress || v.address || '';
          setVendorAddress(addr);
        }
      }
    } catch (e) {
      console.error('Failed to prefill addresses', e);
    }
  };

  const calculateSmartLogisticsPrice = async () => {
    if (deliveryOption !== 'delivery' || !buyerAddress || !vendorAddress) {
      setRouteInfo(null);
      setCalculatedDeliveryFee(0);
      return;
    }
    
    try {
      setLoadingLogistics(true);
      
      // Calculate delivery price using smart routing
      const pricing = await logisticsPricingService.calculateDeliveryPrice(
        vendorAddress,
        buyerAddress
      );
      
      if (pricing.success) {
        setRouteInfo(pricing);
        setCalculatedDeliveryFee(pricing.price);
        
        // If we have available partners, set them
        if (pricing.availablePartners && pricing.availablePartners.length > 0) {
          setAvailableLogistics(pricing.availablePartners);
          // Auto-select cheapest partner
          setSelectedLogistics(pricing.selectedPartner);
        }
      } else {
        // Use default price if calculation fails
        setCalculatedDeliveryFee(pricing.defaultPrice || 5000);
      }
    } catch (error) {
      console.error('Error calculating logistics price:', error);
      setCalculatedDeliveryFee(5000); // Default fallback
    } finally {
      setLoadingLogistics(false);
    }
  };
  
  const fetchAvailableLogistics = async () => {
    if (deliveryOption !== 'delivery' || !buyerAddress) return;
    
    try {
      setLoadingLogistics(true);
      
      // Calculate estimated weight and distance for the delivery
      const estimatedWeight = cartItems.reduce((total, item) => total + (item.weight || 1), 0);
      const estimatedDistance = 50; // Default 50km - in real app, calculate from addresses
      
      const deliveryData = {
        pickupLocation: vendorAddress || 'Vendor Location',
        deliveryLocation: buyerAddress,
        weight: estimatedWeight,
        distance: estimatedDistance
      };
      
      const partners = await firebaseService.logistics.getAvailablePartners(deliveryData);
      setAvailableLogistics(partners);
    } catch (error) {
      console.error('Error fetching logistics partners:', error);
    } finally {
      setLoadingLogistics(false);
    }
  };

  // Fetch logistics when delivery option changes
  useEffect(() => {
    if (deliveryOption === 'delivery' && buyerAddress) {
      fetchAvailableLogistics();
    } else {
      setAvailableLogistics([]);
      setSelectedLogistics(null);
    }
  }, [deliveryOption, buyerAddress]);

  const handlePaymentSuccess = (paymentIntent) => {
    setShowSuccess(true);
    clearCart();
    
    // Redirect to buyer dashboard after 3 seconds
    setTimeout(() => {
      navigate('/enhanced-buyer');
    }, 3000);
  };

  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Escrow Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your payment has been securely held in escrow. The vendor has been notified and will prepare your order.
            You can track your order in your dashboard.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to your orders dashboard in a few seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
        {/* Order Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
          
          <div className="space-y-4 mb-6">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-4">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  <p className="text-sm font-medium text-gray-900">{formatAmount(item.price * item.quantity, currencyCode)}</p>
                </div>
              </div>
            ))}
          </div>
          
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatAmount(getCartTotal(), currencyCode)}</span>
              </div>
              {deliveryOption === 'delivery' && selectedLogistics && (
                <div className="flex justify-between">
                  <span>Delivery ({selectedLogistics.company}):</span>
                  <span>{selectedLogistics.price}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Ojawa Service Fee (5%):</span>
                <span>{formatAmount((getCartTotal() * 0.05), currencyCode)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>Total:</span>
                <span>{formatAmount(pricingBreakdown?.total || getCartTotal(), currencyCode)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                * Includes wallet protection and dispute resolution
            </div>
            </div>
          </div>

          {/* Delivery Options */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Options</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  id="pickup" 
                  name="delivery" 
                  value="pickup"
                  checked={deliveryOption === 'pickup'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="text-emerald-600"
                />
                <label htmlFor="pickup" className="flex items-center gap-2">
                  <span>🏪</span>
                  <div>
                    <p className="font-medium">Pickup from Vendor</p>
                    <p className="text-sm text-gray-600">Collect directly from vendor location (Free)</p>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  id="delivery" 
                  name="delivery" 
                  value="delivery"
                  checked={deliveryOption === 'delivery'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="text-emerald-600"
                />
                <label htmlFor="delivery" className="flex items-center gap-2">
                  <span>🚚</span>
                  <div>
                    <p className="font-medium">Home Delivery</p>
                    <p className="text-sm text-gray-600">Get it delivered to your doorstep</p>
                  </div>
                </label>
              </div>
            </div>

            {deliveryOption === 'delivery' && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Delivery Address</label>
                  <textarea 
                    rows="3"
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter your full delivery address (e.g., 15 Marina Street, Lagos Island, Lagos, Nigeria)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Address</label>
                  <textarea 
                    rows="2"
                    value={vendorAddress}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">Automatically fetched from vendor's store</p>
                </div>
                
                {/* Smart Route Detection Display */}
                {loadingLogistics && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-blue-900 text-sm font-medium">🗺️ Analyzing route and calculating delivery price...</span>
                    </div>
                  </div>
                )}
                
                {routeInfo && routeInfo.success && (
                  <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {routeInfo.category === 'intracity' && '🏙️'}
                          {routeInfo.category === 'intercity' && '🚛'}
                          {routeInfo.category === 'international' && '✈️'}
                        </span>
                        <div>
                          <h4 className="font-semibold text-gray-900 capitalize">{routeInfo.category} Delivery</h4>
                          <p className="text-sm text-gray-600">{routeInfo.from} → {routeInfo.to}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowRouteDetails(!showRouteDetails)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        {showRouteDetails ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center p-2 bg-white rounded">
                        <div className="text-lg font-bold text-emerald-600">₦{routeInfo.price.toLocaleString()}</div>
                        <div className="text-xs text-gray-600">Delivery Fee</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="text-lg font-bold text-blue-600">{routeInfo.distance}km</div>
                        <div className="text-xs text-gray-600">Distance</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="text-lg font-bold text-purple-600">
                          {routeInfo.availablePartners?.length || 0}
                        </div>
                        <div className="text-xs text-gray-600">Partners</div>
                      </div>
                    </div>
                    
                    {showRouteDetails && (
                      <div className="mt-3 pt-3 border-t border-emerald-200 space-y-2">
                        {routeInfo.usingPlatformDefault ? (
                          <div className="text-xs text-gray-700 bg-yellow-50 p-2 rounded">
                            <span className="font-medium">ℹ️ Platform Default Pricing:</span> No logistics partners currently service this route. Using standard platform rates.
                          </div>
                        ) : (
                          <div className="text-xs text-gray-700 bg-green-50 p-2 rounded">
                            <span className="font-medium">✓ Partner Available:</span> {routeInfo.selectedPartner?.company?.name || 'Logistics Partner'} selected (cheapest option)
                          </div>
                        )}
                        
                        {routeInfo.breakdown && (
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>• {routeInfo.breakdown.baseCalculation}</p>
                            <p>• {routeInfo.breakdown.appliedRule}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <EnhancedLogisticsSelector 
                  onLogisticsSelect={(logisticsData) => {
                    setSelectedLogistics({
                      ...logisticsData.partner,
                      price: `₦${logisticsData.partner.pricing.cost.toLocaleString()}`,
                      company: logisticsData.partner.name,
                      estimatedDays: logisticsData.partner.estimatedDelivery
                    });
                  }}
                  deliveryData={{
                    weight: cartItems.reduce((total, item) => total + (item.weight || 1) * item.quantity, 0),
                    deliveryType: 'standard',
                    isFragile: cartItems.some(item => item.isFragile),
                    requiresSignature: cartItems.some(item => item.requiresSignature),
                    itemValue: getCartTotal()
                  }}
                  showRouteVisualization={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Wallet Balance Check */}
        <WalletBalanceCheck 
          totalAmount={pricingBreakdown?.total || getCartTotal()}
          onBalanceCheck={(sufficient) => {
            setCanProceed(sufficient);
          }}
          onInsufficientFunds={(currentBalance) => {
            setWalletBalance(currentBalance);
            setCanProceed(false);
          }}
        />

        {/* Payment Form */}
        <div>
          <CheckoutForm 
            total={pricingBreakdown?.total || getCartTotal()} 
            pricingBreakdown={pricingBreakdown}
            cartItems={cartItems}
            onSuccess={handlePaymentSuccess}
            orderDetails={{
              selectedLogistics,
              deliveryOption,
              buyerAddress,
              pricingBreakdown,
              subtotal: getCartTotal(),
              deliveryFee: selectedLogistics ? parseFloat(selectedLogistics.price.replace(/[^\d.]/g, '')) : 0,
              ojawaCommission: getCartTotal() * 0.05
            }}
            walletBalance={walletBalance}
            canProceed={canProceed}
            currencyCode={currencyCode}
          />
        </div>
      </div>
    </div>
  );
};

export default Checkout;
