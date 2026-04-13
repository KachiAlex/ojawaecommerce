import { createContext, useContext, useEffect, useState } from 'react';
import firebaseService from '../services/firebaseService';
import { storeService } from '../services/trackingService';
import emailOTPService from '../utils/emailOTPService';

const verificationBypassed = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BYPASS_EMAIL_VERIFICATION === 'true';

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
  const [lastVerificationEmailSentAt, setLastVerificationEmailSentAt] = useState(null);

  const getActionCodeSettings = () => ({ url: `${typeof window !== 'undefined' ? window.location.origin : ''}/login`, handleCodeInApp: false });

  const triggerVerificationEmail = async (email) => {
    if (!email) throw new Error('No email provided for verification.');
    try {
      await emailOTPService.sendOTP(email, 'verification', {
        subject: 'Verify Your Ojawa E-commerce Account',
        customMessage: 'Complete your registration with this verification code.'
      });
      setLastVerificationEmailSentAt(new Date());
    } catch (err) {
      console.error('Error sending verification email via OTP service:', err);
      throw err;
    }
  };

  const sendVerificationEmail = async (email) => {
    return triggerVerificationEmail(email);
  };

  const refreshUser = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) return null;
      
      try {
        const res = await fetch('https://ojawaecommerce.onrender.com/api/auth/me', {
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
        setCurrentUser(data?.data || data?.user || data || null);
        setUserProfile(data?.data?.profile || data?.profile || data?.user || null);
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
      const res = await firebaseService.auth.signup(email, password, userData || {});
      const userId = res?.id || res?.uid || res?.user?.id || res?.user?.uid;
      if (userId) {
        try {
          await firebaseService.wallet.createWallet(userId, userData?.userType || 'buyer');
        } catch (walletError) {
          console.error('Error creating wallet:', walletError);
        }
      }
      setNewUserType(userData?.userType || 'buyer');
      setShowEscrowEducation(true);
      try {
        if (email) await triggerVerificationEmail(email);
      } catch (_) {}
      return res;
    } catch (error) {
      throw error;
    }
  };

  const resendVerificationEmailWithPassword = async (email, password) => {
    try {
      const res = await firebaseService.auth.signin(email, password);
      if (res?.emailVerified) {
        await firebaseService.auth.signout();
        return { alreadyVerified: true };
      }
      await triggerVerificationEmail(email);
      await firebaseService.auth.signout();
      return { success: true };
    } catch (error) {
      console.error('Error resending verification email with password:', error);
      throw error;
    }
  };

  const createUnverifiedEmailError = (email) => {
    const error = new Error('Email address is not verified.');
    error.code = 'auth/email-not-verified';
    error.email = email;
    return error;
  };

  // Sign in function (REST-backed)
  const signin = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Signing in user via REST:', email);
      const res = await firebaseService.auth.signin(email, password);
      const user = res?.user || res;
      if (!user) throw new Error('Invalid signin response from server');

      if (res?.emailVerified === false) {
        try {
          await triggerVerificationEmail(email);
        } catch (verificationError) {
          console.error('Error auto-sending verification email on signin:', verificationError);
        }
        await firebaseService.auth.signout();
        throw createUnverifiedEmailError(email);
      }

      try {
        const profile = res?.profile || (user?.id || user?.uid ? await firebaseService.auth.getProfile(user.id || user.uid) : null);
        if (profile) {
          setUserProfile(profile);
          // Ensure userType is available in user object
          if (profile.userType && !user.userType) {
            user.userType = profile.userType;
          }
        }
      } catch (e) {
        console.warn('Unable to load user profile after signin:', e);
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

      await firebaseService.auth.signout();
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
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const updated = await res.json();
      setUserProfile(prev => ({ ...prev, ...updated }));
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
        await firebaseService.wallet.createWallet(uid, 'vendor');
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
        const token = localStorage.getItem('authToken');
        if (!token) {
          if (mounted) {
            setCurrentUser(null);
            setUserProfile(null);
            setLoading(false);
          }
          return;
        }
        
        // Don't block page loading - set loading to false immediately
        if (mounted) {
          setLoading(false);
        }
        
        // Try to get user data in background
        try {
          const res = await fetch('https://ojawaecommerce.onrender.com/api/auth/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!mounted) return;
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data?.user || data?.session || data || null);
            setUserProfile(data?.profile || data?.user?.profile || data?.profile || data?.user || null);
          } else {
            // If endpoint doesn't work, don't set mock user - just leave as null
            // This allows the register/login pages to work normally
            console.log('Auth/me endpoint not available, user will need to login');
          }
        } catch (fetchError) {
          // Handle network errors gracefully - don't block the app
          if (mounted) {
            console.log('Network error during auth check, continuing without auth');
          }
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
      setUserProfile(data?.profile || data?.user || null);
      setCurrentUser(data?.user || null);
      return { success: true, user: data?.user || data?.profile, loginMethod: 'otp' };
    } catch (error) {
      console.error('OTP login error:', error);
      throw error;
    }
  };

  // Enhanced email verification with OTP
  const sendVerificationEmailWithOTP = async (targetUser) => {
    const email = (targetUser && (targetUser.email || targetUser)) || userProfile?.email || currentUser?.email;
    if (!email) throw new Error('No email available to send verification to.');
    try {
      const result = await emailOTPService.sendOTP(email, 'verification', {
        subject: 'Verify Your Ojawa E-commerce Account',
        customMessage: 'Complete your registration with this verification code.'
      });
      setLastVerificationEmailSentAt(new Date());
      return result;
    } catch (error) {
      console.error('OTP verification email error:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userProfile,
    signup,
    signin,
    signInWithGoogle,
    signInWithOTP,
    logout,
    updateUserProfile,
    completeVendorOnboarding,
    isProfileComplete,
    loading,
    showEscrowEducation,
    setShowEscrowEducation,
    newUserType,
    sendVerificationEmail: sendVerificationEmailWithOTP,
    refreshUser,
    lastVerificationEmailSentAt,
    resendVerificationEmailWithPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
