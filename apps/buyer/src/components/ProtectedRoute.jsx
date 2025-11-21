import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, requireCompleteProfile = false }) => {
  const { currentUser, isProfileComplete, loading } = useAuth();
  const { saveIntendedDestination } = useCart();
  const location = useLocation();
  
  // Wait for auth to load
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    // Save the intended destination and cart state
    saveIntendedDestination(location.pathname);
    
    // Determine appropriate message based on the route
    let message = 'Please sign in to continue.';
    if (location.pathname === '/checkout') {
      message = 'Please sign in to complete your purchase with wallet protection.';
    } else if (location.pathname.startsWith('/products/')) {
      message = 'Please sign in to add this product to your cart and complete your purchase.';
    }
    
    return <Navigate to="/login" state={{ from: location, message }} />;
  }
  
  // Check if profile completion is required and if profile is incomplete
  if (requireCompleteProfile && !isProfileComplete()) {
    // Don't redirect if already on profile setup page
    if (location.pathname !== '/profile-setup') {
      return <Navigate to="/profile-setup" state={{ from: location.pathname }} replace />;
    }
  }
  
  return children;
};

export default ProtectedRoute;
