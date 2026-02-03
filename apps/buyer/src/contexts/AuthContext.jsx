import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
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

  const getActionCodeSettings = () => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    return {
      url: `${window.location.origin}/login`,
      handleCodeInApp: false
    };
  };

  const triggerVerificationEmail = async (targetUser = auth.currentUser) => {
    if (!targetUser) {
      throw new Error('No authenticated user to verify.');
    }
    await sendEmailVerification(targetUser, getActionCodeSettings());
    setLastVerificationEmailSentAt(new Date());
  };

  const sendVerificationEmail = async () => {
    await triggerVerificationEmail();
  };

  const refreshUser = async () => {
    if (!auth.currentUser) return null;
    await reload(auth.currentUser);
    setCurrentUser(auth.currentUser);
    return auth.currentUser;
  };

  // Sign up function
  const signup = async (email, password, userData) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      await updateProfile(user, {
        displayName: userData.displayName
      });

      // Create user profile in Firestore - All users start as buyers
      const userProfileData = {
        uid: user.uid,
        email: user.email,
        displayName: userData.displayName,
        phone: userData.phone || '',
        address: userData.address || '',
        createdAt: new Date(),
        role: userData.role || 'buyer', // Allow admin to set role during registration
        isVendor: false, // Can become vendor through onboarding
        isLogisticsPartner: false, // Can become logistics through onboarding
        isAdmin: userData.role === 'admin', // Admin flag
        vendorProfile: null, // Will be populated after vendor onboarding
        logisticsProfile: null, // Will be populated after logistics onboarding
        suspended: false // User suspension status
      };

      await setDoc(doc(db, 'users', user.uid), userProfileData);
      setUserProfile(userProfileData);
      try {
        await triggerVerificationEmail(user);
      } catch (verificationError) {
        console.error('Error sending verification email:', verificationError);
      }
      
      // Create wallet for new user
      try {
        await firebaseService.wallet.createWallet(user.uid, userData.userType || 'buyer');
      } catch (walletError) {
        console.error('Error creating wallet:', walletError);
        // Don't fail registration if wallet creation fails
      }
      
      // Show wallet education for new users
      setNewUserType(userData.userType || 'buyer');
      setShowEscrowEducation(true);
      
      return user;
    } catch (error) {
      throw error;
    }
  };

  const resendVerificationEmailWithPassword = async (email, password) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      if (user.emailVerified) {
        await signOut(auth);
        return { alreadyVerified: true };
      }
      await triggerVerificationEmail(user);
      await signOut(auth);
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

  // Sign in function with improved error handling
  const signin = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Signing in user:', email);
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ AuthContext: Sign in successful, user:', user.uid);

      if (!user.emailVerified) {
        console.warn('⚠️ AuthContext: User email not verified, blocking sign-in');
        try {
          await triggerVerificationEmail(user);
        } catch (verificationError) {
          console.error('Error auto-sending verification email on signin:', verificationError);
        }
        await signOut(auth);
        throw createUnverifiedEmailError(email);
      }
      
      // Fetch user profile to check role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('👤 AuthContext: User profile:', { 
          role: userData.role, 
          email: userData.email,
          displayName: userData.displayName 
        });
        
        // If user has an unrecognized role, default to 'buyer'
        if (userData.role && !['buyer', 'vendor', 'logistics', 'admin'].includes(userData.role)) {
          console.warn('⚠️ AuthContext: Unknown role detected:', userData.role, '- defaulting to buyer');
        }
      } else {
        console.warn('⚠️ AuthContext: User profile not found in Firestore');
      }
      
      return user;
    } catch (error) {
      console.error('❌ AuthContext: Sign in failed:', error);
      console.error('❌ AuthContext: Error code:', error.code);
      console.error('❌ AuthContext: Error message:', error.message);
      throw error;
    }
  };

  // Google Sign-In function with improved error handling, timeout, and redirect fallback
  const signInWithGoogle = async (userType = 'buyer') => {
    try {
      console.log('🔐 AuthContext: Starting Google Sign-In as:', userType);
      
      // Validate userType
      const validUserTypes = ['buyer', 'vendor', 'logistics', 'existing'];
      const normalizedUserType = validUserTypes.includes(userType) ? userType : 'buyer';
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'consent' // Force consent screen for better reliability
      });
      
      // Store userType for redirect flow with timestamp
      if (normalizedUserType) {
        sessionStorage.setItem('google_signin_usertype', normalizedUserType);
        sessionStorage.setItem('google_signin_timestamp', Date.now().toString());
      }
      
      // Improved mobile detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
      
      if (isMobile || isTablet) {
        // Use redirect flow for mobile
        console.log('📱 Mobile/Tablet detected, using redirect flow');
        await signInWithRedirect(auth, provider);
        return null; // Will complete after redirect
      }
      
      // Use popup for desktop with timeout
      let result;
      try {
        console.log('💻 Desktop detected, using popup flow');
        
        // Create a timeout promise to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT')), 60000); // 60 second timeout
        });
        
        // Race between sign-in and timeout
        result = await Promise.race([
          signInWithPopup(auth, provider),
          timeoutPromise
        ]);
      } catch (popupError) {
        console.log('⚠️ Popup error:', popupError.message || popupError.code);
        
        // If timeout, suggest manual retry
        if (popupError.message === 'TIMEOUT') {
          throw new Error('Sign-in timed out. Please try again or allow popups for this site.');
        }
        
        // If popup fails, try redirect as fallback
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/cancelled-popup-request') {
          console.log('⚠️ Popup blocked/failed, falling back to redirect');
          await signInWithRedirect(auth, provider);
          return null; // Will complete after redirect
        }
        throw popupError;
      }
      
      // Clear stored userType on successful popup sign-in
      sessionStorage.removeItem('google_signin_usertype');
      sessionStorage.removeItem('google_signin_timestamp');
      
      const user = result.user;
      console.log('✅ AuthContext: Google Sign-In successful, user:', user.uid);

      if (!user.emailVerified) {
        console.warn('⚠️ AuthContext: Google user email not verified, blocking sign-in');
        try {
          await triggerVerificationEmail(user);
        } catch (verificationError) {
          console.error('Error auto-sending verification email for Google user:', verificationError);
        }
        await signOut(auth);
        throw createUnverifiedEmailError(user.email);
      }
      
      // Validate user data
      if (!user.email) {
        throw new Error('Unable to retrieve email from Google account. Please try again.');
      }
      
      // Check if user already exists in Firestore with retry
      let userDoc;
      let retries = 3;
      while (retries > 0) {
        try {
          userDoc = await getDoc(doc(db, 'users', user.uid));
          break;
        } catch (docError) {
          retries--;
          if (retries === 0) throw new Error('Unable to check user profile. Please try again.');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }
      }
      
      if (!userDoc.exists()) {
        // New user - create profile
        console.log('👤 AuthContext: New Google user, creating profile');
        const userProfileData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0],
          name: user.displayName || user.email?.split('@')[0],
          photoURL: user.photoURL || '',
          phone: user.phoneNumber || '',
          address: '',
          createdAt: new Date(),
          role: normalizedUserType === 'existing' ? 'buyer' : normalizedUserType,
          isVendor: normalizedUserType === 'vendor',
          isLogisticsPartner: normalizedUserType === 'logistics',
          isAdmin: false,
          vendorProfile: null,
          logisticsProfile: null,
          suspended: false,
          signInMethod: 'google'
        };

        // Save profile with retry
        retries = 3;
        while (retries > 0) {
          try {
        await setDoc(doc(db, 'users', user.uid), userProfileData);
        setUserProfile(userProfileData);
            break;
          } catch (saveError) {
            retries--;
            if (retries === 0) {
              console.error('Failed to save user profile after retries:', saveError);
              throw new Error('Unable to complete sign-up. Please try again.');
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Create wallet for new user with error handling
        try {
          await firebaseService.wallet.createWallet(user.uid, normalizedUserType || 'buyer');
          console.log('✅ Wallet created successfully');
        } catch (walletError) {
          console.error('⚠️ Error creating wallet (non-critical):', walletError);
          // Don't fail sign-up if wallet creation fails
        }
        
        // Show wallet education for new users
        setNewUserType(normalizedUserType === 'existing' ? 'buyer' : normalizedUserType);
        setShowEscrowEducation(true);
      } else {
        // Existing user - just load profile
        console.log('👤 AuthContext: Existing Google user, loading profile');
        const userData = userDoc.data();
        setUserProfile(userData);
      }
      
      return user;
    } catch (error) {
      console.error('❌ AuthContext: Google Sign-In failed:', error);
      
      // Clear stored data on error
      sessionStorage.removeItem('google_signin_usertype');
      sessionStorage.removeItem('google_signin_timestamp');
      
      // Handle account exists with different credential
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        throw new Error(`An account already exists with ${email}. Please sign in with your email and password, or use the same Google account you used to sign up.`);
      }
      
      // Don't retry on user cancellation or popup blocked
      if (error.code === 'auth/popup-closed-by-user' || 
          error.code === 'auth/cancelled-popup-request') {
        console.log('ℹ️ User cancelled Google Sign-In');
        return null;
      }
      
      // Provide more specific error messages
      if (error.message.includes('timeout')) {
        throw new Error('Sign-in timed out. Please check your internet connection and try again.');
      }
      
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

      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      if (!currentUser) throw new Error('No user logged in');
      
      await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
      setUserProfile(prev => ({ ...prev, ...updates }));
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
        await firebaseService.wallet.createWallet(currentUser.uid, 'vendor');
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

  // Listen for auth state changes - Simplified for faster admin access
  useEffect(() => {
    // Check for redirect result first (for mobile Google Sign-In)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          console.log('✅ AuthContext: Redirect result received');
          const user = result.user;
          
          // Get stored userType from redirect with timestamp check
          const storedUserType = sessionStorage.getItem('google_signin_usertype') || 'buyer';
          const storedTimestamp = sessionStorage.getItem('google_signin_timestamp');
          
          // Clear stored data
          sessionStorage.removeItem('google_signin_usertype');
          sessionStorage.removeItem('google_signin_timestamp');
          
          // Validate timestamp (discard if older than 10 minutes)
          if (storedTimestamp && Date.now() - parseInt(storedTimestamp) > 600000) {
            console.warn('⚠️ Redirect result too old, ignoring');
            return;
          }
          
          // Normalize userType
          const validUserTypes = ['buyer', 'vendor', 'logistics', 'existing'];
          const normalizedUserType = validUserTypes.includes(storedUserType) ? storedUserType : 'buyer';
          
          // Check if user profile exists with retry
          let userDoc;
          let retries = 3;
          while (retries > 0) {
            try {
              userDoc = await getDoc(doc(db, 'users', user.uid));
              break;
            } catch (docError) {
              console.error('Error fetching user doc, retrying...', docError);
              retries--;
              if (retries === 0) {
                console.error('Failed to fetch user doc after retries');
                return;
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (!userDoc || !userDoc.exists()) {
            // New user from redirect - create profile
            console.log('👤 New user from redirect, creating profile');
            const userProfileData = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0],
              name: user.displayName || user.email?.split('@')[0],
              photoURL: user.photoURL || '',
              phone: user.phoneNumber || '',
              address: '',
              createdAt: new Date(),
              role: normalizedUserType === 'existing' ? 'buyer' : normalizedUserType,
              isVendor: normalizedUserType === 'vendor',
              isLogisticsPartner: normalizedUserType === 'logistics',
              isAdmin: false,
              vendorProfile: null,
              logisticsProfile: null,
              suspended: false,
              signInMethod: 'google'
            };

            // Save with retry
            retries = 3;
            while (retries > 0) {
              try {
            await setDoc(doc(db, 'users', user.uid), userProfileData);
            setUserProfile(userProfileData);
                console.log('✅ User profile created successfully');
                break;
              } catch (saveError) {
                retries--;
                if (retries === 0) {
                  console.error('Failed to save user profile:', saveError);
                  return;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            // Create wallet with correct userType
            try {
              await firebaseService.wallet.createWallet(user.uid, normalizedUserType === 'existing' ? 'buyer' : normalizedUserType);
              console.log('✅ Wallet created successfully');
            } catch (walletError) {
              console.error('⚠️ Error creating wallet (non-critical):', walletError);
            }
            
            setNewUserType(normalizedUserType === 'existing' ? 'buyer' : normalizedUserType);
            setShowEscrowEducation(true);
          } else {
            // Existing user from redirect - load profile
            console.log('👤 Existing user from redirect, loading profile');
            const userData = userDoc.data();
            setUserProfile(userData);
          }
        }
      })
      .catch((error) => {
        console.error('❌ AuthContext: Redirect result error:', error);
        // Clear any stale session data on error
        sessionStorage.removeItem('google_signin_usertype');
        sessionStorage.removeItem('google_signin_timestamp');
      });
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      // Set loading to false immediately for faster admin access
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Add OTP-based login method
  const signInWithOTP = async (email, verifiedAt) => {
    try {
      // This would typically verify the OTP with a Cloud Function
      // For now, we'll create a session based on the verified timestamp
      const userDoc = await getDoc(doc(db, 'users', email));
      
      if (!userDoc.exists()) {
        throw new Error('No account found with this email address');
      }

      const userData = userDoc.data();
      
      // Update last login and OTP verification
      await updateDoc(doc(db, 'users', email), {
        lastLoginAt: new Date(),
        lastOTPLoginAt: verifiedAt,
        loginMethod: 'otp'
      });

      // Set user profile (authentication would be handled by a secure token system)
      setUserProfile(userData);
      
      return {
        success: true,
        user: userData,
        loginMethod: 'otp'
      };
    } catch (error) {
      console.error('OTP login error:', error);
      throw error;
    }
  };

  // Enhanced email verification with OTP
  const sendVerificationEmailWithOTP = async (targetUser = auth.currentUser) => {
    if (!targetUser) {
      throw new Error('No authenticated user to verify.');
    }

    try {
      // Send OTP instead of traditional email verification
      const result = await emailOTPService.sendOTP(
        targetUser.email,
        'verification',
        {
          subject: 'Verify Your Ojawa E-commerce Account',
          customMessage: 'Complete your registration with this verification code.'
        }
      );

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
