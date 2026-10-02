import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const getDashboardUrl = (userType) => {
  const dashboardMap = {
    'buyer': '/buyer',
    'vendor': '/vendor',
    'logistics': '/logistics',
    'admin': '/admin'
  };
  return dashboardMap[userType] || '/dashboard';
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleGoogleCallback } = useAuth();
  const { getIntendedDestination } = useCart();
  const processedRef = useRef(false);
  const [status, setStatus] = useState('Processing Google sign-in...');

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const params = new URLSearchParams(location.search);

    const error = params.get('error');
    if (error) {
      const message = params.get('message') || 'Google sign-in failed';
      navigate(`/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(message)}`, { replace: true });
      return;
    }

    const token = params.get('token');
    if (!token) {
      navigate('/login?error=no_token&message=No+auth+token+received', { replace: true });
      return;
    }

    const callbackParams = {
      token,
      uid: params.get('uid'),
      email: params.get('email'),
      displayName: params.get('displayName'),
      role: params.get('role'),
      userType: params.get('userType'),
    };

    (async () => {
      try {
        const user = await handleGoogleCallback(callbackParams);
        const userType = sessionStorage.getItem('google_signin_usertype') || user?.userType || user?.role || 'buyer';
        sessionStorage.removeItem('google_signin_usertype');
        sessionStorage.removeItem('google_signin_timestamp');
        const intendedDestination = getIntendedDestination();
        const dashboardUrl = getDashboardUrl(userType);
        setStatus('Sign-in successful! Redirecting...');
        navigate(intendedDestination?.path || dashboardUrl, { replace: true });
      } catch (err) {
        console.error('OAuth callback error:', err);
        navigate(`/login?error=oauth_callback_failed&message=${encodeURIComponent(err.message || 'Unknown error')}`, { replace: true });
      }
    })();
  }, [location.search, navigate, handleGoogleCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
