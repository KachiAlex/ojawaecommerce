import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * DashboardRedirect - Redirects to user's primary dashboard
 * Based on their role/account type
 */
const DashboardRedirect = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Determine primary dashboard based on role
    let primaryDashboard = 'buyer'; // Default

    if (userProfile?.role === 'admin' || userProfile?.isAdmin) {
      primaryDashboard = 'admin';
    } else if (userProfile?.role === 'vendor' || userProfile?.isVendor) {
      primaryDashboard = 'vendor';
    } else if (userProfile?.role === 'logistics' || userProfile?.isLogisticsPartner) {
      primaryDashboard = 'logistics';
    }

    navigate(`/${primaryDashboard}`, { replace: true });
  }, [currentUser, userProfile, loading, navigate]);

  // Show loading while determining redirect
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
};

export default DashboardRedirect;

