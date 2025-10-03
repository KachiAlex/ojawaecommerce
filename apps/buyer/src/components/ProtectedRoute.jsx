import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const { saveIntendedDestination } = useCart();
  const location = useLocation();
  
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
  
  return children;
};

export default ProtectedRoute;
