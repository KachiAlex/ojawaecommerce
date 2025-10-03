import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { MessagingProvider } from './contexts/MessagingContext';
import { LanguageProvider } from './contexts/LanguageContext';
import WalletEducation from './components/EscrowEducation';
import OnboardingFlow from './components/OnboardingFlow';
const Navbar = lazy(() => import('./components/Navbar'));
import ErrorBoundary from './components/ErrorBoundary';
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'));
const MobileBottomNavigation = lazy(() => import('./components/MobileBottomNavigation'));
import { setupGlobalErrorHandling } from './utils/errorLogger';
import { validateEnvironment } from './config/env';
import './utils/clearFlutterwaveScripts';
import Home from './pages/Home';
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
import ProtectedRoute from './components/ProtectedRoute';
const OsoahiaButton = lazy(() => import('./components/OsoahiaButton'));
const NotificationToastContainer = lazy(() => import('./components/NotificationToast').then(m => ({ default: m.NotificationToastContainer })));
import './App.css';
const Buyer = lazy(() => import('./pages/Buyer'));
const EnhancedBuyer = lazy(() => import('./pages/EnhancedBuyer'));
const Vendor = lazy(() => import('./pages/Vendor'));
const Logistics = lazy(() => import('./pages/Logistics'));
const Tracking = lazy(() => import('./pages/Tracking'));
const HowWalletWorks = lazy(() => import('./components/HowWalletWorks'));
const Categories = lazy(() => import('./pages/Categories'));
const Wallet = lazy(() => import('./pages/Wallet'));
const BecomeVendor = lazy(() => import('./pages/BecomeVendor'));
const BecomeLogistics = lazy(() => import('./pages/BecomeLogistics'));
const AdminSetup = lazy(() => import('./pages/AdminSetup'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const FlutterwaveTest = lazy(() => import('./pages/FlutterwaveTest'));
const FunctionTest = lazy(() => import('./pages/FunctionTest'));
const CloudTest = lazy(() => import('./pages/CloudTest'));
const ModalTest = lazy(() => import('./pages/ModalTest'));
const StockTest = lazy(() => import('./pages/StockTest'));
const StockSyncTest = lazy(() => import('./pages/StockSyncTest'));
const AuthFlowTest = lazy(() => import('./pages/AuthFlowTest'));
const StoreManager = lazy(() => import('./components/StoreManager'));
const ProductStoreAssignment = lazy(() => import('./components/ProductStoreAssignment'));
const TrackingInterface = lazy(() => import('./components/TrackingInterface'));
const StoreDisplay = lazy(() => import('./components/StoreDisplay'));
const TrackingSystemTest = lazy(() => import('./pages/TrackingSystemTest'));
const LogisticsTrackingManager = lazy(() => import('./components/LogisticsTrackingManager'));
const EnhancedTrackingStatus = lazy(() => import('./components/EnhancedTrackingStatus'));
const LogisticsTrackingTest = lazy(() => import('./pages/LogisticsTrackingTest'));

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
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <Suspense fallback={null}>
          <PWAInstallPrompt />
        </Suspense>
        <main>
        <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>}>
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
                <Wallet />
              </ProtectedRoute>
            } 
          />
          <Route path="/cart" element={<Cart />} />
          <Route 
            path="/checkout" 
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
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
              <Route path="/buyer" element={<Buyer />} />
              <Route path="/enhanced-buyer" element={<EnhancedBuyer />} />
              <Route path="/vendor" element={<Vendor />} />
              <Route path="/logistics" element={<Logistics />} />
              <Route path="/tracking" element={<Tracking />} />
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
