import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { MessagingProvider } from './contexts/MessagingContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import { RouteLoadingSpinner, ComponentLoadingSpinner } from './components/OptimizedLoadingSpinner';
import PerformanceMonitor from './components/PerformanceMonitor';
import { setupGlobalErrorHandling } from './utils/errorLogger';
import { validateEnvironment } from './config/env';
import './utils/clearFlutterwaveScripts';
import './App.css';

// Core pages (loaded immediately)
import Home from './pages/Home';
import DashboardRedirect from './components/DashboardRedirect';

// Lazy load components with better chunking
const Navbar = lazy(() => import('./components/Navbar'));
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'));
const MobileBottomNavigation = lazy(() => import('./components/MobileBottomNavigation'));
const OsoahiaButton = lazy(() => import('./components/OsoahiaButton'));
const NotificationToastContainer = lazy(() => import('./components/NotificationToast').then(m => ({ default: m.NotificationToastContainer })));
const WalletEducation = lazy(() => import('./components/EscrowEducation'));
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow'));

// Customer-facing pages
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Buyer = lazy(() => import('./pages/Buyer'));
const EnhancedBuyer = lazy(() => import('./pages/EnhancedBuyer'));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'));
const HowWalletWorks = lazy(() => import('./components/HowWalletWorks'));
const Categories = lazy(() => import('./pages/Categories'));
const Wallet = lazy(() => import('./pages/Wallet'));

// Admin pages (separate chunk)
const Admin = lazy(() => import('./pages/Admin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminSetup = lazy(() => import('./pages/AdminSetup'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const PricingAdminPanel = lazy(() => import('./components/PricingAdminPanel'));

// Vendor pages (separate chunk)
const Vendor = lazy(() => import('./pages/Vendor'));
const BecomeVendor = lazy(() => import('./pages/BecomeVendor'));
const StoreManager = lazy(() => import('./components/StoreManager'));

// Logistics pages (separate chunk)
const Logistics = lazy(() => import('./pages/Logistics'));
const BecomeLogistics = lazy(() => import('./pages/BecomeLogistics'));
const LogisticsTrackingManager = lazy(() => import('./components/LogisticsTrackingManager'));

// Tracking pages (separate chunk)
const Tracking = lazy(() => import('./pages/Tracking'));
const TrackingInterface = lazy(() => import('./components/TrackingInterface'));
const EnhancedTrackingStatus = lazy(() => import('./components/EnhancedTrackingStatus'));

// Test/Development pages (separate chunk for production builds)
const FlutterwaveTest = lazy(() => import('./pages/FlutterwaveTest'));
const FunctionTest = lazy(() => import('./pages/FunctionTest'));
const CloudTest = lazy(() => import('./pages/CloudTest'));
const ModalTest = lazy(() => import('./pages/ModalTest'));
const StockTest = lazy(() => import('./pages/StockTest'));
const StockSyncTest = lazy(() => import('./pages/StockSyncTest'));
const AuthFlowTest = lazy(() => import('./pages/AuthFlowTest'));
const ProductStoreAssignment = lazy(() => import('./components/ProductStoreAssignment'));
const StoreDisplay = lazy(() => import('./components/StoreDisplay'));
const TrackingSystemTest = lazy(() => import('./pages/TrackingSystemTest'));
const LogisticsTrackingTest = lazy(() => import('./pages/LogisticsTrackingTest'));
const PricingTest = lazy(() => import('./pages/PricingTest'));
const ProductDebug = lazy(() => import('./pages/ProductDebug'));
const GoogleMapsTest = lazy(() => import('./pages/GoogleMapsTest'));

// Admin Route Protection Component
const AdminRoute = ({ children }) => {
  const { userProfile, loading, currentUser } = useAuth();
  
  // Debug logging
  console.log('AdminRoute - loading:', loading);
  console.log('AdminRoute - currentUser:', currentUser);
  console.log('AdminRoute - userProfile:', userProfile);
  console.log('AdminRoute - role:', userProfile?.role);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    console.log('AdminRoute - No current user, redirecting to admin login');
    return <Navigate to="/admin/login" replace />;
  }
  
  if (!userProfile) {
    console.log('AdminRoute - No user profile, showing loading');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (userProfile.role !== 'admin') {
    console.log('AdminRoute - User is not admin, showing access denied');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have admin privileges.</p>
          <p className="text-sm text-gray-500">Current role: {userProfile?.role || 'No role'}</p>
          <p className="text-sm text-gray-500">User ID: {currentUser?.uid}</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.href = '/admin/login'}
              className="block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Admin Login
            </button>
            <button 
              onClick={() => window.location.href = '/admin-setup'}
              className="block w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Make Me Admin
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="block w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  console.log('AdminRoute - User is admin, showing dashboard');
  return children;
};

const AppContent = () => {
  const { showEscrowEducation, setShowEscrowEducation, newUserType } = useAuth();

  return (
    <CartProvider>
      <LanguageProvider>
        <MessagingProvider>
          <NotificationProvider>
            <OnboardingProvider>
              <OnboardingWrapper />
            </OnboardingProvider>
          </NotificationProvider>
        </MessagingProvider>
      </LanguageProvider>
    </CartProvider>
  );
};

// Component to handle onboarding flow (disabled by default; always render app routes)
const OnboardingWrapper = () => {
  const { currentUser, showEscrowEducation, setShowEscrowEducation, newUserType } = useAuth();
  // const { isCompleted, isLoading } = useOnboarding();

  return (
    <Router>
      <div className="min-h-screen">
        <Suspense fallback={<ComponentLoadingSpinner />}>
          <Navbar />
        </Suspense>
        <Suspense fallback={null}>
          <PWAInstallPrompt />
        </Suspense>
        <main>
        <Suspense fallback={<RouteLoadingSpinner route="default" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/how-wallet-works" element={<HowWalletWorks />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/how-wallet-works" element={<HowWalletWorks />} />
          <Route path="/categories" element={<Categories />} />
          <Route 
            path="/wallet" 
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteLoadingSpinner route="wallet" />}>
                  <Wallet />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          <Route path="/cart" element={
            <Suspense fallback={<RouteLoadingSpinner route="default" />}>
              <Cart />
            </Suspense>
          } />
          <Route 
            path="/checkout" 
            element={
              <ProtectedRoute requireCompleteProfile={true}>
                <Suspense fallback={<RouteLoadingSpinner route="checkout" />}>
                  <Checkout />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={
            <Suspense fallback={<RouteLoadingSpinner route="default" />}>
              <Login />
            </Suspense>
          } />
          <Route path="/register" element={
            <Suspense fallback={<RouteLoadingSpinner route="default" />}>
              <Register />
            </Suspense>
          } />
          <Route 
            path="/profile-setup" 
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteLoadingSpinner route="default" />}>
                  <ProfileSetup />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteLoadingSpinner route="default" />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <Suspense fallback={<RouteLoadingSpinner route="admin" />}>
                  <Admin />
                </Suspense>
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin-dashboard" 
            element={<Navigate to="/admin" replace />} 
          />
          <Route path="/admin-setup" element={<AdminSetup />} />
          <Route path="/admin-test" element={<AdminDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
              {/* Smart Dashboard Route - redirects to user's primary dashboard */}
              <Route path="/dashboard" element={<DashboardRedirect />} />
              
              <Route path="/buyer" element={
                <Suspense fallback={<RouteLoadingSpinner route="default" />}>
                  <EnhancedBuyer />
                </Suspense>
              } />
              <Route path="/enhanced-buyer" element={
                <Suspense fallback={<RouteLoadingSpinner route="default" />}>
                  <EnhancedBuyer />
                </Suspense>
              } />
              <Route path="/vendor" element={
                <RoleGuard requiredRole="vendor">
                  <Suspense fallback={<RouteLoadingSpinner route="vendor" />}>
                    <Vendor />
                  </Suspense>
                </RoleGuard>
              } />
              <Route path="/logistics" element={
                <RoleGuard requiredRole="logistics">
                  <Suspense fallback={<RouteLoadingSpinner route="logistics" />}>
                    <Logistics />
                  </Suspense>
                </RoleGuard>
              } />
              <Route path="/tracking" element={
                <Suspense fallback={<RouteLoadingSpinner route="tracking" />}>
                  <Tracking />
                </Suspense>
              } />
              <Route 
                path="/become-vendor" 
                element={
                  <ProtectedRoute>
                    <BecomeVendor />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/become-logistics" 
                element={
                  <ProtectedRoute>
                    <BecomeLogistics />
                  </ProtectedRoute>
                } 
              />
              <Route path="/onboarding" element={<OnboardingFlow />} />
          <Route path="/flutterwave-test" element={<FlutterwaveTest />} />
          <Route path="/function-test" element={<FunctionTest />} />
          <Route path="/cloud-test" element={<CloudTest />} />
          <Route path="/modal-test" element={<ModalTest />} />
          <Route path="/stock-test" element={<StockTest />} />
          <Route path="/stock-sync-test" element={<StockSyncTest />} />
          <Route path="/auth-flow-test" element={<AuthFlowTest />} />
          <Route path="/store-manager" element={<StoreManager />} />
          <Route path="/product-assignment" element={<ProductStoreAssignment />} />
          <Route path="/tracking" element={<TrackingInterface />} />
          <Route path="/store/:storeId" element={<StoreDisplay />} />
          <Route path="/tracking-system-test" element={<TrackingSystemTest />} />
          <Route path="/logistics-tracking" element={<LogisticsTrackingManager />} />
          <Route path="/tracking/:orderId" element={<EnhancedTrackingStatus />} />
          <Route path="/tracking-by-number/:trackingNumber" element={<EnhancedTrackingStatus />} />
          <Route path="/logistics-tracking-test" element={<LogisticsTrackingTest />} />
          <Route path="/pricing-test" element={<PricingTest />} />
          <Route path="/product-debug" element={<ProductDebug />} />
          <Route path="/google-maps-test" element={
            <Suspense fallback={<RouteLoadingSpinner route="test" />}>
              <GoogleMapsTest />
            </Suspense>
          } />
          <Route 
            path="/admin/pricing" 
            element={
              <AdminRoute>
                <PricingAdminPanel />
              </AdminRoute>
            } 
          />
        </Routes>
        </Suspense>
        </main>
        <Suspense fallback={null}>
          <MobileBottomNavigation />
        </Suspense>
        <Suspense fallback={null}>
          <NotificationToastContainer />
        </Suspense>
        
        {/* Wallet Education Modal */}
        {showEscrowEducation && (
          <WalletEducation 
            userType={newUserType}
            onComplete={() => setShowEscrowEducation(false)}
          />
        )}
        
        {/* Osoahia AI Assistant */}
        <Suspense fallback={null}>
          <OsoahiaButton />
        </Suspense>
        
        {/* Performance Monitor (Development Only) */}
        <PerformanceMonitor />
      </div>
    </Router>
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
