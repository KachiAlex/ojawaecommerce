import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, Suspense, lazy, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { MessagingProvider } from './contexts/MessagingContext';
import { LanguageProvider } from './contexts/LanguageContext';
// OnboardingContext removed - causing initialization flow issues
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import { RouteLoadingSpinner, ComponentLoadingSpinner } from './components/OptimizedLoadingSpinner';
import PerformanceMonitor from './components/PerformanceMonitor';
import AnimatedPage from './components/AnimatedPage';
import { setupGlobalErrorHandling } from './utils/errorLogger';
import { validateEnvironment } from './config/env';
import networkManager from './utils/networkManager';
import networkMonitor from './utils/networkMonitor';
import { analyzeBundle } from './utils/bundleAnalyzer';
// Console protection disabled during testing - will be enabled for production
// import { setupConsoleProtection } from './utils/consoleProtection';
// import logger from './utils/logger';
import './utils/clearFlutterwaveScripts';
import './App.css';

// Core pages (loaded immediately for better performance)
import HomeNew from './pages/HomeNew';
import DashboardRedirect from './components/DashboardRedirect';
import LogoUpload from './components/LogoUpload';

// Performance optimization: Preload critical components
const preloadCriticalComponents = () => {
  // Preload critical components after initial render
          setTimeout(() => {
    import('./components/Navbar');
    import('./components/MobileBottomNavigation');
    import('./pages/Products');
    import('./pages/Cart');
  }, 100);
};

// Simplified lazy loading for non-critical components
const lazyLoad = (componentImport) => {
  return lazy(componentImport);
};

// Lazy load non-critical components
const Navbar = lazyLoad(() => import('./components/Navbar'));
const PWAInstallPrompt = lazyLoad(() => import('./components/PWAInstallPrompt'));
const MobileBottomNavigation = lazyLoad(() => import('./components/MobileBottomNavigation'));
const OsoahiaButton = lazyLoad(() => import('./components/OsoahiaButton'));
const NotificationToastContainer = lazyLoad(() => import('./components/NotificationToast').then(m => ({ default: m.NotificationToastContainer })));
const WalletEducation = lazyLoad(() => import('./components/EscrowEducation'));
const CartToast = lazyLoad(() => import('./components/CartToast'));
// OnboardingFlow removed - causing routing issues
const CacheClearButton = lazyLoad(() => import('./components/CacheClearButton'));
const NetworkStatusIndicator = lazyLoad(() => import('./components/NetworkStatusIndicator'));

// Critical pages - Direct imports for reliable routing
import Products from './pages/Products';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import EnhancedCheckout from './pages/EnhancedCheckout';
const Dashboard = lazyLoad(() => import('./pages/Dashboard'));
const Buyer = lazyLoad(() => import('./pages/Buyer'));
const EnhancedBuyer = lazyLoad(() => import('./pages/EnhancedBuyer'));
const ProfileSetup = lazyLoad(() => import('./pages/ProfileSetup'));
const HowWalletWorks = lazyLoad(() => import('./components/HowWalletWorks'));
const Categories = lazyLoad(() => import('./pages/Categories'));
const Wallet = lazyLoad(() => import('./pages/Wallet'));
const Messages = lazyLoad(() => import('./pages/Messages'));
const LogisticsPricingDemo = lazyLoad(() => import('./pages/LogisticsPricingDemo'));

// Admin pages (separate chunk)
const Admin = lazyLoad(() => import('./pages/Admin'));
const AdminDashboard = lazyLoad(() => import('./pages/AdminDashboard'));
const AdminSetup = lazyLoad(() => import('./pages/AdminSetup'));
const AdminLogin = lazyLoad(() => import('./pages/AdminLogin'));
const PricingAdminPanel = lazyLoad(() => import('./components/PricingAdminPanel'));

// Vendor pages (separate chunk)
const Vendor = lazyLoad(() => import('./pages/Vendor'));
const BecomeVendor = lazyLoad(() => import('./pages/BecomeVendor'));
const StoreManager = lazyLoad(() => import('./components/StoreManager'));

// Logistics pages (separate chunk)
import Logistics from './pages/Logistics';
const BecomeLogistics = lazyLoad(() => import('./pages/BecomeLogistics'));
const LogisticsTrackingManager = lazyLoad(() => import('./components/LogisticsTrackingManager'));

// Tracking pages (separate chunk)
const Tracking = lazyLoad(() => import('./pages/Tracking'));
const TrackingInterface = lazyLoad(() => import('./components/TrackingInterface'));
const EnhancedTrackingStatus = lazyLoad(() => import('./components/EnhancedTrackingStatus'));

// Help page
const Help = lazyLoad(() => import('./pages/Help'));

// Auth pages
const ForgotPassword = lazyLoad(() => import('./pages/ForgotPassword'));

// Test/Development pages (separate chunk for production builds)
const FlutterwaveTest = lazyLoad(() => import('./pages/FlutterwaveTest'));
const FunctionTest = lazyLoad(() => import('./pages/FunctionTest'));
const CloudTest = lazyLoad(() => import('./pages/CloudTest'));
const ModalTest = lazyLoad(() => import('./pages/ModalTest'));
const StockTest = lazyLoad(() => import('./pages/StockTest'));
const StockSyncTest = lazyLoad(() => import('./pages/StockSyncTest'));
const AuthFlowTest = lazyLoad(() => import('./pages/AuthFlowTest'));
const ProductStoreAssignment = lazyLoad(() => import('./components/ProductStoreAssignment'));
const StoreDisplay = lazyLoad(() => import('./components/StoreDisplay'));
const UnifiedStore = lazyLoad(() => import('./components/UnifiedStore'));
const StorePage = lazyLoad(() => import('./components/StorePage'));
// const UnifiedVendorStore = lazyWithRetry(() => import('./components/UnifiedVendorStore')); // Removed - causing errors
const TrackingSystemTest = lazyLoad(() => import('./pages/TrackingSystemTest'));
const LogisticsTrackingTest = lazyLoad(() => import('./pages/LogisticsTrackingTest'));
const PricingTest = lazyLoad(() => import('./pages/PricingTest'));
const ProductDebug = lazyLoad(() => import('./pages/ProductDebug'));
// const GoogleMapsTest = lazyWithRetry(() => import('./pages/GoogleMapsTest')); // Disabled

// Admin Route Protection Component - Simplified (No Initialization)
const AdminRoute = ({ children }) => {
  const { userProfile, currentUser, loading } = useAuth();
  
  // Debug logging
  console.log('🔍 AdminRoute Debug:', {
    currentUser: !!currentUser,
    userProfile: !!userProfile,
    role: userProfile?.role,
    loading
  });
  
  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }
  
  // Quick redirect without loading screens
  if (!currentUser) {
    console.log('❌ AdminRoute: No current user, redirecting to login');
    return <Navigate to="/admin/login" replace />;
  }
  
  if (!userProfile || userProfile.role !== 'admin') {
    console.log('❌ AdminRoute: User not admin, redirecting to login', {
      hasProfile: !!userProfile,
      role: userProfile?.role
    });
    return <Navigate to="/admin/login" replace />;
  }
  
  console.log('✅ AdminRoute: Access granted');
  return children;
};

const AppContent = () => {
  const { showEscrowEducation, setShowEscrowEducation, newUserType } = useAuth();

  return (
    <CartProvider>
      <LanguageProvider>
        <MessagingProvider>
          <NotificationProvider>
            <Router>
              <ScrollToTop />
              <ErrorBoundary componentName="Router">
                <div className="min-h-screen">
                  <Suspense fallback={<ComponentLoadingSpinner />}>
                    <Navbar />
                  </Suspense>
                  <Suspense fallback={null}>
                    <PWAInstallPrompt />
                  </Suspense>
                  <main>
                    <AppRoutes />
                  </main>
                  <Suspense fallback={null}>
                    <MobileBottomNavigation />
                  </Suspense>
                  <Suspense fallback={null}>
                    <NotificationToastContainer />
                  </Suspense>
                  <Suspense fallback={null}>
                    <CartToast />
                  </Suspense>
                  
                  {/* Wallet Education Modal */}
                  {showEscrowEducation && (
                    <Suspense fallback={null}>
                      <WalletEducation 
                        userType={newUserType}
                        onComplete={() => setShowEscrowEducation(false)}
                      />
                    </Suspense>
                  )}
                  
                  {/* Osoahia AI Assistant */}
                  <Suspense fallback={null}>
                    <OsoahiaButton />
                  </Suspense>
                  
                  {/* Network Status Indicator */}
                  <Suspense fallback={null}>
                    <NetworkStatusIndicator />
                  </Suspense>
                  
                  {/* Performance Monitor (Development Only) */}
                  <PerformanceMonitor />
                </div>
              </ErrorBoundary>
            </Router>
          </NotificationProvider>
        </MessagingProvider>
      </LanguageProvider>
    </CartProvider>
  );
};

// Preload critical routes with performance optimization
const preloadCriticalRoutes = () => {
  // Preload commonly visited routes
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Preload product pages
        import('./pages/Products').catch(err => console.warn('Preload failed:', err));
        import('./pages/Login').catch(err => console.warn('Preload failed:', err));
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        import('./pages/Products').catch(err => console.warn('Preload failed:', err));
        import('./pages/Login').catch(err => console.warn('Preload failed:', err));
      }, 3000);
    }
  }
};

// ScrollToTop component to ensure page scrolls to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};


// Component that wraps Routes (must be inside Router)
const AppRoutes = () => {
  return (
    <AnimatedPage>
    <Routes>
        <Route path="/" element={<HomeNew />} />
      <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/enhanced-checkout" element={<EnhancedCheckout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={
          <Suspense fallback={<RouteLoadingSpinner route="default" />}>
            <ForgotPassword />
          </Suspense>
        } />
      <Route path="/how-wallet-works" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <HowWalletWorks />
        </Suspense>
      } />
      <Route path="/categories" element={
        <Suspense fallback={<RouteLoadingSpinner route="categories" />}>
          <Categories />
        </Suspense>
      } />
      <Route path="/tracking" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <Tracking />
        </Suspense>
      } />
      <Route path="/help" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <Help />
        </Suspense>
      } />
      <Route path="/profile" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <ProfileSetup />
        </Suspense>
      } />
      <Route path="/wallet" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <Wallet />
        </Suspense>
      } />
      <Route path="/messages" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <Messages />
        </Suspense>
      } />
      <Route path="/logistics-pricing" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <LogisticsPricingDemo />
        </Suspense>
      } />
      <Route path="/admin/login" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <AdminLogin />
        </Suspense>
      } />
      <Route path="/admin" element={
        <AdminRoute>
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <Admin />
        </Suspense>
        </AdminRoute>
      } />
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="/vendor" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <Vendor />
        </Suspense>
      } />
      <Route path="/buyer" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <Buyer />
        </Suspense>
      } />
      <Route path="/enhanced-buyer" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <EnhancedBuyer />
        </Suspense>
      } />
      <Route path="/logistics" element={<Logistics />} />
      <Route path="/store/:storeSlug" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <StorePage />
        </Suspense>
      } />
      <Route path="/become-vendor" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <BecomeVendor />
        </Suspense>
      } />
      <Route path="/become-logistics" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <BecomeLogistics />
        </Suspense>
      } />
      <Route path="/test-auth-flow" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <AuthFlowTest />
        </Suspense>
      } />
      <Route path="/test-stock" element={
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
          <StockTest />
        </Suspense>
      } />
      <Route path="/logo-upload" element={<LogoUpload />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </AnimatedPage>
  );
};


function App() {
  useEffect(() => {
    // Validate environment variables
    try {
      validateEnvironment()
    } catch (error) {
      console.error('Environment validation failed:', error)
    }

    // Set up global error handling
    setupGlobalErrorHandling()
    
    // Preload critical components for better performance
    preloadCriticalComponents()
    
    // Analyze bundle size
    analyzeBundle()
    
    // Defer network monitoring to improve LCP
    const initNetworkMonitoring = () => {
      console.log('🌐 Network monitoring initialized');
      console.log('📊 Connection status:', networkManager.isOnline ? 'Online' : 'Offline');
      
      // Log connection info if available
      const connectionInfo = networkManager.getConnectionInfo();
      if (connectionInfo) {
        console.log('📊 Connection info:', connectionInfo);
      }
      
      // Set up network status listener
      const removeListener = networkManager.addListener((event, data) => {
        if (event === 'online') {
          console.log('✅ Network restored - application fully functional');
        } else if (event === 'offline') {
          console.warn('⚠️ Network lost - using cached data');
        }
      });
      
      return removeListener;
    };

    // Initialize network monitoring after a delay to improve LCP
    let removeListener;
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        removeListener = initNetworkMonitoring();
      });
    } else {
      setTimeout(() => {
        removeListener = initNetworkMonitoring();
      }, 2000);
    }
    
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [])

  return (
    <ErrorBoundary componentName="App">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
