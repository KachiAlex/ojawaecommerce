import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Navigate, useLocation } from 'react-router-dom';

const verificationBypassed = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BYPASS_EMAIL_VERIFICATION === 'true';

const ProtectedRoute = ({ children, requireCompleteProfile = false, requireVerifiedEmail = false }) => {
  const { currentUser, isProfileComplete, loading, refreshUser, sendVerificationEmail, lastVerificationEmailSentAt } = useAuth();
  const { saveIntendedDestination } = useCart();
  const location = useLocation();
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  
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

  const handleResendVerification = async () => {
    if (checkingVerification) return;
    setCheckingVerification(true);
    setVerificationError('');
    try {
      await sendVerificationEmail();
      setVerificationSent(true);
    } catch (error) {
      console.error('Error resending verification email:', error);
      setVerificationError(error.message || 'Failed to send verification email. Please try again later.');
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleRefreshVerification = async () => {
    setCheckingVerification(true);
    setVerificationError('');
    try {
      await refreshUser();
    } catch (error) {
      console.error('Error refreshing user:', error);
      setVerificationError(error.message || 'Failed to refresh verification status.');
    } finally {
      setCheckingVerification(false);
    }
  };

  const canResendVerification = () => {
    if (!lastVerificationEmailSentAt) return true;
    return Date.now() - new Date(lastVerificationEmailSentAt).getTime() > 60000;
  };

  useEffect(() => {
    if (requireVerifiedEmail && !verificationBypassed && currentUser && !currentUser.emailVerified) {
      saveIntendedDestination(location.pathname);
    }
  }, [requireVerifiedEmail, currentUser, location.pathname, saveIntendedDestination]);

  if (requireVerifiedEmail && !verificationBypassed && currentUser && !currentUser.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-2xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5l-7.5 6.75L6 10.5M3 6.75h18v10.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 17.25V6.75z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Verify your email to continue</h2>
            <p className="text-gray-600 mb-4">
              We sent a confirmation link to <strong>{currentUser.email}</strong>. Please verify your email to access this feature.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Verified accounts help us keep your wallet safe and ensure vendors can trust every order.
            </p>
          </div>

          {verificationError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {verificationError}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleRefreshVerification}
              disabled={checkingVerification}
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {checkingVerification ? 'Checking...' : 'I have verified my email'}
            </button>
            <button
              onClick={handleResendVerification}
              disabled={checkingVerification || !canResendVerification()}
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-emerald-200 text-sm font-medium rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {verificationSent ? 'Verification email sent!' : 'Resend verification email'}
            </button>
            <Link
              to="/login"
              state={{ from: location }}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
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
