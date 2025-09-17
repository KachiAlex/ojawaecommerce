import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  if (!currentUser) {
    // Store the intended destination for redirect after login
    return <Navigate to="/login" state={{ from: location, message: 'Please sign in to complete your purchase with escrow protection.' }} />;
  }
  
  return children;
};

export default ProtectedRoute;
