import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import apiService from '../services/apiService';
import { config } from '../config/env';

const API_BASE = config.app.apiBaseUrl || '';

const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'authRefreshToken';

const resolveAuthField = (payload, field) => {
  if (!payload) return undefined;
  if (payload[field] !== undefined) return payload[field];
  if (payload.data?.[field] !== undefined) return payload.data[field];
  if (payload.data?.data?.[field] !== undefined) return payload.data.data[field];
  return undefined;
};

const persistAuthTokens = (payload) => {
  if (typeof window === 'undefined') return;
  try {
    const token = resolveAuthField(payload, 'token');
    const refreshToken = resolveAuthField(payload, 'refreshToken');

    if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.warn('Unable to persist auth tokens:', error);
  }
};

const clearAuthTokens = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem('firebaseIdToken'); // clear legacy key if present
  } catch (error) {
    console.warn('Unable to clear auth tokens:', error);
  }
};

const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.warn('Unable to read auth token from storage:', error);
    return null;
  }
};

const normalizeUserProfile = (value) => {
  if (!value || typeof value !== 'object') return value;
  const nestedProfile = value.profile && typeof value.profile === 'object' ? value.profile : {};
  const result = { ...value, ...nestedProfile, profile: nestedProfile };
  if (result.id && !result.uid) result.uid = result.id;
  return result;
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEscrowEducation, setShowEscrowEducation] = useState(false);
  const [newUserType, setNewUserType] = useState('buyer');

  const refreshUser = async () => {
    try {
      // Get token from localStorage
      const token = getStoredAuthToken();
      if (!token) return null;
      
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          // If endpoint doesn't work, just return null instead of mock data
          console.log('Auth/me endpoint not available');
          return null;
        }
        
        const data = await res.json();
        const userData = normalizeUserProfile(data?.data || data?.user || data || null);
        setCurrentUser(userData);
        setUserProfile(userData);
        return data;
      } catch (fetchError) {
        // Handle network errors gracefully - don't create mock data
        console.log('Network error during auth check');
        return null;
      }
    } catch (err) {
      console.log('Refresh user error:', err);
      return null;
    }
  };

  // Sign up function (REST-backed)
  const signup = async (email, password, userData) => {
    try {
      const res = await apiService.auth.signup(email, password, userData || {});
      persistAuthTokens(res);
      const userId = res?.id || res?.uid || res?.user?.id || res?.user?.uid;
      if (userId) {
        try {
          await apiService.wallet.createWallet(userId, userData?.userType || 'buyer');
        } catch (walletError) {
          console.error('Error creating wallet:', walletError);
        }
      }
      setNewUserType(userData?.userType || 'buyer');
      setShowEscrowEducation(true);
      return res;
    } catch (error) {
      throw error;
    }
  };

  // Sign in function (REST-backed)
  const signin = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Signing in user via REST:', email);
      const res = await apiService.auth.signin(email, password);
      persistAuthTokens(res);
      const user = res?.data?.user || res?.data || res?.user || res;
      if (!user) throw new Error('Invalid signin response from server');

      try {
        const rawProfile = res?.data?.profile || res?.profile || (user?.id || user?.uid ? await apiService.auth.getProfile(user.id || user.uid) : null);
        // Normalize: API responses may wrap user in { success: true, user: {...} } or { success: true, data: {...} }
        const profile = normalizeUserProfile(rawProfile?.user || rawProfile?.data || rawProfile);
        if (profile && (profile.role || profile.userType || profile.email)) {
          setUserProfile(profile);
          // Ensure userType is available in user object
          if (profile.userType && !user.userType) {
            user.userType = profile.userType;
          }
        } else if (res?.data?.role || user?.role) {
          // Fallback: build minimal profile from login response data (for PostgreSQL fallback users)
          const fallbackProfile = {
            role: res?.data?.role || user?.role,
            userType: res?.data?.role || user?.role,
            isVendor: (res?.data?.role || user?.role) === 'vendor',
            isAdmin: (res?.data?.role || user?.role) === 'admin',
            isLogisticsPartner: (res?.data?.role || user?.role) === 'logistics',
            email: user?.email || res?.data?.email
          };
          setUserProfile(fallbackProfile);
          if (!user.userType) {
            user.userType = fallbackProfile.userType;
          }
        }
      } catch (e) {
        console.warn('Unable to load user profile after signin:', e);
      }

      // Normalize: role -> userType so downstream code always works
      if (!user.userType && user.role) {
        user.userType = user.role;
      }

      // Normalize: id -> uid for PostgreSQL fallback users (Firebase uses uid)
      if (user.id && !user.uid) {
        user.uid = user.id;
      }

      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('❌ AuthContext: Sign in failed:', error);
      throw error;
    }
  };

  // Google Sign-In simplified to backend redirect
  const signInWithGoogle = async (userType = 'buyer') => {
    try {
      const validUserTypes = ['buyer', 'vendor', 'logistics', 'existing'];
      const normalizedUserType = validUserTypes.includes(userType) ? userType : 'buyer';
      sessionStorage.setItem('google_signin_usertype', normalizedUserType);
      sessionStorage.setItem('google_signin_timestamp', Date.now().toString());
      window.location.href = `/api/auth/google?userType=${encodeURIComponent(normalizedUserType)}`;
      return null;
    } catch (error) {
      console.error('❌ AuthContext: Google Sign-In redirect failed:', error);
      sessionStorage.removeItem('google_signin_usertype');
      sessionStorage.removeItem('google_signin_timestamp');
      throw error;
    }
  };

  // Google OAuth callback handler — processes token from URL params
  const handleGoogleCallback = async (params) => {
    try {
      const { token, uid, email, displayName, role, userType } = params;
      if (!token) throw new Error('No token in OAuth callback');

      persistAuthTokens({ token });
      setLoading(true);

      // Fetch full user profile from backend
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          const userData = normalizeUserProfile(data?.data || data?.user || data || null);
          if (userData) {
            setCurrentUser(userData);
            setUserProfile(userData);
            return userData;
          }
        }
      } catch (fetchError) {
        console.warn('Could not fetch user profile after OAuth, using params');
      }

      // Fallback: construct user from URL params
      const fallbackUser = normalizeUserProfile({
        id: uid,
        uid,
        email,
        displayName,
        role: role || userType || 'buyer',
        userType: userType || role || 'buyer',
        isEmailVerified: true,
      });
      setCurrentUser(fallbackUser);
      setUserProfile(fallbackUser);
      return fallbackUser;
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      clearAuthTokens();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const logout = async () => {
    try {
      // Clear sensitive encrypted items
      try {
        const { default: secureStorage } = await import('../utils/secureStorage');
        await Promise.all([
          secureStorage.removeItem('cart'),
          secureStorage.removeItem('enhanced_cart'),
          secureStorage.removeItem('payment_records'),
          secureStorage.removeItem('searchHistory')
        ]);
      } catch (_) {}

      try {
        await apiService.auth.signout();
      } finally {
        clearAuthTokens();
      }
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  };

  // Update user profile (via backend)
  const updateUserProfile = async (updates) => {
    try {
      if (!currentUser) throw new Error('No user logged in');
      const userId = currentUser.id || currentUser.uid;
      if (!userId) throw new Error('Unable to determine user id');
      const token = getStoredAuthToken();
      const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('updateUserProfile failed:', res.status, errText);
        throw new Error(`Failed to update profile: ${res.status} ${errText}`);
      }
      const response = await res.json();
      const updated = normalizeUserProfile(response?.user || response?.data || response);
      setUserProfile(prev => ({ ...prev, ...updated }));
      setCurrentUser(prev => ({ ...prev, ...updated, uid: updated?.id || prev?.uid }));
      return updated;
    } catch (error) {
      throw error;
    }
  };

  // Check if user profile is complete
  const isProfileComplete = () => {
    if (!userProfile) return false;
    
    // Required fields for a complete profile
    const requiredFields = [
      userProfile.displayName,
      userProfile.phone,
      userProfile.address
    ];
    
    return requiredFields.every(field => field && field.trim().length > 0);
  };

  // Vendor onboarding
  const completeVendorOnboarding = async (vendorData) => {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      const vendorProfile = {
        nin: vendorData.nin,
        businessName: vendorData.businessName,
        businessAddress: vendorData.businessAddress,
        structuredAddress: vendorData.structuredAddress,
        lat: vendorData.structuredAddress?.lat || null,
        lng: vendorData.structuredAddress?.lng || null,
        businessPhone: vendorData.businessPhone,
        businessType: vendorData.businessType,
        storeName: vendorData.storeName,
        storeDescription: vendorData.storeDescription,
        storeSlug: vendorData.storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
        verificationStatus: 'pending',
        onboardedAt: new Date()
      };

      // Update user profile to include vendor status
      const updates = {
        isVendor: true,
        vendorProfile: vendorProfile,
        updatedAt: new Date()
      };

      await updateUserProfile(updates);

      // Create vendor wallet
      try {
        const uid = currentUser.id || currentUser.uid;
        await apiService.wallet.createWallet(uid, 'vendor');
      } catch (walletError) {
        console.error('Error creating vendor wallet:', walletError);
      }

      // Note: Store creation is now handled by VendorStoreManager component
      // to prevent duplicate store creation

      return vendorProfile;
    } catch (error) {
      console.error('Vendor onboarding error:', error);
      throw error;
    }
  };

  // Load current session/profile on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Get token from localStorage
        const token = getStoredAuthToken();
        if (!token) {
          if (mounted) {
            setCurrentUser(null);
            setUserProfile(null);
            setLoading(false);
          }
          return;
        }
        
        // Try to get user data before unblocking ProtectedRoute
        try {
          const res = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!mounted) return;
          if (res.ok) {
            const data = await res.json();
            const userData = normalizeUserProfile(data?.data?.user || data?.data || data?.user || data?.session || data || null);
            setCurrentUser(userData);
            setUserProfile(userData);
          } else {
            console.log('Auth/me endpoint not available, user will need to login');
          }
        } catch (fetchError) {
          if (mounted) {
            console.log('Network error during auth check, continuing without auth');
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading auth session:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Add OTP-based login method
  const signInWithOTP = async (email, verifiedAt) => {
    try {
      // Delegate OTP verification/login to backend
      const res = await fetch('/api/auth/otp-login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, verifiedAt })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`OTP login failed: ${res.status} ${txt}`);
      }
      const data = await res.json();
      persistAuthTokens(data);
      setUserProfile(data?.profile || data?.user || null);
      setCurrentUser(data?.user || null);
      return { success: true, user: data?.user || data?.profile, loginMethod: 'otp' };
    } catch (error) {
      console.error('OTP login error:', error);
      throw error;
    }
  };

  const value = useMemo(() => ({
    currentUser,
    userProfile,
    signup,
    signin,
    signInWithGoogle,
    handleGoogleCallback,
    signInWithOTP,
    logout,
    updateUserProfile,
    completeVendorOnboarding,
    isProfileComplete,
    loading,
    showEscrowEducation,
    setShowEscrowEducation,
    newUserType,
    refreshUser
  }), [currentUser, userProfile, loading, showEscrowEducation, newUserType]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
