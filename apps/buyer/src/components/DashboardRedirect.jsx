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

    // Determine primary dashboard based on role and preference
    const hasAdminAccess = userProfile?.role === 'admin' || userProfile?.isAdmin;
    const hasVendorAccess = userProfile?.role === 'vendor' || userProfile?.isVendor;
    const hasLogisticsAccess = userProfile?.role === 'logistics' || userProfile?.isLogisticsPartner;

    let primaryDashboard =
      localStorage.getItem('preferredDashboard') ||
      sessionStorage.getItem('preferredDashboard') ||
      'buyer'; // Default landing page

    if (!localStorage.getItem('preferredDashboard') && !sessionStorage.getItem('preferredDashboard')) {
      if (hasAdminAccess) {
        // Admins should experience the buyer dashboard first, then manually switch if needed
        primaryDashboard = 'buyer';
        console.log('🎯 DashboardRedirect: Admin detected, defaulting to BUYER dashboard');
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

