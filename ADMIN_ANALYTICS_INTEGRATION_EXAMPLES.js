/**
 * Integration Example: How to add Analytics Dashboard to Admin Panel
 * 
 * This file shows exactly how to integrate the analytics system
 * into your existing admin panel.
 */

// ============================================================
// INTEGRATION STEP 1: Import the Analytics Dashboard
// ============================================================

import AdminAnalyticsDashboard from '../components/admin/AdminAnalyticsDashboard';

// Example: In your Admin.jsx or AdminDashboard.jsx
const Admin = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // ... existing admin code ...

  return (
    <div className="admin-panel">
      {/* Admin Navigation/Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Users
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Orders
        </button>

        {/* NEW: Analytics Tab */}
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'analytics'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Admin Content Areas */}
      <div className="admin-content">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'users' && <UsersManagement />}
        {activeTab === 'orders' && <OrdersManagement />}
        
        {/* NEW: Analytics Dashboard */}
        {activeTab === 'analytics' && <AdminAnalyticsDashboard />}
      </div>
    </div>
  );
};

// ============================================================
// INTEGRATION STEP 2: Add Analytics Tracking to Key Pages
// ============================================================

// Example 1: Track page views
import { usePageTracking } from '../hooks/useAnalytics';

function ProductDetailPage({ productId }) {
  usePageTracking('Product Detail');

  return (
    <div>
      <h1>Product Details</h1>
      {/* Product content */}
    </div>
  );
}

// ============================================================
// Example 2: Track button clicks
import { useClickTracking } from '../hooks/useAnalytics';

function CheckoutButton() {
  const { currentUser } = useAuth();
  const trackClick = useClickTracking(currentUser?.uid);

  const handleClick = async () => {
    trackClick('checkout_button', {
      cartTotal: calculateTotal(),
      itemCount: items.length,
      timestamp: new Date().toISOString()
    });

    // Proceed with checkout
    navigate('/checkout');
  };

  return <button onClick={handleClick}>Checkout</button>;
}

// ============================================================
// Example 3: Track form submissions
import { useFormTracking } from '../hooks/useAnalytics';

function VendorRegistrationForm() {
  const { currentUser } = useAuth();
  const trackFormSubmit = useFormTracking(currentUser?.uid);
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    trackFormSubmit('vendor_registration', {
      businessName: formData.businessName,
      category: formData.category,
      state: formData.state,
      formFields: Object.keys(formData).length
    });

    // Submit form
    await submitVendorForm(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit">Register</button>
    </form>
  );
}

// ============================================================
// Example 4: Track order events
import { useOrderTracking } from '../hooks/useAnalytics';

function OrderPage() {
  const { currentUser } = useAuth();
  const { trackOrderCreated, trackOrderStatusChange } = useOrderTracking(currentUser?.uid);

  const handleCreateOrder = async (cartData) => {
    try {
      const orderId = await createOrder(cartData);

      // Track order creation
      trackOrderCreated(orderId, {
        totalAmount: cartData.total,
        itemCount: cartData.items.length,
        vendorId: cartData.vendorId,
        paymentMethod: cartData.paymentMethod
      });

      // Show success message
      toast.success('Order placed successfully!');
    } catch (error) {
      console.error('Order failed:', error);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);

    // Track status change
    trackOrderStatusChange(orderId, order.status, newStatus);

    // Update order
    await updateOrderStatus(orderId, newStatus);
  };

  return (
    <div>
      {/* Order content */}
    </div>
  );
}

// ============================================================
// Example 5: Track product interactions
import { useProductTracking } from '../hooks/useAnalytics';

function ProductCard({ product }) {
  const { currentUser } = useAuth();
  const { trackProductViewed, trackProductAdded } = useProductTracking(currentUser?.uid);

  useEffect(() => {
    // Track product view
    trackProductViewed(product.id, product.name, product.vendorId);
  }, [product.id]);

  const handleAddToCart = () => {
    trackProductAdded(product.id, 1, product.price);
    addToCart(product);
  };

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p className="price">₦{product.price}</p>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}

// ============================================================
// Example 6: Track payment flow
import { usePaymentTracking } from '../hooks/useAnalytics';

function PaymentProcessor() {
  const { currentUser } = useAuth();
  const { trackPaymentInitiated, trackPaymentCompleted, trackPaymentFailed } = usePaymentTracking(currentUser?.uid);

  const handlePayment = async (amount, method) => {
    try {
      // Track payment start
      trackPaymentInitiated(amount, method);

      // Process payment
      const result = await processPayment(amount, method);

      // Track payment success
      trackPaymentCompleted(amount, method, result.transactionId);

      return result;
    } catch (error) {
      // Track payment failure
      trackPaymentFailed(amount, method, error.message);
      throw error;
    }
  };

  return (
    <div>
      {/* Payment UI */}
    </div>
  );
}

// ============================================================
// Example 7: Track conversion funnel
import { useFunnelTracking } from '../hooks/useAnalytics';

function CheckoutFlow() {
  const { currentUser } = useAuth();
  const trackCheckoutStage = useFunnelTracking(currentUser?.uid, 'checkout');
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Track when user views checkout
    trackCheckoutStage('view');
  }, []);

  const handleStartCheckout = () => {
    trackCheckoutStage('start');
    setStep(2);
  };

  const handleSaveAddress = () => {
    trackCheckoutStage('progress');
    setStep(3);
  };

  const handlePlaceOrder = async () => {
    try {
      await placeOrder();
      trackCheckoutStage('complete');
      navigate('/order-confirmation');
    } catch (error) {
      trackCheckoutStage('abandon');
      toast.error('Order failed');
    }
  };

  const handleAbandon = () => {
    trackCheckoutStage('abandon');
  };

  return (
    <div>
      {step === 1 && <CartSummary onStart={handleStartCheckout} />}
      {step === 2 && <AddressForm onSave={handleSaveAddress} />}
      {step === 3 && (
        <OrderReview
          onPlace={handlePlaceOrder}
          onAbandon={handleAbandon}
        />
      )}
    </div>
  );
}

// ============================================================
// Example 8: Track search events
import { useSearchTracking } from '../hooks/useAnalytics';

function ProductSearch() {
  const { currentUser } = useAuth();
  const trackSearch = useSearchTracking(currentUser?.uid);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = async (query) => {
    const results = await searchProducts(query);

    // Track search
    trackSearch(query, results.length);

    return results;
  };

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleSearch(searchTerm);
          }
        }}
        placeholder="Search products..."
      />
    </div>
  );
}

// ============================================================
// Example 9: Error tracking
import { useErrorTracking } from '../hooks/useAnalytics';

function ErrorBoundary({ children }) {
  const { currentUser } = useAuth();
  const trackError = useErrorTracking(currentUser?.uid);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error) => {
      // Track the error
      trackError(error, {
        component: 'ErrorBoundary',
        severity: 'critical'
      });

      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [currentUser?.uid]);

  if (hasError) {
    return <div>Something went wrong. Please refresh the page.</div>;
  }

  return children;
}

// ============================================================
// Example 10: Session tracking in main App
import { useAnalytics } from '../hooks/useAnalytics';

function App() {
  const { currentUser, userProfile } = useAuth();

  // This initializes all tracking: sessions, performance, etc.
  useAnalytics(currentUser?.uid, userProfile?.role);

  return (
    <div className="app">
      <Navbar />
      <main>
        <Routes>
          {/* Your routes */}
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

// ============================================================
// INTEGRATION STEP 3: Advanced - Custom Event Tracking
// ============================================================

import adminAnalyticsService from '../services/adminAnalyticsService';

// Track any custom event
async function trackCustomEvent(eventType, eventData) {
  await adminAnalyticsService.logEvent({
    eventType,
    category: 'custom',
    userId: currentUser?.uid,
    metadata: eventData
  });
}

// Example usage
trackCustomEvent('vendor_store_updated', {
  storeName: 'New Store',
  category: 'electronics',
  productCount: 45
});

// ============================================================
// INTEGRATION STEP 4: Analytics in Admin Context
// ============================================================

// Create an analytics context for easy access throughout the app
import { createContext, useContext } from 'react';

const AnalyticsContext = createContext();

export function AnalyticsProvider({ children }) {
  return (
    <AnalyticsContext.Provider value={adminAnalyticsService}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsContext() {
  return useContext(AnalyticsContext);
}

// Usage in any component
function SomeComponent() {
  const analytics = useAnalyticsContext();

  const handleAction = async () => {
    await analytics.logEvent({
      eventType: 'custom_action',
      category: 'custom',
      metadata: { /* data */ }
    });
  };

  return <button onClick={handleAction}>Do Action</button>;
}

// ============================================================
// FILES TO CREATE/UPDATE
// ============================================================

/*
1. CREATE: apps/buyer/src/services/adminAnalyticsService.js
   - Main analytics service

2. CREATE: apps/buyer/src/hooks/useAnalytics.js
   - All tracking hooks

3. CREATE: apps/buyer/src/components/admin/AdminAnalyticsDashboard.jsx
   - Analytics dashboard component

4. CREATE: functions/src/analytics.js
   - Cloud functions for analytics

5. UPDATE: functions/index.js
   - Import and export analytics functions

6. UPDATE: apps/buyer/src/pages/Admin.jsx or AdminDashboard.jsx
   - Add analytics tab and dashboard

7. UPDATE: apps/buyer/src/App.jsx or main layout
   - Add useAnalytics hook initialization
*/

// ============================================================
// DEPLOYMENT STEPS
// ============================================================

/*
1. Copy all new files to the correct locations
2. Update existing files (Admin.jsx, functions/index.js, App.jsx)
3. Create Firestore indexes (see ADMIN_ANALYTICS_SETUP_GUIDE.md)
4. Deploy functions: firebase deploy --only functions
5. Deploy hosting: firebase deploy --only hosting
6. Test analytics dashboard in admin panel
7. Verify data collection is working
8. Set up regular monitoring schedule
*/

export {
  CheckoutButton,
  VendorRegistrationForm,
  OrderPage,
  ProductCard,
  PaymentProcessor,
  CheckoutFlow,
  ProductSearch,
  ErrorBoundary,
  App,
  AnalyticsProvider,
  useAnalyticsContext
};
