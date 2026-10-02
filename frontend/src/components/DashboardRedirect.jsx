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

    // Determine primary dashboard based on role and preference
    const role = userProfile?.role || currentUser?.role;
    const hasAdminAccess = role === 'admin' || userProfile?.isAdmin || currentUser?.isAdmin;
    const hasVendorAccess = role === 'vendor' || userProfile?.isVendor || currentUser?.isVendor;
    const hasLogisticsAccess = role === 'logistics' || userProfile?.isLogisticsPartner || currentUser?.isLogisticsPartner;

    console.log('👤 DashboardRedirect: User profile:', {
      uid: currentUser.uid,
      email: currentUser.email,
      role,
      isVendor: userProfile?.isVendor || currentUser?.isVendor,
      isAdmin: userProfile?.isAdmin || currentUser?.isAdmin,
      isLogisticsPartner: userProfile?.isLogisticsPartner || currentUser?.isLogisticsPartner
    });

    let primaryDashboard =
      localStorage.getItem('preferredDashboard') ||
      sessionStorage.getItem('preferredDashboard') ||
      'buyer'; // Default landing page

    if (!localStorage.getItem('preferredDashboard') && !sessionStorage.getItem('preferredDashboard')) {
      if (hasAdminAccess) {
        primaryDashboard = 'admin';
        console.log('🎯 DashboardRedirect: Redirecting to ADMIN dashboard');
      } else if (hasVendorAccess) {
        primaryDashboard = 'vendor';
        console.log('🎯 DashboardRedirect: Redirecting to VENDOR dashboard');
      } else if (hasLogisticsAccess) {
        primaryDashboard = 'logistics';
        console.log('🎯 DashboardRedirect: Redirecting to LOGISTICS dashboard');
      } else {
        console.log('🎯 DashboardRedirect: Defaulting to BUYER dashboard');
      }
    } else {
      console.log('🎯 DashboardRedirect: Using stored preferred dashboard', primaryDashboard);
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

