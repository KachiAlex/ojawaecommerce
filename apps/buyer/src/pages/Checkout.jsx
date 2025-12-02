import { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
// import EnhancedLogisticsSelector from '../components/EnhancedLogisticsSelector'; // Disabled
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

      // Show success and redirect to receipt
      onSuccess({ id: orderId, status: 'succeeded', provider: 'wallet_escrow' });
      
      // Optionally redirect to buyer dashboard to view receipt
      // navigate(`/buyer?orderId=${orderId}&showReceipt=true`);
    } catch (err) {
      setError('Order creation failed. Please try again.');
      console.error('Order creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createOrderWithEscrow = async () => {
    try {
      // Resolve vendorId and processing time for each product
      const itemsWithVendors = [];
      let maxProcessingTimeDays = 0; // Track maximum processing time from all products
      
      for (const item of cartItems) {
        let resolvedVendorId = item.vendorId;
        let productProcessingTime = 2; // Default 2 days if not set
        
        if (!resolvedVendorId && item.id) {
          try {
            const prodSnap = await getDoc(doc(db, 'products', item.id));
            if (prodSnap.exists()) {
              const productData = prodSnap.data();
              resolvedVendorId = productData.vendorId || resolvedVendorId;
              productProcessingTime = productData.processingTimeDays || 2;
            }
          } catch (_) {}
        } else if (item.processingTimeDays) {
          // Use processing time from item if available
          productProcessingTime = item.processingTimeDays;
        }
        
        // Use maximum processing time from all items in cart
        maxProcessingTimeDays = Math.max(maxProcessingTimeDays, productProcessingTime);
        
        itemsWithVendors.push({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          vendorId: resolvedVendorId || 'unknown',
          processingTimeDays: productProcessingTime
        });
      }

      // For now we assume single-vendor orders; use first item's vendorId
      const orderVendorId = itemsWithVendors[0]?.vendorId || null;
      
      // Calculate total delivery time: vendor processing + logistics shipping
      const logisticsShippingDays = orderDetails.selectedLogistics?.estimatedDays || 0;
      const vendorProcessingDays = maxProcessingTimeDays;
      const totalDeliveryDays = vendorProcessingDays + logisticsShippingDays;
      
      // Calculate delivery dates
      const now = new Date();
      const estimatedDeliveryDate = new Date(now.getTime() + totalDeliveryDays * 24 * 60 * 60 * 1000);
      const deliveryDeadline = new Date(now.getTime() + (totalDeliveryDays + 2) * 24 * 60 * 60 * 1000); // +2 day buffer

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
        logisticsShippingDays: logisticsShippingDays,
        vendorProcessingDays: vendorProcessingDays,
        totalDeliveryDays: totalDeliveryDays,
        estimatedDelivery: totalDeliveryDays, // Keep for backward compatibility
        estimatedDeliveryDate: estimatedDeliveryDate,
        deliveryDeadline: deliveryDeadline,
        trackingId: null, // Will be set to Order ID after creation
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
      <div className="bg-slate-900 p-6 rounded-lg shadow border border-emerald-900/60">
        <h3 className="text-lg font-medium text-white mb-4">Escrow Payment</h3>
        
        <div className="bg-teal-900/20 border border-teal-800/60 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <span className="text-amber-400 text-xl mr-3">🔒</span>
            <div>
              <h4 className="font-medium text-teal-200">Secure Escrow Payment</h4>
              <p className="text-sm text-teal-300 mt-1">
                Your payment will be held securely in escrow until you confirm delivery and satisfaction. 
                Funds will only be released to the vendor after you confirm receipt.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-emerald-900/60">
          {/* Pricing Breakdown */}
          {pricingBreakdown ? (
            <div className="space-y-2 mb-4">
              {Object.entries(pricingBreakdown.breakdown).map(([key, item]) => {
                if (!item) return null;
                
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <div>
                      <span className="text-teal-200">{item.label}</span>
                      {item.description && key !== 'total' && (
                        <p className="text-xs text-teal-400">{item.description}</p>
                      )}
                      {item.rate && (
                        <p className="text-xs text-teal-400">({item.rate}%)</p>
                      )}
                    </div>
                    <span className={`font-semibold ${key === 'total' ? 'text-lg text-emerald-400' : 'text-white'}`}>
                      {formatAmount(item.amount, currencyCode)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-teal-200">Payment Amount:</span>
              <span className="font-semibold text-lg text-emerald-400">{formatAmount(total, currencyCode)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-900/60">
            <span className="text-teal-300 text-sm">Current Wallet Balance:</span>
            <span className="text-sm text-white">{formatAmount(walletBalance, currencyCode)}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="text-red-400 mr-2">⚠️</span>
              <span className="text-red-300">{error}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !canProceed}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 py-3 px-4 rounded-md hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          {loading ? 'Processing Escrow Payment...' : `Pay ${formatAmount(total, currencyCode)} with Wallet Escrow`}
        </button>
        
        {!canProceed && (
          <p className="text-sm text-red-400 mt-2 text-center">
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
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Get logistics data from cart (passed via navigation state)
  const cartData = location?.state || {};
  
  console.log('🛒 Checkout - Cart data received:', cartData);
  console.log('💰 Checkout - Calculated delivery fee:', cartData.calculatedDeliveryFee);
  console.log('🚚 Checkout - Route info:', cartData.routeInfo);
  
  const [selectedLogistics, setSelectedLogistics] = useState(cartData.selectedLogistics || null);
  const [deliveryOption, setDeliveryOption] = useState(cartData.deliveryOption || 'pickup');
  const [buyerAddress, setBuyerAddress] = useState(cartData.buyerAddress || '');
  const [vendorAddress, setVendorAddress] = useState(cartData.vendorAddress || '');
  const [routeInfo, setRouteInfo] = useState(cartData.routeInfo || null);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState(cartData.calculatedDeliveryFee || 0);
  
  // Payment-focused states
  const [walletBalance, setWalletBalance] = useState(0);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const currencyCode = getCurrencyCode(cartItems[0]?.currency || cartItems[0]?.priceCurrency || 'NGN');
  const [canProceed, setCanProceed] = useState(false);

  // Calculate pricing breakdown using cart data
  useEffect(() => {
    const calculatePricing = () => {
      if (cartItems.length === 0) {
        setPricingBreakdown(null);
        return;
      }

      try {
        setLoadingPricing(true);
        
        // Use pre-calculated delivery fee from cart
        const subtotal = getCartTotal();
        const deliveryFee = calculatedDeliveryFee;
        const serviceFee = subtotal * 0.05;
        const vat = (subtotal + deliveryFee) * 0.075;
        const total = subtotal + deliveryFee + serviceFee + vat;

        const breakdown = {
          subtotal: subtotal,
          deliveryFee: deliveryFee,
          serviceFee: serviceFee,
          vat: vat,
          total: total,
          breakdown: {
            subtotal: { label: 'Subtotal', amount: subtotal },
            deliveryFee: deliveryFee > 0 ? { 
              label: 'Delivery Fee', 
              amount: deliveryFee,
              description: `${routeInfo?.category || 'delivery'} • ${routeInfo?.distance || '0'}km`
            } : null,
            serviceFee: { label: 'Service Fee (5%)', amount: serviceFee },
            vat: { label: 'VAT (7.5%)', amount: vat },
            total: { label: 'Total', amount: total }
          }
        };
        
        console.log('💰 Checkout - Pricing breakdown calculated:', breakdown);
        console.log('💰 Checkout - Delivery fee in breakdown:', breakdown.deliveryFee);
        console.log('💰 Checkout - Total:', breakdown.total);
        
        setPricingBreakdown(breakdown);
      } catch (error) {
        console.error('Error calculating pricing:', error);
      } finally {
        setLoadingPricing(false);
      }
    };

    calculatePricing();
  }, [cartItems, calculatedDeliveryFee, routeInfo, getCartTotal]);

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
  
  // Logistics data is pre-calculated from cart

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

  const loadWalletBalance = async () => {
    try {
      if (!currentUser) return;
      
      const walletData = await firebaseService.wallet.getUserWallet(currentUser.uid);
      setWalletBalance(walletData?.balance || 0);
    } catch (error) {
      console.error('Failed to load wallet balance:', error);
      setWalletBalance(0);
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

  // Simplified - logistics data comes from cart (no need to fetch here)

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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-slate-950 min-h-screen">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-900/40 border border-emerald-700 mb-4">
            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Escrow Payment Successful!</h1>
          <p className="text-teal-200 mb-6">
            Your payment has been securely held in escrow. The vendor has been notified and will prepare your order.
            You can track your order in your dashboard.
          </p>
          <p className="text-sm text-teal-400">
            Redirecting to your orders dashboard in a few seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-slate-950 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
        {/* Order Summary */}
        <div className="bg-slate-900 p-6 rounded-lg shadow border border-emerald-900/60">
          <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>
          
          <div className="space-y-4 mb-6">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-4">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded border border-emerald-900/60"
                />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white">{item.name}</h3>
                  <p className="text-sm text-teal-300">Qty: {item.quantity}</p>
                  <p className="text-sm font-medium text-emerald-300">{formatAmount(item.price * item.quantity, currencyCode)}</p>
                </div>
              </div>
            ))}
          </div>
          
            <div className="border-t border-emerald-900/60 pt-4 space-y-2">
              <div className="flex justify-between text-teal-200">
                <span>Subtotal:</span>
                <span className="text-white">{formatAmount(getCartTotal(), currencyCode)}</span>
              </div>
              {deliveryOption === 'delivery' && (
                <div className="flex justify-between text-teal-200">
                  <div className="flex flex-col">
                    <span>Delivery Fee:</span>
                    {routeInfo?.category && (
                      <span className="text-xs text-teal-400">({routeInfo.category} • {routeInfo.distance}km)</span>
                    )}
                  </div>
                  <span className="font-medium text-emerald-400">{formatAmount(calculatedDeliveryFee, currencyCode)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-teal-300">
                <span>Ojawa Service Fee (5%):</span>
                <span className="text-white">{formatAmount((getCartTotal() * 0.05), currencyCode)}</span>
              </div>
              <div className="flex justify-between text-sm text-teal-300">
                <span>VAT (7.5%):</span>
                <span className="text-white">{formatAmount(((getCartTotal() + calculatedDeliveryFee) * 0.075), currencyCode)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-emerald-900/60 pt-2 mt-2 text-white">
                <span>Total:</span>
                <span className="text-emerald-400">{formatAmount(pricingBreakdown?.total || getCartTotal(), currencyCode)}</span>
              </div>
              <div className="text-xs text-teal-400 mt-2">
                * Includes wallet protection and dispute resolution
              </div>
            </div>
          </div>

          {/* Delivery Summary */}
          {deliveryOption === 'delivery' && calculatedDeliveryFee > 0 && (
            <div className="bg-teal-900/20 border border-teal-800/60 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-teal-200 mb-3">📦 Delivery Details</h3>
              
              {routeInfo ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">
                      {routeInfo.category === 'intracity' && '🏙️'}
                      {routeInfo.category === 'intercity' && '🚛'}
                      {routeInfo.category === 'international' && '✈️'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-white capitalize">{routeInfo.category} Delivery</p>
                      <p className="text-xs text-teal-300">{routeInfo.from} → {routeInfo.to}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-teal-300">Distance:</span>
                      <span className="text-white font-medium">{routeInfo.distance}km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-300">Delivery Fee:</span>
                      <span className="text-emerald-400 font-medium">₦{calculatedDeliveryFee.toLocaleString()}</span>
                    </div>
                    {routeInfo.selectedPartner && (
                      <div className="flex justify-between">
                        <span className="text-teal-300">Partner:</span>
                        <span className="text-white font-medium">{routeInfo.selectedPartner.companyName || 'Selected Partner'}</span>
                      </div>
                    )}
                    {routeInfo.usingPlatformDefault && (
                      <div className="mt-2 p-2 bg-amber-900/20 border border-amber-800/60 rounded text-xs text-amber-300">
                        ℹ️ Using platform default pricing (no logistics partner selected)
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-teal-300">Delivery Fee:</span>
                    <span className="text-emerald-400 font-medium">₦{calculatedDeliveryFee.toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-teal-300 mt-3 pt-3 border-t border-teal-800/60">
                💡 <a href="/cart" className="underline font-medium hover:text-emerald-300 text-emerald-400">Modify delivery options in cart</a> if needed.
              </p>
            </div>
          )}
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
              deliveryFee: calculatedDeliveryFee || 0,
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
