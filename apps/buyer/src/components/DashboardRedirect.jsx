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
    if (loading) {
      console.log('🔄 DashboardRedirect: Still loading...');
      return;
    }

    if (!currentUser) {
      console.log('❌ DashboardRedirect: No current user, redirecting to login');
      navigate('/login');
      return;
    }

    console.log('👤 DashboardRedirect: User profile:', {
      uid: currentUser.uid,
      email: currentUser.email,
      role: userProfile?.role,
      isVendor: userProfile?.isVendor,
      isAdmin: userProfile?.isAdmin,
      isLogisticsPartner: userProfile?.isLogisticsPartner
    });

    // Determine primary dashboard based on role
    let primaryDashboard = 'buyer'; // Default

    if (userProfile?.role === 'admin' || userProfile?.isAdmin) {
      primaryDashboard = 'admin';
      console.log('🎯 DashboardRedirect: Redirecting to ADMIN dashboard');
    } else if (userProfile?.role === 'vendor' || userProfile?.isVendor) {
      primaryDashboard = 'vendor';
      console.log('🎯 DashboardRedirect: Redirecting to VENDOR dashboard');
    } else if (userProfile?.role === 'logistics' || userProfile?.isLogisticsPartner) {
      primaryDashboard = 'logistics';
      console.log('🎯 DashboardRedirect: Redirecting to LOGISTICS dashboard');
    } else {
      console.log('🎯 DashboardRedirect: Defaulting to BUYER dashboard');
    }

    console.log('🚀 DashboardRedirect: Navigating to /', primaryDashboard);
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

