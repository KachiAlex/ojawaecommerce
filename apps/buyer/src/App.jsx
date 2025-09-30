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
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import MobileBottomNavigation from './components/MobileBottomNavigation';
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
import OsoahiaButton from './components/OsoahiaButton';
import { NotificationToastContainer } from './components/NotificationToast';
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

// Admin Route Protection Component
const AdminRoute = ({ children }) => {
  const { userProfile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!userProfile || userProfile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
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

// Component to handle onboarding flow
const OnboardingWrapper = () => {
  const { showEscrowEducation, setShowEscrowEducation, newUserType } = useAuth();
  const { isCompleted, isLoading } = useOnboarding();

  // Show onboarding if not completed and not loading
  if (!isCompleted() && !isLoading) {
    return <OnboardingFlow />;
  }

  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <PWAInstallPrompt />
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
        </Routes>
        </Suspense>
        </main>
        <MobileBottomNavigation />
        <NotificationToastContainer />
        
        {/* Wallet Education Modal */}
        {showEscrowEducation && (
          <WalletEducation 
            userType={newUserType}
            onComplete={() => setShowEscrowEducation(false)}
          />
        )}
        
        {/* Osoahia AI Assistant */}
        <OsoahiaButton />
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
