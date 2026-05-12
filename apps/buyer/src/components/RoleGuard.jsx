import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RoleAuthModal from './RoleAuthModal';

/**
 * RoleGuard - Protects routes that require specific roles
 * If user doesn't have the required role, shows auth modal to create/sign in
 */
const RoleGuard = ({ children, requiredRole }) => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = () => {
      if (!currentUser) {
        // Not logged in, redirect to login
        navigate('/login');
        return;
      }

      // Check if user has the required role
      let userHasRole = false;

      switch (requiredRole) {
        case 'buyer':
          // Everyone can be a buyer
          userHasRole = true;
          break;
        case 'vendor':
          userHasRole = userProfile?.role === 'vendor' || userProfile?.isVendor || false;
          break;
        case 'logistics':
          userHasRole = userProfile?.role === 'logistics' || userProfile?.isLogisticsPartner || false;
          break;
        case 'admin':
          userHasRole = userProfile?.role === 'admin' || userProfile?.isAdmin || false;
          break;
        default:
          userHasRole = false;
      }

      if (userHasRole) {
        setHasAccess(true);
        setChecking(false);
      } else {
        // User doesn't have access, show auth modal
        setHasAccess(false);
        setChecking(false);
        setShowAuthModal(true);
      }
    };

    checkAccess();
  }, [currentUser, userProfile, requiredRole, navigate]);

  const handleAuthSuccess = (role) => {
    setShowAuthModal(false);
    setHasAccess(true);
    // Refresh the page to load with new role
    window.location.reload();
  };

  const handleAuthCancel = () => {
    setShowAuthModal(false);
    // Redirect to home or their primary dashboard
    const primaryDashboard = userProfile?.role === 'vendor' || userProfile?.isVendor
      ? '/vendor'
      : userProfile?.role === 'logistics' || userProfile?.isLogisticsPartner
      ? '/logistics'
      : '/buyer';
    navigate(primaryDashboard);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess && showAuthModal) {
    return (
      <RoleAuthModal
        role={requiredRole}
        onClose={handleAuthCancel}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  if (hasAccess) {
    return children;
  }

  return null;
};

export default RoleGuard;

